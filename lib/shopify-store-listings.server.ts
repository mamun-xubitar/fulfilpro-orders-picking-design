import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma.server';
import { StoreModel } from '@/models/store.model.server';
import { shopifyGraphQL, getLegacyId, preferredStoreUrl } from '@/lib/shopify-graphql.server';

const model = new StoreModel();

export type StoreListingVariant = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  optionValues: string[];
  inventoryQuantity: number | null;
  /** This store's live MediaImage id for the variant, if one is assigned — lets the publish/
   * bulk-update modals prefill their per-variant image picker from what's actually on Shopify. */
  imageId: string | null;
};

export type StoreListingCollection = { id: string; title: string; handle: string; automated: boolean };

export type StoreListingImage = { id: string; url: string; altText: string | null };

export type StoreListingResult = {
  storeId: string;
  storeName: string;
  storeDomain: string;
  found: boolean;
  /** How the product was matched on this store — handle lookup, persisted product id fallback, or null. */
  matchedBy: 'handle' | 'id' | null;
  productTitle: string | null;
  productGid: string | null;
  externalId: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'UNLISTED' | null;
  url: string | null;
  currencyCode: string | null;
  variants: StoreListingVariant[];
  productType: string | null;
  collections: StoreListingCollection[];
  /** Product.descriptionHtml on that store — null when not found there. */
  description: string | null;
  /** Product.vendor on that store — null when not found there. */
  vendor: string | null;
  /** Product.tags on that store. */
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  /** Shopify's standard taxonomy category on that store — distinct from `productType`. */
  category: { id: string; name: string } | null;
  /** Product images on that store, live from Shopify. */
  images: StoreListingImage[];
  error: string | null;
};

type ShopifyProductVariantByHandleNode = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  inventoryQuantity: number | null;
  selectedOptions: { name: string; value: string }[];
  media: { nodes: { id: string }[] };
};

type ShopifyCollectionNode = { id: string; title: string; handle: string; ruleSet: { appliedDisjunctively: boolean } | null };

type ShopifyMediaImageNode = { __typename: 'MediaImage'; id: string; image: { url: string; altText: string | null } | null };

type ShopifyProductByHandleNode = {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string;
  descriptionHtml: string;
  vendor: string;
  tags: string[];
  seo: { title: string | null; description: string | null } | null;
  category: { id: string; name: string } | null;
  onlineStoreUrl: string | null;
  onlineStorePreviewUrl: string | null;
  variants: { nodes: ShopifyProductVariantByHandleNode[] };
  collections: { nodes: ShopifyCollectionNode[] };
  media: { nodes: (ShopifyMediaImageNode | { __typename: string })[] };
};

