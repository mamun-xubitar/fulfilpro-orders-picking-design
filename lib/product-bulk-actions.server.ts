import prisma from '@/lib/prisma.server';
import { Prisma, ProductStatus } from '@prisma/client';
import { shopifyGraphQL, getLegacyId } from '@/lib/shopify-graphql.server';
import { softDeleteProduct, toProductGid } from '@/lib/shopify-product-sync.server';

export type BulkProductAction =
  | 'delete'
  | 'archive'
  | 'set_draft'
  | 'include_channel'
  | 'exclude_channel'
  | 'add_tags'
  | 'remove_tags';

export type BulkProductActionPayload = {
  action: BulkProductAction;
  productIds: string[];
  tags?: string[];
  channelName?: string;
};

type ShopifyUserError = { field: string[] | null; message: string };

type BulkActionProgress = {
  done: number;
  total: number;
  errors: Array<{ productId: string; title: string; message: string }>;
};

type ProductForAction = {
  id: string;
  shopifyId: string;
  storeId: string;
  title: string;
  tags: string[];
  salesChannels: Prisma.JsonValue;
  store: { storeDomain: string; accessToken: string | null };
};

type ShopifyChannel = { id: string; name: string };

const PRODUCT_UPDATE_MUTATION = `
  mutation BulkProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      userErrors { field message }
    }
  }
`;

const PRODUCT_DELETE_MUTATION = `
  mutation BulkProductDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`;

const PUBLISHABLE_PUBLISH_MUTATION = `
  mutation BulkPublishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

const PUBLISHABLE_UNPUBLISH_MUTATION = `
  mutation BulkPublishableUnpublish($id: ID!, $input: [PublicationInput!]!) {
    publishableUnpublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

const SHOP_PUBLICATIONS_QUERY = `
  query ShopPublications($first: Int!) {
    publications(first: $first) {
      nodes { id name }
    }
  }
`;

/**
 * Runs one bulk action against Shopify (source of truth) for every selected
 * product, mirrors the result locally, and writes running progress onto the
 * BackgroundJob row. Per-product failures are collected into progress.errors
 * rather than aborting the whole job; the job only throws (-> status 'failed')
 * if every single product failed.
 */
export async function runBulkProductAction(jobId: string, payload: BulkProductActionPayload) {
  const { action, productIds } = payload;
  if (productIds.length === 0) return;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      shopifyId: true,
      storeId: true,
      title: true,
      tags: true,
      salesChannels: true,
      store: { select: { storeDomain: true, accessToken: true } },
    },
  });

  const progress: BulkActionProgress = { done: 0, total: products.length, errors: [] };
  await writeProgress(jobId, progress);

  const publicationsCache = new Map<string, Promise<ShopifyChannel[]>>();

  for (const product of products) {
    try {
      if (!product.store.accessToken) throw new Error('Store is not connected');
      await runSingleAction(action, product, payload, publicationsCache);
    } catch (error) {
      progress.errors.push({
        productId: product.id,
        title: product.title,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    progress.done += 1;
    await writeProgress(jobId, progress);
  }

  if (products.length > 0 && progress.errors.length === products.length) {
    throw new Error(`All ${products.length} product(s) failed`);
  }
}

/** Synchronous single-product delete for the row-level DELETE action (not queued — one product, immediate feedback). */
export async function deleteProductNow(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      shopifyId: true,
      storeId: true,
      title: true,
      tags: true,
      salesChannels: true,
      store: { select: { storeDomain: true, accessToken: true } },
    },
  });
  if (!product) throw new Error('Product not found');
  if (!product.store.accessToken) throw new Error('Store is not connected');

  const gid = toProductGid(product.shopifyId);
  await deleteProduct(product.store.storeDomain, product.store.accessToken, gid, product);
}

async function writeProgress(jobId: string, progress: BulkActionProgress) {
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: { progress: progress as unknown as Prisma.InputJsonValue },
  });
}

async function runSingleAction(
  action: BulkProductAction,
  product: ProductForAction,
  payload: BulkProductActionPayload,
  publicationsCache: Map<string, Promise<ShopifyChannel[]>>
) {
  const shop = product.store.storeDomain;
  const accessToken = product.store.accessToken!;
  const gid = toProductGid(product.shopifyId);

  switch (action) {
    case 'delete':
      return deleteProduct(shop, accessToken, gid, product);
    case 'archive':
      return updateStatus(shop, accessToken, gid, product, 'ARCHIVED');
    case 'set_draft':
      return updateStatus(shop, accessToken, gid, product, 'DRAFT');
    case 'add_tags':
      return updateTags(shop, accessToken, gid, product, unionTags(product.tags, payload.tags ?? []));
    case 'remove_tags':
      return updateTags(shop, accessToken, gid, product, subtractTags(product.tags, payload.tags ?? []));
    case 'include_channel':
      return togglePublication(shop, accessToken, gid, product, payload.channelName ?? '', true, publicationsCache);
    case 'exclude_channel':
      return togglePublication(shop, accessToken, gid, product, payload.channelName ?? '', false, publicationsCache);
    default:
      throw new Error(`Unknown bulk action: ${action satisfies never}`);
  }
}

