import prisma from '@/lib/prisma.server';
import { shopifyGraphQL, getLegacyId, preferredStoreUrl } from '@/lib/shopify-graphql.server';
import { updateStoreVariantPrices } from '@/lib/shopify-store-listings.server';
import { variantOptionKey } from '@/lib/inventory/variant-option-key';
import { resolveOptionAxes, productOptionsInput, variantOptionValues, optionMatchKeys } from '@/lib/inventory/variant-options';

/** Which parts of the hub product a publish/bulk-update call should push. 'variants' covers
 * SKU, barcode, price, option values and inventory together — Shopify has no finer split, since
 * inventoryQuantities and price both live on the same ProductVariantSetInput row. */
export type PublishAspect = 'images' | 'details' | 'pricing' | 'variants';

export type PublishImage = { url: string; altText: string | null };

export type PublishVariant = {
  /** SupplierProductVariant.id — carried through so the caller can persist the mapping. */
  hubVariantId: string;
  /** Raw, trimmed hub value — '' when this axis is blank. Never the 'Default' sentinel; the
   * Colour/Size-vs-Title option shape is derived from these at publish time via
   * lib/inventory/variant-options.ts, so a colour genuinely named "Default" isn't mistaken for a
   * blank one. */
  colour: string;
  size: string;
  sku: string | null;
  barcode: string | null;
  /** Ex-tax selling price to push for this store. Falls back to SupplierProductVariant.sellPrice
   * when the admin didn't override it in the modal. */
  price: number;
  buyPrice: number;
  /** stockOnHand - allocated, clamped at 0 — what "available" gets set to. */
  availableQuantity: number;
  /** Shopify's existing variant/inventory-item ids for this store, when already published. */
  variantGid?: string | null;
  inventoryItemGid?: string | null;
  /** The hub image linked to this variant, when it also survived this store's image selection.
   * Pushed via ProductVariantSetInput.file — Shopify requires the same file also appear in the
   * product-level `files` input, so this is only honored when the `images` aspect is included. */
  imageUrl?: string | null;
};

export type PublishPayload = {
  title: string;
  descriptionHtml: string;
  handle: string;
  vendor: string;
  productType: string;
  categoryGid: string | null;
  /** Manual-collection gids this store's listing should belong to — full replacement, mirroring
   * `images`. `null` = collections aspect not touched (details aspect omitted entirely). */
  collectionIds: string[] | null;
  tags: string[];
  /** Our hub's own three-state vocabulary — matches Shopify's own ProductStatus 1:1 as of API
   * 2025-10 (this app is on 2026-04), sent through verbatim. */
  status: 'ACTIVE' | 'DRAFT' | 'UNLISTED';
  seoTitle?: string | null;
  seoDescription?: string | null;
  images: PublishImage[];
  variants: PublishVariant[];
};

type ShopifyVariantNode = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  selectedOptions: { name: string; value: string }[];
  inventoryItem: { id: string };
};

type ShopifyPublishProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  onlineStoreUrl: string | null;
  onlineStorePreviewUrl: string | null;
  variants: { nodes: ShopifyVariantNode[] };
};

type ProductSetResult = {
  productSet: {
    product: ShopifyPublishProduct | null;
    userErrors: { field: string[] | null; message: string }[];
  };
};

/** Shared between `productSet`'s response and the plain read below it, so a price-only push (which
 * skips `productSet` entirely — see `wantsPricingOnly`) still returns the same shape for the
 * response re-match and the caller's return value. */
const PRODUCT_FIELDS = `
  id
  title
  handle
  status
  onlineStoreUrl
  onlineStorePreviewUrl
  variants(first: 100) {
    nodes {
      id
      title
      sku
      barcode
      price
      selectedOptions { name value }
      inventoryItem { id }
    }
  }
`;

const PRODUCT_SET_MUTATION = `
  mutation PublishProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
    productSet(input: $input, identifier: $identifier, synchronous: true) {
      product { ${PRODUCT_FIELDS} }
      userErrors { field message }
    }
  }
`;

/** Reads the product back without touching anything — used for a pure price-only push, where
 * prices go through `productVariantsBulkUpdate` instead of `productSet` (see `wantsPricingOnly`),
 * so there is otherwise no `productSet` response to build the return value and variant mapping
 * from. */
