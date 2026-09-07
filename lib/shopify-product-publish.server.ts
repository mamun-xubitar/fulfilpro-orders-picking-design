import prisma from '@/lib/prisma.server';
import { shopifyGraphQL, getLegacyId } from '@/lib/shopify-graphql.server';

/** Which parts of the hub product a publish/bulk-update call should push. 'variants' covers
 * SKU, barcode, price, option values and inventory together — Shopify has no finer split, since
 * inventoryQuantities and price both live on the same ProductVariantSetInput row. */
export type PublishAspect = 'images' | 'details' | 'pricing' | 'variants';

export type PublishImage = { url: string; altText: string | null };

export type PublishVariant = {
  /** SupplierProductVariant.id — carried through so the caller can persist the mapping. */
  hubVariantId: string;
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
};

export type PublishPayload = {
  title: string;
  descriptionHtml: string;
  handle: string;
  vendor: string;
  productType: string;
  categoryGid: string | null;
  tags: string[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
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

type ProductSetResult = {
  productSet: {
    product: {
      id: string;
      title: string;
      handle: string;
      status: string;
      onlineStoreUrl: string | null;
      onlineStorePreviewUrl: string | null;
      variants: { nodes: ShopifyVariantNode[] };
    } | null;
    userErrors: { field: string[] | null; message: string }[];
  };
};

const PRODUCT_SET_MUTATION = `
  mutation PublishProductSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
    productSet(input: $input, identifier: $identifier, synchronous: true) {
      product {
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
      }
      userErrors { field message }
    }
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

const PRIMARY_LOCATION_QUERY = `
  query PrimaryFulfillmentLocation {
    locations(first: 1, query: "fulfills_online_orders:true") {
      nodes { id }
    }
  }
`;

/** Cached for the process lifetime per store — publications and the fulfillment location don't
 * change between publish calls, and re-fetching them on every save would double the round trips. */
const publicationIdCache = new Map<string, string>();
const locationIdCache = new Map<string, string>();

async function getOnlineStorePublicationId(storeDomain: string, accessToken: string): Promise<string | null> {
  const cached = publicationIdCache.get(storeDomain);
  if (cached) return cached;

  const data = await shopifyGraphQL<{ publications: { nodes: { id: string; catalog: { title: string } | null }[] } }>(
    storeDomain,
    accessToken,
    PUBLICATIONS_QUERY
  );
  const match = data.publications.nodes.find((p) => p.catalog?.title === 'Online Store');
  if (match) publicationIdCache.set(storeDomain, match.id);
  return match?.id ?? null;
}

async function getPrimaryLocationId(storeDomain: string, accessToken: string): Promise<string | null> {
  const cached = locationIdCache.get(storeDomain);
  if (cached) return cached;

  const data = await shopifyGraphQL<{ locations: { nodes: { id: string }[] } }>(storeDomain, accessToken, PRIMARY_LOCATION_QUERY);
  const id = data.locations.nodes[0]?.id ?? null;
  if (id) locationIdCache.set(storeDomain, id);
  return id;
}

function toVariant(node: ShopifyVariantNode) {
  const colour = node.selectedOptions.find((o) => o.name === 'Colour')?.value ?? '';
  const size = node.selectedOptions.find((o) => o.name === 'Size')?.value ?? '';
  return {
    variantGid: node.id,
    inventoryItemGid: node.inventoryItem.id,
    sku: node.sku,
    barcode: node.barcode,
    price: Number(node.price),
    colour,
    size,
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

  const input: Record<string, unknown> = {};

  if (includes('details')) {
    input.title = payload.title;
    input.descriptionHtml = payload.descriptionHtml;
    input.handle = payload.handle;
    input.vendor = payload.vendor;
    input.productType = payload.productType;
    input.status = payload.status;
    input.tags = payload.tags;
    if (payload.categoryGid) input.category = payload.categoryGid;
    if (payload.seoTitle || payload.seoDescription) {
      input.seo = { title: payload.seoTitle || undefined, description: payload.seoDescription || undefined };
    }
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

  if (includes('variants')) {
    const colours = [...new Set(payload.variants.map((v) => v.colour))];
    const sizes = [...new Set(payload.variants.map((v) => v.size))];
    input.productOptions = [
      { name: 'Colour', values: colours.map((name) => ({ name })) },
      { name: 'Size', values: sizes.map((name) => ({ name })) },
    ];

    let locationId: string | null = null;
    const needsInventory = payload.variants.length > 0;
    if (needsInventory) locationId = await getPrimaryLocationId(store.storeDomain, store.accessToken);

    input.variants = payload.variants.map((v) => {
      const variant: Record<string, unknown> = {
        ...(v.variantGid ? { id: v.variantGid } : {}),
        sku: v.sku ?? undefined,
        barcode: v.barcode ?? undefined,
        price: includes('pricing') ? v.price.toFixed(2) : undefined,
        optionValues: [
          { optionName: 'Colour', name: v.colour },
          { optionName: 'Size', name: v.size },
        ],
        inventoryItem: { tracked: true, cost: v.buyPrice > 0 ? v.buyPrice.toFixed(2) : undefined },
      };
      if (locationId) {
        variant.inventoryQuantities = [{ locationId, name: 'available', quantity: Math.max(0, Math.round(v.availableQuantity)) }];
      }
      return variant;
    });
  } else if (includes('pricing') && payload.variants.length > 0) {
    // Price-only update without touching variant structure — still keyed by existing variant id.
    input.variants = payload.variants
      .filter((v) => v.variantGid)
      .map((v) => ({ id: v.variantGid, price: v.price.toFixed(2) }));
  }

  const identifier = existingProductGid ? { id: existingProductGid } : { handle: payload.handle };

  const data = await shopifyGraphQL<ProductSetResult>(store.storeDomain, store.accessToken, PRODUCT_SET_MUTATION, { input, identifier });
  const { product, userErrors } = data.productSet;
  if (userErrors.length > 0) throw new Error(userErrors.map((e) => e.message).join('; '));
  if (!product) throw new Error('Shopify did not return the product after productSet');

  // Publish to the Online Store sales channel — idempotent no-op if already published there.
  const publicationId = await getOnlineStorePublicationId(store.storeDomain, store.accessToken);
  if (publicationId) {
    await shopifyGraphQL(store.storeDomain, store.accessToken, PUBLISHABLE_PUBLISH_MUTATION, {
      id: product.id,
      input: [{ publicationId }],
    });
  }

  const byOptionKey = new Map(product.variants.nodes.map((n) => [`${toVariant(n).colour}::${toVariant(n).size}`, toVariant(n)]));
  const variants = payload.variants
    .map((v) => {
      const match = byOptionKey.get(`${v.colour}::${v.size}`);
      if (!match) return null;
      return {
        hubVariantId: v.hubVariantId,
        variantGid: match.variantGid,
        inventoryItemGid: match.inventoryItemGid,
        sku: match.sku,
        barcode: match.barcode,
        price: match.price,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return {
    productGid: product.id,
    externalId: getLegacyId(product.id),
    handle: product.handle,
    shopifyStatus: product.status,
    url: product.onlineStoreUrl ?? product.onlineStorePreviewUrl ?? null,
    variants,
  };
}
