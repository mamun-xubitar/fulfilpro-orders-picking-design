import prisma from '@/lib/prisma.server';
import { shopifyGraphQL } from '@/lib/shopify-graphql.server';
import { getPrimaryLocationId, publishToAllChannels, setVariantInventory } from '@/lib/shopify-product-publish.server';

type UserError = { field?: string[] | null; message: string };

/** Direct, single-property edits against one store's already-published product — each function is
 * one Admin GraphQL mutation (plus the minimum follow-up it needs), unlike `publishProductToStore`
 * which resends a whole aspect through `productSet`. Every function resolves the store's token the
 * same way `updateStoreVariantPrices` does and throws on `userErrors`. */
async function storeCredentials(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { storeDomain: true, accessToken: true } });
  if (!store?.accessToken) throw new Error('Store is not connected');
  return { domain: store.storeDomain, token: store.accessToken };
}

function throwOnUserErrors(errors: UserError[] | null | undefined) {
  if (errors && errors.length > 0) throw new Error(errors.map((e) => e.message).join('; '));
}

/** `fileUpdate` needs `write_files`, which stores connected before it was added to the app's scopes
 * don't have — Shopify then answers with a bare "Access denied" error. Turned into an actionable one. */
async function withFilesScopeHint<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/access denied/i.test(message) && /file/i.test(message)) {
      throw new Error('Re-authorize this store (Stores page) to grant file access, then retry.');
    }
    throw error;
  }
}

export type StoreProductFieldUpdate = {
  title?: string;
  descriptionHtml?: string;
  vendor?: string;
  /** Shopify taxonomy category gid; `null` clears it. */
  category?: string | null;
  status?: 'ACTIVE' | 'DRAFT' | 'UNLISTED';
};

const PRODUCT_UPDATE_MUTATION = `
  mutation UpdateStoreProductField($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id title vendor status }
      userErrors { field message }
    }
  }
`;

/** Updates only the fields present on `fields`. Moving to ACTIVE/UNLISTED also publishes to every
 * sales channel, mirroring the full publish flow — otherwise the product is "active" but nowhere. */
export async function updateStoreProductField(args: { storeId: string; productGid: string; fields: StoreProductFieldUpdate }) {
  const { domain, token } = await storeCredentials(args.storeId);
  const { fields } = args;
  const product: Record<string, unknown> = { id: args.productGid };
  if (fields.title !== undefined) product.title = fields.title;
  if (fields.descriptionHtml !== undefined) product.descriptionHtml = fields.descriptionHtml;
  if (fields.vendor !== undefined) product.vendor = fields.vendor;
  if (fields.category !== undefined) product.category = fields.category;
  if (fields.status !== undefined) product.status = fields.status;

  const data = await shopifyGraphQL<{ productUpdate: { userErrors: UserError[] } }>(domain, token, PRODUCT_UPDATE_MUTATION, { product });
  throwOnUserErrors(data.productUpdate.userErrors);

  if (fields.status === 'ACTIVE' || fields.status === 'UNLISTED') {
    await publishToAllChannels(domain, token, args.productGid);
  }
}

const MEDIA_STATUS_QUERY = `
  query StoreMediaStatus($id: ID!) {
    node(id: $id) {
      ... on MediaImage { id status image { url } }
    }
  }
`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shopify processes an image asynchronously after `productUpdate(media:)` / `fileUpdate`. Polls the
 * MediaImage until it is READY (returning its new CDN url) so the listing the caller re-fetches — and
 * caches — already shows the new picture, instead of a null / old image. Throws if Shopify reports
 * FAILED (typically because it couldn't fetch the source URL), or gives up after ~20s. */
async function waitForMediaReady(domain: string, token: string, mediaId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 20; attempt++) {
    await sleep(attempt === 0 ? 600 : 1000);
    const data = await shopifyGraphQL<{ node: { status: string; image: { url: string } | null } | null }>(domain, token, MEDIA_STATUS_QUERY, { id: mediaId });
    const node = data.node;
    if (!node) throw new Error('Shopify could not find the image after uploading it');
    if (node.status === 'FAILED') throw new Error("Shopify couldn't process the image — check that it is a valid picture and the app's public URL is reachable");
    if (node.status === 'READY' && node.image?.url) return node.image.url;
  }
  throw new Error('Shopify is still processing the image — refresh in a moment to see it');
}

const ADD_MEDIA_MUTATION = `
  mutation AppendStoreProductMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) {
      product { id media(first: 1, reverse: true) { nodes { id } } }
      userErrors { field message }
    }
  }
`;

/** Appends one image (last) from a public URL and waits for Shopify to finish processing it.
 * Returns the new media id and its processed url. */