const PRODUCT_BY_ID_QUERY = `
  query ProductById($id: ID!) {
    node(id: $id) { ... on Product { ${PRODUCT_FIELDS} } }
  }
`;

const PUBLICATIONS_QUERY = `
  query PublicationsWithCatalogTitle {
    publications(first: 20) {
      nodes { id catalog { title } }
    }
  }
`;

const PUBLISHABLE_PUBLISH_MUTATION = `
  mutation PublishProductToChannel($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

const FULFILLMENT_LOCATIONS_QUERY = `
  query FulfillmentLocations {
    locations(first: 20, includeInactive: false) {
      nodes { id fulfillsOnlineOrders }
    }
  }
`;

const INVENTORY_SET_QUANTITIES_MUTATION = `
  mutation SetVariantInventory($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
    inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      userErrors { field message code }
    }
  }
`;

const INVENTORY_ACTIVATE_MUTATION = `
  mutation ActivateVariantInventory($inventoryItemId: ID!, $locationId: ID!, $available: Int!, $idempotencyKey: String!) {
    inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) @idempotent(key: $idempotencyKey) {
      userErrors { field message }
    }
  }
`;

const PRODUCT_MEDIA_QUERY = `
  query ProductMediaReady($id: ID!) {
    node(id: $id) {
      ... on Product {
        media(first: 50) {
          nodes {
            ... on MediaImage {
              id
              status
              mediaErrors { code details message }
              image { url }
            }
          }
        }
      }
    }
  }