type ShopifyProductByHandleResult = {
  productByIdentifier: ShopifyProductByHandleNode | null;
};

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      title
      handle
      status
      productType
      descriptionHtml
      vendor
      tags
      seo { title description }
      category { id name }
      onlineStoreUrl
      onlineStorePreviewUrl
      variants(first: 100) {
        nodes {
          id
          title
          sku
          barcode
          price
          inventoryQuantity
          selectedOptions { name value }
          media(first: 1) { nodes { id } }
        }
      }
      collections(first: 50) {
        nodes { id title handle ruleSet { appliedDisjunctively } }
      }
      media(first: 50) {
        nodes {
          __typename
          ... on MediaImage { id image { url altText } }
        }
      }
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `
  query ProductById($id: ID!) {
    node(id: $id) {
      ... on Product {
        id
        title
        handle
        status
        productType
        descriptionHtml
        vendor
        tags
        seo { title description }
        category { id name }
        onlineStoreUrl
        onlineStorePreviewUrl
        variants(first: 100) {
          nodes {
            id
            title
            sku
            barcode
            price
            inventoryQuantity
            selectedOptions { name value }
            media(first: 1) { nodes { id } }
          }
        }
        collections(first: 50) {
          nodes { id title handle ruleSet { appliedDisjunctively } }
        }
        media(first: 50) {
          nodes {
            __typename
            ... on MediaImage { id image { url altText } }
          }
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
        barcode
        price
        inventoryQuantity
        selectedOptions { name value }
        media(first: 1) { nodes { id } }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const VALID_STATUSES = new Set(['ACTIVE', 'DRAFT', 'ARCHIVED', 'UNLISTED']);

function toVariant(node: ShopifyProductVariantByHandleNode): StoreListingVariant {
  return {
    id: node.id,
    title: node.title,
    sku: node.sku,
    barcode: node.barcode,
    price: Number(node.price),
    optionValues: node.selectedOptions.map((o) => o.value),
    inventoryQuantity: node.inventoryQuantity,
    imageId: node.media.nodes[0]?.id ?? null,
  };
}

function toImage(node: ShopifyMediaImageNode | { __typename: string }): StoreListingImage | null {
  if (node.__typename !== 'MediaImage') return null;
  const media = node as ShopifyMediaImageNode;
  if (!media.image) return null;
  return { id: media.id, url: media.image.url, altText: media.image.altText };
}

type StoreListingLookup = Omit<StoreListingResult, 'storeId' | 'storeName' | 'storeDomain' | 'error'>;

function toLookup(product: ShopifyProductByHandleNode | null, matchedBy: 'handle' | 'id'): StoreListingLookup {
  if (!product) {
    return {
      found: false,
      matchedBy: null,
      productTitle: null,
      productGid: null,
      externalId: null,
      status: null,
      url: null,
      currencyCode: null,
      variants: [],
      productType: null,
      collections: [],
      description: null,
      vendor: null,
      tags: [],
      seoTitle: null,
      seoDescription: null,
      category: null,
      images: [],
    };
  }
  const status = VALID_STATUSES.has(product.status) ? (product.status as StoreListingResult['status']) : null;
  return {
    found: true,
    matchedBy,
    productTitle: product.title,
    productGid: product.id,
    externalId: getLegacyId(product.id),
    status,
    url: preferredStoreUrl(product.onlineStoreUrl, product.onlineStorePreviewUrl),
    currencyCode: null,
    variants: product.variants.nodes.map(toVariant),
    productType: product.productType ?? null,
    // Automated (rule-based) collections reject direct membership writes — flagged here so the
    // Collections picker never offers them and publish never tries to resend them.
    collections: product.collections.nodes.map((c) => ({ id: c.id, title: c.title, handle: c.handle, automated: c.ruleSet !== null })),
    description: product.descriptionHtml ?? null,
    vendor: product.vendor ?? null,
    tags: product.tags ?? [],
    seoTitle: product.seo?.title ?? null,
    seoDescription: product.seo?.description ?? null,
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
    images: product.media.nodes.map(toImage).filter((img): img is StoreListingImage => img !== null),
  };
}

/** One store's lookup, uncached — throws on failure so a bad token or a throttled shop is never
 * written into the cache (the caller degrades it to a per-card error instead). */
async function fetchOneStoreListing(storeDomain: string, accessToken: string, handle: string): Promise<StoreListingLookup> {
  const data = await shopifyGraphQL<ShopifyProductByHandleResult>(storeDomain, accessToken, PRODUCT_BY_HANDLE_QUERY, { handle });
  return toLookup(data.productByIdentifier, 'handle');
}

/** Fallback lookup by persisted product id — uncached, only used when the handle lookup misses
 * (handle renamed on Shopify, product created externally, stale hub handle). */
async function fetchOneStoreListingById(storeDomain: string, accessToken: string, productGid: string): Promise<StoreListingLookup> {
  const data = await shopifyGraphQL<{ node: ShopifyProductByHandleNode | null }>(storeDomain, accessToken, PRODUCT_BY_ID_QUERY, { id: productGid });
  return toLookup(data.node, 'id');
}

/** Cached per (store, handle) with a 5-minute TTL plus tag invalidation — Sync, publish and
 * price updates all call `revalidateTag(storeListingsTag(handle))`. The access token is kept out
 * of the cache key so a token rotation can't orphan the entry. */
function getCachedStoreListing(store: { id: string; storeDomain: string; accessToken: string }, handle: string) {
  return unstable_cache(() => fetchOneStoreListing(store.storeDomain, store.accessToken, handle), ['store-listings', store.id, handle], {
    tags: [storeListingsTag(handle)],
    revalidate: 300,
  });
}

export type PersistedListingRef = { storeId: string; productGid: string | null };

function emptyResult(base: { storeId: string; storeName: string; storeDomain: string }, error: string | null): StoreListingResult {
  return {
    ...base,
    found: false,
    matchedBy: null,
    productTitle: null,
    productGid: null,
    externalId: null,
    status: null,
    url: null,
    currencyCode: null,
    variants: [],
    productType: null,
    collections: [],
    description: null,
    vendor: null,
    tags: [],
    seoTitle: null,
    seoDescription: null,
    category: null,
    images: [],
    error,
  };
}

/**
 * Looks up one product by handle against every connected store concurrently, falling back to the
 * persisted product id when the handle lookup misses. Each store's lookup is isolated in its own
 * try/catch — one dead token or throttled shop must never take down the other stores' cards,
 * and failures are never cached.
 */
export async function fetchStoreListings(handle: string, persisted: PersistedListingRef[] = []): Promise<StoreListingResult[]> {
  const stores = await model.findConnectedWithTokens();
  const gidByStore = new Map(persisted.map((p) => [p.storeId, p.productGid]));

  return Promise.all(
    stores.map(async (store): Promise<StoreListingResult> => {
      const base = { storeId: store.id, storeName: store.name ?? store.storeDomain, storeDomain: store.storeDomain };
      try {
        const lookup = await getCachedStoreListing(store, handle)();
        if (lookup.found) return { ...base, ...lookup, error: null };
        // Handle miss — retry by persisted Shopify id (handle renamed / externally created).
        const gid = gidByStore.get(store.id);
        if (gid) {
          try {
            // Id-fallback hits are uncached by design so a renamed handle self-heals on the
            // next Sync/publish, which revalidates the handle tag.
            const byId = await fetchOneStoreListingById(store.storeDomain, store.accessToken, gid);
            if (byId.found) return { ...base, ...byId, error: null };
          } catch {
            // Fall through to the clean not-found result below.
          }
        }
        return { ...base, ...lookup, error: null };
      } catch (error) {
        return emptyResult(base, error instanceof Error ? error.message : 'Failed to reach this store');
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