export async function addStoreProductMedia(args: {
  storeId: string;
  productGid: string;
  url: string;
  altText: string | null;
}): Promise<{ mediaId: string; url: string | null }> {
  const { domain, token } = await storeCredentials(args.storeId);
  const data = await shopifyGraphQL<{ productUpdate: { product: { media: { nodes: { id: string }[] } } | null; userErrors: UserError[] } }>(
    domain,
    token,
    ADD_MEDIA_MUTATION,
    {
      product: { id: args.productGid },
      media: [{ originalSource: args.url, alt: args.altText ?? undefined, mediaContentType: 'IMAGE' }],
    }
  );
  throwOnUserErrors(data.productUpdate.userErrors);
  const mediaId = data.productUpdate.product?.media.nodes[0]?.id;
  if (!mediaId) throw new Error('Shopify did not return the new image');

  return { mediaId, url: await waitForMediaReady(domain, token, mediaId) };
}

const FILE_UPDATE_MUTATION = `
  mutation UpdateStoreFile($files: [FileUpdateInput!]!) {
    fileUpdate(files: $files) {
      files { id fileStatus }
      userErrors { field message code }
    }
  }
`;

type FileUpdateResult = { fileUpdate: { files: { id: string; fileStatus: string }[] | null; userErrors: UserError[] } };

/** Swaps an existing image's content for a new source URL, keeping its media id — so its position
 * and every variant that points at it survive — and waits until Shopify has finished processing the
 * new picture. Returns its url. Requires the `write_files` scope. */
export async function replaceStoreMedia(args: { storeId: string; mediaId: string; url: string }): Promise<string | null> {
  const { domain, token } = await storeCredentials(args.storeId);
  await withFilesScopeHint(async () => {
    const data = await shopifyGraphQL<FileUpdateResult>(domain, token, FILE_UPDATE_MUTATION, {
      files: [{ id: args.mediaId, originalSource: args.url }],
    });
    throwOnUserErrors(data.fileUpdate.userErrors);
  });
  return waitForMediaReady(domain, token, args.mediaId);
}

/** Detaches images from the product (the file itself stays in the store's Files library). This is
 * `fileUpdate.referencesToRemove`, the supported replacement for the deprecated `productDeleteMedia`.
 * Requires the `write_files` scope. */
export async function removeStoreMedia(args: { storeId: string; productGid: string; mediaIds: string[] }) {
  if (args.mediaIds.length === 0) return;
  const { domain, token } = await storeCredentials(args.storeId);
  await withFilesScopeHint(async () => {
    const data = await shopifyGraphQL<FileUpdateResult>(domain, token, FILE_UPDATE_MUTATION, {
      files: args.mediaIds.map((id) => ({ id, referencesToRemove: [args.productGid] })),
    });
    throwOnUserErrors(data.fileUpdate.userErrors);
  });
}

const REORDER_MEDIA_MUTATION = `
  mutation ReorderStoreProductMedia($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job { id done }
      mediaUserErrors { field message }
    }
  }
`;

const JOB_STATUS_QUERY = `
  query StoreJobStatus($id: ID!) {
    job(id: $id) { id done }
  }
`;

/** Moves one image to a 1-based `position` in the product's gallery. Shopify reorders
 * asynchronously (a `Job`), so this polls until it is done — otherwise the listing the caller
 * re-fetches straight afterwards would still show the old order. Needs `write_products`. */
export async function reorderStoreMedia(args: { storeId: string; productGid: string; mediaId: string; position: number }) {
  const { domain, token } = await storeCredentials(args.storeId);
  const data = await shopifyGraphQL<{ productReorderMedia: { job: { id: string; done: boolean } | null; mediaUserErrors: UserError[] } }>(domain, token, REORDER_MEDIA_MUTATION, {
    id: args.productGid,
    moves: [{ id: args.mediaId, newPosition: String(args.position - 1) }],
  });
  throwOnUserErrors(data.productReorderMedia.mediaUserErrors);
  const job = data.productReorderMedia.job;
  if (!job || job.done) return;

  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(800);
    const status = await shopifyGraphQL<{ job: { done: boolean } | null }>(domain, token, JOB_STATUS_QUERY, { id: job.id });
    if (!status.job || status.job.done) return;
  }
  throw new Error('Shopify is still reordering the images — refresh in a moment to see the new order');
}

export type StoreVariantUpdate = {
  variantGid: string;
  sku?: string;
  barcode?: string;
  price?: number;
  /** MediaImage gid to link; `null` unlinks the variant's current image. */
  mediaId?: string | null;
  /** Needed (with `available`) to write stock. */
  inventoryItemGid?: string | null;
  available?: number;
};

const VARIANTS_BULK_UPDATE_MUTATION = `
  mutation UpdateStoreVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id }
      userErrors { field message }
    }
  }
`;

const VARIANT_DETACH_MEDIA_MUTATION = `
  mutation DetachStoreVariantMedia($productId: ID!, $variantMedia: [ProductVariantDetachMediaInput!]!) {
    productVariantDetachMedia(productId: $productId, variantMedia: $variantMedia) {
      productVariants { id }
      userErrors { field message }
    }
  }
`;

/** Updates several variants at once — each carries only the properties that changed. SKU, barcode,
 * price and image go through one `productVariantsBulkUpdate`; an image being cleared goes through
 * `productVariantDetachMedia`; Available goes through the same location-aware inventory write the
 * publish flow uses. */
