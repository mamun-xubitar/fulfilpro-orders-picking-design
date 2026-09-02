import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma.server';
import { StoreModel } from '@/models/store.model.server';
import { shopifyGraphQL, getLegacyId } from '@/lib/shopify-graphql.server';

const model = new StoreModel();

export type StoreListingVariant = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  optionValues: string[];
  inventoryQuantity: number | null;
};

export type StoreListingResult = {
  storeId: string;
  storeName: string;
  storeDomain: string;
  found: boolean;
  productTitle: string | null;
  productGid: string | null;
  externalId: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | null;
  url: string | null;
  currencyCode: string | null;
  variants: StoreListingVariant[];
  error: string | null;
};

type ShopifyProductVariantByHandleNode = {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  inventoryQuantity: number | null;
  selectedOptions: { name: string; value: string }[];
};

type ShopifyProductByHandleResult = {
  productByIdentifier: {
    id: string;
    title: string;
    handle: string;
    status: string;
    onlineStoreUrl: string | null;
    onlineStorePreviewUrl: string | null;
    variants: { nodes: ShopifyProductVariantByHandleNode[] };
  } | null;
};

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
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
          price
          inventoryQuantity
          selectedOptions { name value }
        }
      }
    }
  }
`;

const PRODUCT_VARIANTS_BULK_UPDATE_MUTATION = `
  mutation UpdateVariantPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        title
        sku
        price
        inventoryQuantity
        selectedOptions { name value }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const VALID_STATUSES = new Set(['ACTIVE', 'DRAFT', 'ARCHIVED']);

function toVariant(node: ShopifyProductVariantByHandleNode): StoreListingVariant {
  return {
    id: node.id,
    title: node.title,
    sku: node.sku,
    price: Number(node.price),
    optionValues: node.selectedOptions.map((o) => o.value),
    inventoryQuantity: node.inventoryQuantity,
  };
}

type StoreListingLookup = Omit<StoreListingResult, 'storeId' | 'storeName' | 'storeDomain' | 'error'>;

/** One store's lookup, uncached — throws on failure so a bad token or a throttled shop is never
 * written into the cache (the caller degrades it to a per-card error instead). */
async function fetchOneStoreListing(storeDomain: string, accessToken: string, handle: string): Promise<StoreListingLookup> {
  const data = await shopifyGraphQL<ShopifyProductByHandleResult>(storeDomain, accessToken, PRODUCT_BY_HANDLE_QUERY, { handle });
  const product = data.productByIdentifier;
  if (!product) {
    return { found: false, productTitle: null, productGid: null, externalId: null, status: null, url: null, currencyCode: null, variants: [] };
  }
  const status = VALID_STATUSES.has(product.status) ? (product.status as StoreListingResult['status']) : null;
  return {
    found: true,
    productTitle: product.title,
    productGid: product.id,
    externalId: getLegacyId(product.id),
    status,
    url: product.onlineStoreUrl ?? product.onlineStorePreviewUrl ?? null,
    currencyCode: null,
    variants: product.variants.nodes.map(toVariant),
  };
}

/** Cached per (store, handle) until `revalidateTag(storeListingsTag(handle))` fires — no time
 * expiry, since the app's only writes to Shopify product data (price updates, and Sync) both
 * invalidate the tag themselves. The access token is deliberately kept out of the cache key
 * (only `store.id` + `handle` identify the entry) so a token rotation can't orphan it. */
function getCachedStoreListing(store: { id: string; storeDomain: string; accessToken: string }, handle: string) {
  return unstable_cache(() => fetchOneStoreListing(store.storeDomain, store.accessToken, handle), ['store-listings', store.id, handle], {
    tags: [storeListingsTag(handle)],
    revalidate: false,
  });
}

/**
 * Looks up one product by handle against every connected store concurrently. Each store's
 * lookup is isolated in its own try/catch — one dead token or throttled shop must never take
 * down the other stores' cards, and its failure is never cached.
 */
export async function fetchStoreListings(handle: string): Promise<StoreListingResult[]> {
  const stores = await model.findConnectedWithTokens();

  return Promise.all(
    stores.map(async (store): Promise<StoreListingResult> => {
      const base = { storeId: store.id, storeName: store.name ?? store.storeDomain, storeDomain: store.storeDomain };
      try {
        const lookup = await getCachedStoreListing(store, handle)();
        return { ...base, ...lookup, error: null };
      } catch (error) {
        return {
          ...base,
          found: false,
          productTitle: null,
          productGid: null,
          externalId: null,
          status: null,
          url: null,
          currencyCode: null,
          variants: [],
          error: error instanceof Error ? error.message : 'Failed to reach this store',
        };
      }
    })
  );
}

/** Pushes new prices for a set of variants on a single store's product. Surfaces Shopify
 * `userErrors` as a thrown error the controller turns into a 400. */
export async function updateStoreVariantPrices(args: {
  storeId: string;
  productGid: string;
  variants: { id: string; price: number }[];
}): Promise<StoreListingVariant[]> {
  const store = await prisma.store.findUnique({ where: { id: args.storeId }, select: { storeDomain: true, accessToken: true } });
  if (!store?.accessToken) throw new Error('Store is not connected');

  const data = await shopifyGraphQL<{
    productVariantsBulkUpdate: { productVariants: ShopifyProductVariantByHandleNode[]; userErrors: { field: string[] | null; message: string }[] };
  }>(store.storeDomain, store.accessToken, PRODUCT_VARIANTS_BULK_UPDATE_MUTATION, {
    productId: args.productGid,
    variants: args.variants.map((v) => ({ id: v.id, price: v.price })),
  });

  const { productVariants, userErrors } = data.productVariantsBulkUpdate;
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join('; '));
  }
  return productVariants.map(toVariant);
}

export const storeListingsTag = (handle: string) => `store-listings:${handle}`;
