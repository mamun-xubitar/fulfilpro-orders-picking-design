import prisma from '@/lib/prisma.server';
import { shopifyGraphQL, getLegacyId } from '@/lib/shopify-graphql.server';
import { relinkOrphanOrderLineItems } from '@/lib/product-order-link.server';
import { ProductStatus } from '@prisma/client';

const PRODUCTS_PAGE_SIZE = 50;
const VARIANTS_PAGE_SIZE = 100;

type SyncStoreResult = {
  storeId: string;
  storeDomain: string;
  fetched: number;
  created: number;
  updated: number;
  error?: string;
};

export type ShopifyProductVariantNode = {
  id: string;
  title: string | null;
  sku: string | null;
  price: string;
  position: number;
  inventoryQuantity: number | null;
  inventoryPolicy: string | null;
  selectedOptions: Array<{ name: string; value: string }> | null;
  image: { url: string } | null;
  inventoryItem: { id: string; tracked: boolean; unitCost: { amount: string } | null } | null;
};

export type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string | null;
  vendor: string | null;
  productType: string | null;
  status: string;
  tags: string[];
  descriptionHtml: string | null;
  category: { id: string; name: string } | null;
  featuredImage: { url: string } | null;
  media: { nodes: Array<{ id: string; image: { url: string; altText: string | null } | null }> } | null;
  onlineStoreUrl: string | null;
  onlineStorePreviewUrl: string | null;
  totalInventory: number | null;
  createdAt: string;
  updatedAt: string;
  resourcePublicationsV2: {
    nodes: Array<{ publication: { id: string; name: string }; isPublished: boolean }>;
  };
  variants: {
    nodes: ShopifyProductVariantNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

type ShopifyProductsResult = {
  products: {
    nodes: ShopifyProductNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

type ShopifyProductVariantsResult = {
  product: {
    variants: { nodes: ShopifyProductVariantNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  } | null;
};

// read_publications/write_publications were added to DEFAULT_SCOPES alongside this
// field. Existing store OAuth tokens issued before that change do NOT have the new
// scope — Shopify only grants it after the merchant re-authorizes (reconnect flow).
// Requesting it against such a token makes Shopify's ENTIRE query fail (top-level
// GraphQL error, not just a null field), which would take down product sync for
// every store that hasn't reconnected yet. So this field is opt-in per query call:
// we try it, and if a store's token rejects it, we cache that per-shop and fall
// back to the channel-less query for the rest of the process's lifetime.
const RESOURCE_PUBLICATIONS_FIELD = `
        resourcePublicationsV2(first: 25) {
          nodes {
            publication { id name }
            isPublished
          }
        }`;

export const PRODUCT_VARIANT_FIELDS = `
          id
          title
          sku
          price
          position
          inventoryQuantity
          inventoryPolicy
          selectedOptions { name value }
          image { url }
          inventoryItem { id tracked unitCost { amount } }`;

function buildProductsQuery(includeChannels: boolean) {
  return `
  query ProductsForSync($first: Int!, $after: String, $query: String!) {
    products(first: $first, after: $after, query: $query, sortKey: ID) {
      nodes {
        id
        title
        handle
        vendor
        productType
        status
        tags
        descriptionHtml
        category { id name }
        featuredImage { url }
        media(first: 20) { nodes { id ... on MediaImage { image { url altText } } } }
        onlineStoreUrl
        onlineStorePreviewUrl
        totalInventory
        createdAt
        updatedAt
        ${includeChannels ? RESOURCE_PUBLICATIONS_FIELD : ''}
        variants(first: ${VARIANTS_PAGE_SIZE}) {
          nodes {${PRODUCT_VARIANT_FIELDS}
          }
          pageInfo { hasNextPage endCursor }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;
}

const PRODUCT_VARIANTS_QUERY = `
  query ProductVariantsForSync($id: ID!, $first: Int!, $after: String) {
    product(id: $id) {
      variants(first: $first, after: $after) {
        nodes {${PRODUCT_VARIANT_FIELDS}
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

function buildProductByIdQuery(includeChannels: boolean, mediaLimit = 20) {
  return `
  query ProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      vendor
      productType
      status
      tags
      descriptionHtml
      category { id name }
      featuredImage { url }
      media(first: ${mediaLimit}) { nodes { id ... on MediaImage { image { url altText } } } }
      onlineStoreUrl
      onlineStorePreviewUrl
      totalInventory
      createdAt
      updatedAt
      ${includeChannels ? RESOURCE_PUBLICATIONS_FIELD : ''}
      variants(first: ${VARIANTS_PAGE_SIZE}) {
        nodes {${PRODUCT_VARIANT_FIELDS}
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;
}

type ShopifyProductByIdResult = { product: ShopifyProductNode | null };

const shopsWithoutPublicationsScope = new Set<string>();

function isPublicationsScopeError(error: unknown) {
  return error instanceof Error && /resourcePublicationsV2|read_publications/i.test(error.message);
}

/** Requests channels opportunistically; if a shop's token lacks read_publications, falls back and remembers it for this process. */
async function queryProducts(shop: string, accessToken: string, variables: Record<string, unknown>) {
  const includeChannels = !shopsWithoutPublicationsScope.has(shop);
  try {
    return await shopifyGraphQL<ShopifyProductsResult>(shop, accessToken, buildProductsQuery(includeChannels), variables);
  } catch (error) {
    if (includeChannels && isPublicationsScopeError(error)) {
      shopsWithoutPublicationsScope.add(shop);
      return shopifyGraphQL<ShopifyProductsResult>(shop, accessToken, buildProductsQuery(false), variables);
    }
    throw error;
  }
}

async function queryProductById(shop: string, accessToken: string, id: string, mediaLimit?: number) {
  const includeChannels = !shopsWithoutPublicationsScope.has(shop);
  try {
    return await shopifyGraphQL<ShopifyProductByIdResult>(shop, accessToken, buildProductByIdQuery(includeChannels, mediaLimit), { id });
  } catch (error) {
    if (includeChannels && isPublicationsScopeError(error)) {
      shopsWithoutPublicationsScope.add(shop);
      return shopifyGraphQL<ShopifyProductByIdResult>(shop, accessToken, buildProductByIdQuery(false, mediaLimit), { id });
    }
    throw error;
  }
}

/** Used by the product webhook (create/update) to sync a single product on demand. */
export async function syncSingleProduct(params: {
  storeId: string;
  shop: string;
  accessToken: string;
  shopifyProductId: string | number;
  /** How many images to fetch; defaults to 20 like the bulk sync ("+ PO" asks for Shopify's maximum, 250). */
  mediaLimit?: number;
}) {
  const { storeId, shop, accessToken, shopifyProductId, mediaLimit } = params;
  const data = await queryProductById(shop, accessToken, toProductGid(shopifyProductId), mediaLimit);
  if (!data.product) return null;

  const product = data.product;
  if (product.variants.pageInfo.hasNextPage) {
    product.variants.nodes = await fetchRemainingVariants(shop, accessToken, product);
  }

  const result = await upsertProduct(storeId, product);
  await relinkOrphanOrderLineItems(storeId, [result.shopifyId]).catch((error) => {
    console.error('Failed to relink order line items after single product sync', { storeId, error });
  });
  return result;
}

export async function softDeleteProduct(storeId: string, shopifyProductId: string | number) {
  await prisma.product.updateMany({
    where: { storeId, shopifyId: String(shopifyProductId) },
    data: { deletedAt: new Date() },
  });
}

export function toProductGid(id: string | number) {
  const value = String(id);
  return value.startsWith('gid://shopify/Product/') ? value : `gid://shopify/Product/${value}`;
}

export async function syncConnectedStoreProducts(params?: {
  storeIds?: string[] | null;
  onStoreSynced?: (result: SyncStoreResult) => Promise<void> | void;
}) {
  const stores = await prisma.store.findMany({
    where: {
      status: 'connected',
      accessToken: { not: null },
      ...(params?.storeIds && params.storeIds.length > 0 ? { id: { in: params.storeIds } } : {}),
    },
    select: { id: true, storeDomain: true, accessToken: true, lastProductSyncedAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const results: SyncStoreResult[] = [];

  // One store at a time — product sync is heavier per item (up to 100
  // variants each) than order sync, so we don't fan out with Promise.all the
  // way order sync does; that would amplify throttling across stores.
  for (const store of stores) {
    try {
      let fetched = 0;
      let created = 0;
      let updated = 0;
      const syncedShopifyIds: string[] = [];

      const products = await fetchShopifyProducts(store.storeDomain, store.accessToken!, store.lastProductSyncedAt);
      fetched = products.length;

      for (const product of products) {
        const result = await upsertProduct(store.id, product);
        if (result.created) created += 1;
        if (result.updated) updated += 1;
        syncedShopifyIds.push(result.shopifyId);
      }

      await prisma.store.update({ where: { id: store.id }, data: { lastProductSyncedAt: new Date() } });

      if (syncedShopifyIds.length > 0) {
        await relinkOrphanOrderLineItems(store.id, syncedShopifyIds).catch((error) => {
          console.error('Failed to relink order line items after product sync', { storeId: store.id, error });
        });
      }

      const result: SyncStoreResult = { storeId: store.id, storeDomain: store.storeDomain, fetched, created, updated };
      await params?.onStoreSynced?.(result);
      results.push(result);
    } catch (error) {
      console.error('Product sync failed for store', {
        storeDomain: store.storeDomain,
        error: error instanceof Error ? error.message : error,
      });
      const result: SyncStoreResult = {
        storeId: store.id,
        storeDomain: store.storeDomain,
        fetched: 0,
        created: 0,
        updated: 0,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      };
      await params?.onStoreSynced?.(result);
      results.push(result);
    }
  }

  return {
    totalStores: stores.length,
    totalFetched: results.reduce((sum, item) => sum + item.fetched, 0),
    totalCreated: results.reduce((sum, item) => sum + item.created, 0),
    totalUpdated: results.reduce((sum, item) => sum + item.updated, 0),
    failedStores: results.filter((item) => item.error).length,
    results,
  };
}

async function fetchShopifyProducts(
  shop: string,
  accessToken: string,
  lastSyncedAt: Date | null
): Promise<ShopifyProductNode[]> {
  const products: ShopifyProductNode[] = [];
  let after: string | null = null;
  let hasNextPage = true;
  const query = lastSyncedAt ? `updated_at:>'${lastSyncedAt.toISOString()}'` : '';

  while (hasNextPage) {
    const data: ShopifyProductsResult = await queryProducts(shop, accessToken, {
      first: PRODUCTS_PAGE_SIZE,
      after,
      query,
    });

    for (const product of data.products.nodes) {
      if (product.variants.pageInfo.hasNextPage) {
        product.variants.nodes = await fetchRemainingVariants(shop, accessToken, product);
      }
      products.push(product);
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    after = data.products.pageInfo.endCursor;
  }

  return products;
}

// Rare: a product with more than 100 variants. Re-page that product's variants alone.
async function fetchRemainingVariants(
  shop: string,
  accessToken: string,
  product: ShopifyProductNode
): Promise<ShopifyProductVariantNode[]> {
  const variants = [...product.variants.nodes];
  let after = product.variants.pageInfo.endCursor;
  let hasNextPage = product.variants.pageInfo.hasNextPage;

  while (hasNextPage) {
    const data = await shopifyGraphQL<ShopifyProductVariantsResult>(shop, accessToken, PRODUCT_VARIANTS_QUERY, {
      id: product.id,
      first: VARIANTS_PAGE_SIZE,
      after,
    });
    if (!data.product) break;

    variants.push(...data.product.variants.nodes);
    hasNextPage = data.product.variants.pageInfo.hasNextPage;
    after = data.product.variants.pageInfo.endCursor;
  }

  return variants;
}

export async function upsertProduct(storeId: string, product: ShopifyProductNode) {
  const shopifyId = getLegacyId(product.id);

  const data = {
    title: product.title,
    handle: product.handle,
    vendor: product.vendor,
    productType: product.productType,
    category: product.category?.name ?? null,
    categoryId: product.category?.id ?? null,
    status: toProductStatus(product.status),
    tags: product.tags ?? [],
    imageUrl: product.featuredImage?.url ?? null,
    descriptionHtml: product.descriptionHtml ?? null,
    images: (product.media?.nodes ?? [])
      .filter((node): node is { id: string; image: { url: string; altText: string | null } } => !!node.image)
      .map((node) => ({ id: node.id, url: node.image.url, altText: node.image.altText })),
    onlineStoreUrl: product.onlineStoreUrl || product.onlineStorePreviewUrl,
    salesChannels: (product.resourcePublicationsV2?.nodes ?? [])
      .filter((node) => node.isPublished)
      .map((node) => ({ id: getLegacyId(node.publication.id), name: node.publication.name })),
    totalInventory: product.totalInventory ?? 0,
    shopifyCreatedAt: new Date(product.createdAt),
    shopifyUpdatedAt: new Date(product.updatedAt),
    deletedAt: null,
  };

  const existing = await prisma.product.findUnique({
    where: { storeId_shopifyId: { storeId, shopifyId } },
    select: { id: true },
  });

  const dbProduct = existing
    ? await prisma.product.update({ where: { id: existing.id }, data })
    : await prisma.product.create({ data: { ...data, storeId, shopifyId } });

  await upsertVariants(dbProduct.id, storeId, product.variants.nodes);

  return { created: !existing, updated: !!existing, shopifyId };
}

async function upsertVariants(productId: string, storeId: string, variants: ShopifyProductVariantNode[]) {
  const seenShopifyIds: string[] = [];

  for (const variant of variants) {
    const shopifyId = getLegacyId(variant.id);
    seenShopifyIds.push(shopifyId);

    const data = {
      productId,
      title: variant.title,
      sku: variant.sku,
      price: Number(variant.price ?? 0),
      cost: variant.inventoryItem?.unitCost?.amount != null ? Number(variant.inventoryItem.unitCost.amount) : null,
      inventoryItemId: variant.inventoryItem?.id ? getLegacyId(variant.inventoryItem.id) : null,
      inventoryQuantity: variant.inventoryQuantity ?? 0,
      inventoryTracked: variant.inventoryItem?.tracked ?? true,
      inventoryPolicy: variant.inventoryPolicy ?? 'DENY',
      imageUrl: variant.image?.url ?? null,
      optionValues: variant.selectedOptions ?? [],
      position: variant.position ?? 0,
    };

    await prisma.productVariant.upsert({
      where: { storeId_shopifyId: { storeId, shopifyId } },
      update: data,
      create: { ...data, storeId, shopifyId },
    });
  }

  // Variants removed on Shopify's side since the last sync — drop the local mirror.
  if (seenShopifyIds.length > 0) {
    await prisma.productVariant.deleteMany({
      where: { productId, shopifyId: { notIn: seenShopifyIds } },
    });
  }
}

function toProductStatus(value: string): ProductStatus {
  const upper = value?.toUpperCase();
  if (upper === 'ACTIVE' || upper === 'DRAFT' || upper === 'ARCHIVED') return upper;
  return 'ACTIVE';
}