export async function updateStoreVariants(args: {
  storeId: string;
  productGid: string;
  variants: StoreVariantUpdate[];
  /** Current media id per variant gid — needed to detach an image that's being cleared. */
  currentMediaByVariant: Record<string, string | null>;
}) {
  const { domain, token } = await storeCredentials(args.storeId);

  const bulk = args.variants
    .map((v) => {
      const input: Record<string, unknown> = { id: v.variantGid };
      if (v.price !== undefined) input.price = v.price.toFixed(2);
      if (v.barcode !== undefined) input.barcode = v.barcode;
      if (v.sku !== undefined) input.inventoryItem = { sku: v.sku };
      if (v.mediaId) input.mediaId = v.mediaId;
      return input;
    })
    .filter((input) => Object.keys(input).length > 1);
  if (bulk.length > 0) {
    const data = await shopifyGraphQL<{ productVariantsBulkUpdate: { userErrors: UserError[] } }>(domain, token, VARIANTS_BULK_UPDATE_MUTATION, {
      productId: args.productGid,
      variants: bulk,
    });
    throwOnUserErrors(data.productVariantsBulkUpdate.userErrors);
  }

  const detach = args.variants
    .filter((v) => v.mediaId === null && args.currentMediaByVariant[v.variantGid])
    .map((v) => ({ variantId: v.variantGid, mediaIds: [args.currentMediaByVariant[v.variantGid]!] }));
  if (detach.length > 0) {
    const data = await shopifyGraphQL<{ productVariantDetachMedia: { userErrors: UserError[] } }>(domain, token, VARIANT_DETACH_MEDIA_MUTATION, {
      productId: args.productGid,
      variantMedia: detach,
    });
    throwOnUserErrors(data.productVariantDetachMedia.userErrors);
  }

  await writeStock(domain, token, args.variants);
}

async function writeStock(domain: string, token: string, variants: { inventoryItemGid?: string | null; available?: number }[]) {
  const quantities = variants
    .filter((v): v is { inventoryItemGid: string; available: number } => Boolean(v.inventoryItemGid) && v.available !== undefined)
    .map((v) => ({ inventoryItemId: v.inventoryItemGid, quantity: Math.max(0, Math.round(v.available)) }));
  if (quantities.length === 0) return;
  const locationId = await getPrimaryLocationId(domain, token);
  if (!locationId) throw new Error("No active fulfilment location on this store — stock can't be updated");
  await setVariantInventory(domain, token, locationId, quantities);
}

const VARIANTS_BULK_CREATE_MUTATION = `
  mutation CreateStoreVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants { id sku price inventoryItem { id } }
      userErrors { field message }
    }
  }
`;

/** Creates one variant on the store's existing product. The option values must use the product's
 * existing option names (see `variantOptionValues`). Stock is written afterwards with the same
 * definitive inventory call the publish flow uses, since create alone doesn't reliably stock a
 * location. Returns the new variant + inventory item gids so the caller can persist the mapping. */
export async function createStoreVariant(args: {
  storeId: string;
  productGid: string;
  optionValues: { optionName: string; name: string }[];
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  available: number;
  mediaId: string | null;
}): Promise<{ variantGid: string; inventoryItemGid: string }> {
  const { domain, token } = await storeCredentials(args.storeId);
  const variant: Record<string, unknown> = {
    optionValues: args.optionValues,
    price: args.price.toFixed(2),
    barcode: args.barcode ?? '',
    inventoryItem: { sku: args.sku ?? '', tracked: true, cost: Math.max(0, args.cost).toFixed(2) },
  };
  if (args.mediaId) variant.mediaId = args.mediaId;

  const data = await shopifyGraphQL<{
    productVariantsBulkCreate: { productVariants: { id: string; inventoryItem: { id: string } }[] | null; userErrors: UserError[] };
  }>(domain, token, VARIANTS_BULK_CREATE_MUTATION, { productId: args.productGid, variants: [variant] });
  throwOnUserErrors(data.productVariantsBulkCreate.userErrors);

  const created = data.productVariantsBulkCreate.productVariants?.[0];
  if (!created) throw new Error('Shopify did not return the new variant');
  await writeStock(domain, token, [{ inventoryItemGid: created.inventoryItem.id, available: args.available }]);
  return { variantGid: created.id, inventoryItemGid: created.inventoryItem.id };
}

const VARIANTS_BULK_DELETE_MUTATION = `
  mutation DeleteStoreVariants($productId: ID!, $variantsIds: [ID!]!) {
    productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
      product { id }
      userErrors { field message }
    }
  }
`;

export async function deleteStoreVariants(args: { storeId: string; productGid: string; variantGids: string[] }) {
  if (args.variantGids.length === 0) return;
  const { domain, token } = await storeCredentials(args.storeId);
  const data = await shopifyGraphQL<{ productVariantsBulkDelete: { userErrors: UserError[] } }>(domain, token, VARIANTS_BULK_DELETE_MUTATION, {
    productId: args.productGid,
    variantsIds: args.variantGids,
  });
  throwOnUserErrors(data.productVariantsBulkDelete.userErrors);
}