async function deleteProduct(shop: string, accessToken: string, gid: string, product: ProductForAction) {
  const data = await shopifyGraphQL<{ productDelete: { userErrors: ShopifyUserError[] } }>(
    shop,
    accessToken,
    PRODUCT_DELETE_MUTATION,
    { input: { id: gid } }
  );
  assertNoUserErrors(data.productDelete.userErrors);
  await softDeleteProduct(product.storeId, product.shopifyId);
}

async function updateStatus(
  shop: string,
  accessToken: string,
  gid: string,
  product: ProductForAction,
  status: ProductStatus
) {
  const data = await shopifyGraphQL<{ productUpdate: { userErrors: ShopifyUserError[] } }>(
    shop,
    accessToken,
    PRODUCT_UPDATE_MUTATION,
    { product: { id: gid, status } }
  );
  assertNoUserErrors(data.productUpdate.userErrors);
  await prisma.product.update({ where: { id: product.id }, data: { status } });
}

async function updateTags(shop: string, accessToken: string, gid: string, product: ProductForAction, newTags: string[]) {
  const data = await shopifyGraphQL<{ productUpdate: { userErrors: ShopifyUserError[] } }>(
    shop,
    accessToken,
    PRODUCT_UPDATE_MUTATION,
    { product: { id: gid, tags: newTags } }
  );
  assertNoUserErrors(data.productUpdate.userErrors);
  await prisma.product.update({ where: { id: product.id }, data: { tags: newTags } });
}

async function togglePublication(
  shop: string,
  accessToken: string,
  gid: string,
  product: ProductForAction,
  channelName: string,
  include: boolean,
  publicationsCache: Map<string, Promise<ShopifyChannel[]>>
) {
  if (!channelName) throw new Error('channelName is required');

  const publications = await getShopPublications(shop, accessToken, publicationsCache);
  const publication = publications.find((p) => p.name === channelName);
  if (!publication) throw new Error(`Channel "${channelName}" not found on this store`);

  const mutation = include ? PUBLISHABLE_PUBLISH_MUTATION : PUBLISHABLE_UNPUBLISH_MUTATION;
  const resultKey = include ? 'publishablePublish' : 'publishableUnpublish';
  const data = await shopifyGraphQL<Record<string, { userErrors: ShopifyUserError[] }>>(shop, accessToken, mutation, {
    id: gid,
    input: [{ publicationId: toPublicationGid(publication.id) }],
  });
  assertNoUserErrors(data[resultKey].userErrors);

  const currentChannels = Array.isArray(product.salesChannels) ? (product.salesChannels as unknown as ShopifyChannel[]) : [];
  const nextChannels = include
    ? currentChannels.some((c) => c.id === publication.id)
      ? currentChannels
      : [...currentChannels, publication]
    : currentChannels.filter((c) => c.id !== publication.id);

  await prisma.product.update({
    where: { id: product.id },
    data: { salesChannels: nextChannels as unknown as Prisma.InputJsonValue },
  });
}

async function getShopPublications(
  shop: string,
  accessToken: string,
  cache: Map<string, Promise<ShopifyChannel[]>>
): Promise<ShopifyChannel[]> {
  const cached = cache.get(shop);
  if (cached) return cached;

  const promise = shopifyGraphQL<{ publications: { nodes: Array<{ id: string; name: string }> } }>(
    shop,
    accessToken,
    SHOP_PUBLICATIONS_QUERY,
    { first: 25 }
  ).then((data) => data.publications.nodes.map((node) => ({ id: getLegacyId(node.id), name: node.name })));

  cache.set(shop, promise);
  return promise;
}

function toPublicationGid(id: string) {
  return id.startsWith('gid://shopify/Publication/') ? id : `gid://shopify/Publication/${id}`;
}

function assertNoUserErrors(errors: ShopifyUserError[]) {
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }
}

function unionTags(existing: string[], toAdd: string[]) {
  const set = new Set(existing);
  for (const tag of toAdd) set.add(tag);
  return [...set];
}

function subtractTags(existing: string[], toRemove: string[]) {
  const remove = new Set(toRemove);
  return existing.filter((tag) => !remove.has(tag));
}