`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cached for the process lifetime per store — publications and the fulfillment location don't
 * change between publish calls, and re-fetching them on every save would double the round trips. */
const publicationIdsCache = new Map<string, string[]>();
const locationIdCache = new Map<string, string>();

/** Every sales channel on the store — a product goes live nowhere (and Shopify hands back only a
 * preview URL) unless it's published to at least one, and stores don't reliably have a channel
 * literally titled "Online Store" (dev/preview stores especially), so we publish to all of them. */
async function getAllPublicationIds(storeDomain: string, accessToken: string): Promise<string[]> {
  const cached = publicationIdsCache.get(storeDomain);
  if (cached) return cached;

  const data = await shopifyGraphQL<{ publications: { nodes: { id: string; catalog: { title: string } | null }[] } }>(
    storeDomain,
    accessToken,
    PUBLICATIONS_QUERY
  );
  const ids = data.publications.nodes.map((p) => p.id);
  publicationIdsCache.set(storeDomain, ids);
  return ids;
}

/** Publishes a product to every sales channel on the store — idempotent for channels it is already
 * on. Shared by the full publish flow and the differences modal's single-field status save. */
export async function publishToAllChannels(storeDomain: string, accessToken: string, productGid: string): Promise<void> {
  const publicationIds = await getAllPublicationIds(storeDomain, accessToken);
  if (publicationIds.length === 0) return;
  await shopifyGraphQL(storeDomain, accessToken, PUBLISHABLE_PUBLISH_MUTATION, {
    id: productGid,
    input: publicationIds.map((publicationId) => ({ publicationId })),
  });
}

type MediaReadyNode = {
  status: string;
  mediaErrors: { code: string; details: string | null; message: string }[];
  image: { url: string } | null;
};

/** Shopify processes uploaded media asynchronously — right after productSet returns, a freshly
 * uploaded MediaImage's `image` can still be null. Polls briefly so the listing this call returns
 * (and any immediate re-fetch) already has ready images, instead of the caller seeing 0 images and
 * only picking them up on the next unrelated Sync. Throws with Shopify's own mediaErrors when a
 * media item fails to process (e.g. it couldn't fetch the URL), instead of quietly reporting
 * success with an image that will never appear. */
export async function waitForImagesReady(storeDomain: string, accessToken: string, productGid: string, expectedCount: number): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const data = await shopifyGraphQL<{ node: { media: { nodes: MediaReadyNode[] } } | null }>(
      storeDomain,
      accessToken,
      PRODUCT_MEDIA_QUERY,
      { id: productGid }
    );
    const nodes = data.node?.media.nodes ?? [];
    const failed = nodes.filter((n) => n.status === 'FAILED');
    if (failed.length > 0) {
      const messages = failed.flatMap((n) => n.mediaErrors.map((e) => e.message));
      throw new Error(`Shopify failed to process ${failed.length} image(s): ${messages.join('; ') || 'unknown error'}`);
    }
    const readyCount = nodes.filter((n) => n.status === 'READY' && n.image?.url).length;
    if (readyCount >= expectedCount) return;
    await sleep(1000);
  }
}

/** Prefers a location that actually fulfills online orders (the `fulfills_online_orders:true`
 * search filter this used to run server-side turned out to exclude stores where no location has
 * that flag set — leaving `locationId` null and inventory silently unset); falls back to the
 * first active location of any kind rather than publishing with no stock destination at all. */
export async function getPrimaryLocationId(storeDomain: string, accessToken: string): Promise<string | null> {
  const cached = locationIdCache.get(storeDomain);
  if (cached) return cached;

  const data = await shopifyGraphQL<{ locations: { nodes: { id: string; fulfillsOnlineOrders: boolean }[] } }>(
    storeDomain,
    accessToken,
    FULFILLMENT_LOCATIONS_QUERY
  );
  const nodes = data.locations.nodes;
  const id = nodes.find((n) => n.fulfillsOnlineOrders)?.id ?? nodes[0]?.id ?? null;
  if (id) locationIdCache.set(storeDomain, id);
  return id;
}

/**
 * Sets each variant's available quantity at `locationId`, batched into one call. An inventory
 * item that isn't yet stocked there rejects `inventorySetQuantities` with a userError — those are
 * activated individually first (which also sets their initial quantity) and skipped from the
 * retry, since `inventoryActivate` already gave them the right number.
 *
 * 2026-04 schema: `InventorySetQuantitiesInput` has no `ignoreCompareQuantity`, and each
 * `InventoryQuantityInput` requires an explicit `changeFromQuantity` (`null` skips the CAS
 * check — this app is the source of truth). Both inventory mutations require an
 * `@idempotent` key, so every call gets a fresh UUID.
 */
export async function setVariantInventory(
  storeDomain: string,
  accessToken: string,
  locationId: string,
  quantities: { inventoryItemId: string; quantity: number }[]
): Promise<void> {
  if (quantities.length === 0) return;

  type SetQuantitiesResult = { inventorySetQuantities: { userErrors: { field: string[] | null; message: string; code: string | null }[] } };
  type ActivateResult = { inventoryActivate: { userErrors: { field: string[] | null; message: string }[] } };

  const data = await shopifyGraphQL<SetQuantitiesResult>(
    storeDomain,
    accessToken,
    INVENTORY_SET_QUANTITIES_MUTATION,
    {
      input: {
        name: 'available',
        reason: 'correction',
        quantities: quantities.map((q) => ({ ...q, locationId, changeFromQuantity: null })),
      },
      idempotencyKey: crypto.randomUUID(),
    }
  );
  if (data.inventorySetQuantities.userErrors.length === 0) return;

  const activated: { inventoryItemId: string; quantity: number }[] = [];
  for (const q of quantities) {
    const activateData = await shopifyGraphQL<ActivateResult>(
      storeDomain,
      accessToken,
      INVENTORY_ACTIVATE_MUTATION,
      { inventoryItemId: q.inventoryItemId, locationId, available: q.quantity, idempotencyKey: crypto.randomUUID() }
    );
    if (activateData.inventoryActivate.userErrors.length === 0) activated.push(q);
  }

  const remaining = quantities.filter((q) => !activated.some((a) => a.inventoryItemId === q.inventoryItemId));
  if (remaining.length === 0) return;
  const retryData = await shopifyGraphQL<SetQuantitiesResult>(
    storeDomain,
    accessToken,
    INVENTORY_SET_QUANTITIES_MUTATION,
    {
      input: {
        name: 'available',
        reason: 'correction',
        quantities: remaining.map((q) => ({ ...q, locationId, changeFromQuantity: null })),
      },
      idempotencyKey: crypto.randomUUID(),
    }
  );
  const retryErrors = retryData.inventorySetQuantities.userErrors;
  if (retryErrors.length > 0) throw new Error(`Failed to set stock: ${retryErrors.map((e) => e.message).join('; ')}`);
}

function optionValue(node: ShopifyVariantNode, names: string[]): string {
  const lower = new Set(names.map((n) => n.toLowerCase()));
  return node.selectedOptions.find((o) => lower.has(o.name.toLowerCase()))?.value ?? '';
}

function toVariant(node: ShopifyVariantNode) {
  const colour = optionValue(node, ['Colour', 'Color']);
  const size = optionValue(node, ['Size']);
  const optionKey = variantOptionKey(node.selectedOptions.map((o) => o.value));
  return {
    variantGid: node.id,
    inventoryItemGid: node.inventoryItem.id,
    sku: node.sku,
    barcode: node.barcode,
    price: Number(node.price),
    colour,
    size,
    optionKey,
  };
}

/**
 * Creates or updates a hub product on one connected store, aspect by aspect. `productSet` is an
 * upsert — list fields (variants, files) are fully replaced by what's included, everything else
 * is a partial patch, so an aspect the caller omits is left untouched on Shopify. Inventory rides
 * along on `variants[].inventoryQuantities` rather than a separate `inventorySetQuantities` call,
 * so product data and stock land in the same atomic request.
 */
export async function publishProductToStore(args: {
  storeId: string;
  aspects: PublishAspect[];
  payload: PublishPayload;
  /** Set once this product has already been published to this store — publishes by id instead of
   * by handle, and inventory updates are scoped to the location already on record. */
  existingProductGid?: string | null;
}): Promise<{
  productGid: string;
  externalId: string;
  handle: string;
  shopifyStatus: string;
  url: string | null;
  variants: { hubVariantId: string; variantGid: string; inventoryItemGid: string; sku: string | null; barcode: string | null; price: number }[];
}> {
  const { storeId, aspects, payload, existingProductGid } = args;
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { storeDomain: true, accessToken: true } });
  if (!store?.accessToken) throw new Error('Store is not connected');

  const includes = (aspect: PublishAspect) => aspects.includes(aspect);

  // Resolved once below (only when variants are actually being pushed) and reused after
  // `productSet` returns to write the definitive stock numbers via inventorySetQuantities.
  let locationId: string | null = null;

  const input: Record<string, unknown> = {};

  if (includes('details')) {
    input.title = payload.title;
    input.descriptionHtml = payload.descriptionHtml;
    input.handle = payload.handle;
    input.vendor = payload.vendor;
    input.productType = payload.productType;
    // UNLISTED is a real ProductStatus value since API 2025-10 (this app is on 2026-04) — sent
    // through as-is, unlike the old coercion to ACTIVE this used to need.
    input.status = payload.status;
    input.tags = payload.tags;
    // Sent even when null/empty (not just omitted) so a draft that clears a previously-set
    // category, collection list, or SEO field can actually clear it on Shopify — productSet only
    // leaves a field untouched when it's absent from the input entirely.
    input.category = payload.categoryGid ?? null;
    if (payload.collectionIds) input.collections = payload.collectionIds;
    input.seo = { title: payload.seoTitle ?? '', description: payload.seoDescription ?? '' };
    // Product options are re-derived from the variant set below whenever variants are pushed —
    // Shopify infers them from productOptions, sent alongside variants.
  }

  if (includes('images')) {
    input.files = payload.images.map((img) => ({
      originalSource: img.url,
      alt: img.altText ?? undefined,
      contentType: 'IMAGE',
    }));
  }

  // Price-only where EVERY variant is already mapped is safe to push through
  // `productVariantsBulkUpdate` instead (see `wantsPricingOnly` below) — it takes just {id, price},
  // so unlike `productSet` it can never reshape or delete a variant. If even one variant is
  // unmapped, `productSet`'s full-replacement `variants` list would delete it, so escalate to a
  // full variants+pricing push instead (also covers new/row-less products). A first publish
  // (`!existingProductGid`) always gets the full push too — otherwise, when neither 'variants' nor
  // a bare price patch is in play, `productSet` would receive no `variants`/`productOptions` at
  // all and Shopify would fabricate its own zero-price, untracked default variant.
  const hasAllVariantIds = payload.variants.length > 0 && payload.variants.every((v) => v.variantGid);
  const effectiveVariants = includes('variants') || !existingProductGid || (includes('pricing') && !hasAllVariantIds);
  const wantsPricingOnly = !effectiveVariants && includes('pricing') && payload.variants.length > 0;

  if (effectiveVariants && payload.variants.length === 0) {
    throw new Error('Select at least one variant to publish');
  }

  const axes = resolveOptionAxes(payload.variants);

  if (effectiveVariants && payload.variants.length > 0) {
    // Always present — Shopify infers the option structure from this, sent alongside variants.
    // Falls back to the built-in Title/"Default Title" option when neither colour nor size is in
    // use, which productSet requires explicitly even for a "no options" product.
    input.productOptions = productOptionsInput(payload.variants, axes);

    locationId = await getPrimaryLocationId(store.storeDomain, store.accessToken);
    if (!locationId) throw new Error("No active fulfilment location on this store — stock can't be published");

    input.variants = payload.variants.map((v) => {
      const variant: Record<string, unknown> = {
        ...(v.variantGid ? { id: v.variantGid } : {}),
        // Sent as '' rather than omitted when blank, so a SKU/barcode the admin cleared actually
        // clears on Shopify instead of leaving the previous value in place.
        sku: v.sku?.trim() ?? '',
        barcode: v.barcode?.trim() ?? '',
        // Omitting price only leaves Shopify's existing price alone for a variant that already
        // exists there — a brand-new variant (no variantGid yet) always needs one, or it's created
        // at 0.00 regardless of whether the pricing aspect was ticked.
        price: includes('pricing') || !v.variantGid ? v.price.toFixed(2) : undefined,
        // REQUIRED and non-null on ProductVariantSetInput — never omitted, even for the built-in
        // Title option (see lib/inventory/variant-options.ts).
        optionValues: variantOptionValues(v, axes),
        // Cost always sent (including 0) — the hub is the source of truth for cost, so an
        // intentional 0 must reach Shopify rather than being silently dropped.
        inventoryItem: { tracked: true, cost: Math.max(0, v.buyPrice).toFixed(2) },
        // Requires the same URL to also be present in the product-level `files` input above —
        // only meaningful when the images aspect is included, which is exactly when that holds.
        ...(includes('images') && v.imageUrl ? { file: { originalSource: v.imageUrl, contentType: 'IMAGE' } } : {}),
      };
      if (locationId) {
        variant.inventoryQuantities = [{ locationId, name: 'available', quantity: Math.max(0, Math.round(v.availableQuantity)) }];
      }
      return variant;
    });
  }

  const identifier = existingProductGid ? { id: existingProductGid } : { handle: payload.handle };

  let product: ShopifyPublishProduct;
  if (Object.keys(input).length > 0) {
    const data = await shopifyGraphQL<ProductSetResult>(store.storeDomain, store.accessToken, PRODUCT_SET_MUTATION, { input, identifier });
    const { product: setProduct, userErrors } = data.productSet;
    if (userErrors.length > 0) throw new Error(userErrors.map((e) => e.message).join('; '));
    if (!setProduct) throw new Error('Shopify did not return the product after productSet');
    product = setProduct;
  } else {
    // Nothing to set — a pure price-only push (see wantsPricingOnly below) with no other aspect
    // selected. Read the product back instead of calling productSet with an empty input.
    // `existingProductGid` is guaranteed here: an empty `input` means `effectiveVariants` was
    // false, and `effectiveVariants` is unconditionally true whenever `existingProductGid` is
    // unset (see above), so this branch is only reachable on a re-publish.
    const data = await shopifyGraphQL<{ node: ShopifyPublishProduct | null }>(store.storeDomain, store.accessToken, PRODUCT_BY_ID_QUERY, {
      id: existingProductGid,
    });
    if (!data.node) throw new Error('Shopify could not find this product');
    product = data.node;
  }

  if (wantsPricingOnly) {
    const priceOnly = payload.variants.filter((v) => v.variantGid).map((v) => ({ id: v.variantGid!, price: v.price }));
    if (priceOnly.length === 0) {
      throw new Error('No variant mappings for this store yet — republish with Variants included to create them first');
    }
    await updateStoreVariantPrices({ storeId, productGid: product.id, variants: priceOnly });
  }

  // Publish to every sales channel for ACTIVE and UNLISTED products — both need channel
  // publication for the storefront route to resolve at all; UNLISTED just stays out of
  // search/collections/recommendations on Shopify's side once it is. DRAFT stays unpublished.
  // Only meaningful when this call actually set a status (the details aspect); guarded so a
  // price/variant-only bulk update never force-publishes a product to every channel behind the
  // admin's back. Idempotent no-op for channels already published there.
  if (includes('details') && (payload.status === 'ACTIVE' || payload.status === 'UNLISTED')) {
    await publishToAllChannels(store.storeDomain, store.accessToken, product.id);
  }

  if (includes('images') && payload.images.length > 0) {
    await waitForImagesReady(store.storeDomain, store.accessToken, product.id, payload.images.length);
  }

  const nodes = product.variants.nodes.map(toVariant);
  // A hub variant we already have a Shopify id for is matched directly by id first — the most
  // reliable match there is, and the only one available for wantsPricingOnly (`productSet` wasn't
  // even called, so there's no fresh SKU/option-value echo to match on). Everything else falls
  // through to a SKU, then option-value, match against the remaining pool. `pool` is consumed as
  // matches are claimed so two hub variants can never both claim the same Shopify node — e.g. two
  // variants sharing a SKU, or (variantOptionKey being order-insensitive) a Colour/Size pair whose
  // values happen to be one another's swapped.
  const byId = new Map(nodes.map((n) => [n.variantGid, n]));
  const claimedByIdSet = new Set(payload.variants.map((v) => v.variantGid).filter((id): id is string => !!id && byId.has(id)));
  const pool = nodes.filter((n) => !claimedByIdSet.has(n.variantGid));
  function claimFromPool(predicate: (n: (typeof nodes)[number]) => boolean) {
    const idx = pool.findIndex(predicate);
    return idx === -1 ? undefined : pool.splice(idx, 1)[0];
  }

  const variants = payload.variants
    .map((v) => {
      const direct = v.variantGid ? byId.get(v.variantGid) : undefined;
      const skuKey = v.sku?.trim().toLowerCase();
      const bySku = !direct && skuKey ? claimFromPool((n) => n.sku?.trim().toLowerCase() === skuKey) : undefined;
      const byOptionValue =
        !direct && !bySku ? optionMatchKeys(v, axes).reduce<(typeof nodes)[number] | undefined>((found, key) => found ?? claimFromPool((n) => n.optionKey === key), undefined) : undefined;
      // Last resort: a single hub variant and a single (still unclaimed) Shopify variant can only
      // be each other, however the option values ended up named — rescues a simple product whose
      // live listing predates every naming scheme above.
      const onlyOne = !direct && !bySku && !byOptionValue && payload.variants.length === 1 ? claimFromPool(() => true) : undefined;
      const match = direct ?? bySku ?? byOptionValue ?? onlyOne;
      if (!match) return null;
      return {
        hubVariantId: v.hubVariantId,
        variantGid: match.variantGid,
        inventoryItemGid: match.inventoryItemGid,
        sku: match.sku,
        barcode: match.barcode,
        // What we just told Shopify to set it to, whenever pricing was pushed — the fetched node
        // can be stale here (wantsPricingOnly reads product state from before its own price push).
        price: includes('pricing') ? v.price : match.price,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // Definitive stock write — `productSet`'s own `inventoryQuantities` only reliably applies to
  // variants it creates fresh; for an existing variant it can only touch a location it's already
  // stocked at, so an existing variant moving into a fresh location (or one that fell through
  // `productSet` for any other reason) would otherwise stay tracked at 0 ("Sold out").
  if (effectiveVariants && locationId) {
    const availableByHub = new Map(payload.variants.map((v) => [v.hubVariantId, Math.max(0, Math.round(v.availableQuantity))]));
    const quantities = variants
      .map((v) => ({ inventoryItemId: v.inventoryItemGid, quantity: availableByHub.get(v.hubVariantId) ?? 0 }))
      .filter((q): q is { inventoryItemId: string; quantity: number } => Boolean(q.inventoryItemId));
    await setVariantInventory(store.storeDomain, store.accessToken, locationId, quantities);
  }

  return {
    productGid: product.id,
    externalId: getLegacyId(product.id),
    handle: product.handle,
    shopifyStatus: product.status,
    url: preferredStoreUrl(product.onlineStoreUrl, product.onlineStorePreviewUrl),
    variants,
  };
}
