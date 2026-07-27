import prisma from '@/lib/prisma.server';
import { ProductStatus } from '@prisma/client';
import { shopifyGraphQL } from '@/lib/shopify-graphql.server';
import { toProductGid } from '@/lib/shopify-product-sync.server';

type ShopifyUserError = { field: string[] | null; message: string };

export type ProductFieldsUpdate = {
  title?: string;
  descriptionHtml?: string;
  tags?: string[];
  productType?: string;
  status?: ProductStatus;
  category?: { id: string; name: string } | null;
};

export type VariantFieldsUpdate = {
  id: string;
  price?: number;
  inventoryPolicy?: 'DENY' | 'CONTINUE';
  cost?: number | null;
};

export type InventoryAdjustPayload = {
  locationIds: string[];
  changes: Array<{ variantId: string; delta: number }>;
};

export type TaxonomyCategory = { id: string; name: string; fullName: string; isLeaf: boolean };

const PRODUCT_UPDATE_MUTATION = `
  mutation ProductDetailUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      userErrors { field message }
    }
  }
`;

const PRODUCT_VARIANTS_BULK_UPDATE_MUTATION = `
  mutation ProductDetailVariantsUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { field message }
    }
  }
`;

const PRODUCT_VARIANTS_BULK_DELETE_MUTATION = `
  mutation ProductDetailVariantsDelete($productId: ID!, $variantsIds: [ID!]!) {
    productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
      userErrors { field message }
    }
  }
`;

const INVENTORY_ADJUST_MUTATION = `
  mutation ProductDetailInventoryAdjust($input: InventoryAdjustQuantitiesInput!, $idempotencyKey: String!) {
    inventoryAdjustQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      userErrors { field message }
    }
  }
`;

const TAXONOMY_SEARCH_QUERY = `
  query ProductDetailTaxonomySearch($search: String, $first: Int!) {
    taxonomy {
      categories(search: $search, first: $first) {
        nodes { id name fullName isLeaf }
      }
    }
  }
`;

type ProductForAction = {
  id: string;
  shopifyId: string;
  storeId: string;
  store: { storeDomain: string; accessToken: string | null };
};

async function getProductForAction(productId: string): Promise<ProductForAction> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, shopifyId: true, storeId: true, store: { select: { storeDomain: true, accessToken: true } } },
  });
  if (!product) throw new Error('Product not found');
  if (!product.store.accessToken) throw new Error('Store is not connected');
  return product;
}

export async function updateProductFields(productId: string, fields: ProductFieldsUpdate) {
  const product = await getProductForAction(productId);
  const gid = toProductGid(product.shopifyId);

  const input: Record<string, unknown> = { id: gid };
  if (fields.title !== undefined) input.title = fields.title;
  if (fields.descriptionHtml !== undefined) input.descriptionHtml = fields.descriptionHtml;
  if (fields.tags !== undefined) input.tags = fields.tags;
  if (fields.productType !== undefined) input.productType = fields.productType;
  if (fields.status !== undefined) input.status = fields.status;
  if (fields.category !== undefined) input.category = fields.category?.id ?? null;

  const data = await shopifyGraphQL<{ productUpdate: { userErrors: ShopifyUserError[] } }>(
    product.store.storeDomain,
    product.store.accessToken!,
    PRODUCT_UPDATE_MUTATION,
    { product: input }
  );
  assertNoUserErrors(data.productUpdate.userErrors);

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.descriptionHtml !== undefined ? { descriptionHtml: fields.descriptionHtml } : {}),
      ...(fields.tags !== undefined ? { tags: fields.tags } : {}),
      ...(fields.productType !== undefined ? { productType: fields.productType } : {}),
      ...(fields.status !== undefined ? { status: fields.status } : {}),
      ...(fields.category !== undefined
        ? { category: fields.category?.name ?? null, categoryId: fields.category?.id ?? null }
        : {}),
    },
  });
}

/** Applies price/inventoryPolicy/cost to a batch of variants in one Shopify call, then mirrors each locally. */
export async function updateVariants(productId: string, variants: VariantFieldsUpdate[]) {
  if (variants.length === 0) return;
  const product = await getProductForAction(productId);

  const dbVariants = await prisma.productVariant.findMany({
    where: { productId, id: { in: variants.map((v) => v.id) } },
  });
  const byId = new Map(dbVariants.map((v) => [v.id, v]));

  const bulkInput = variants.map((v) => {
    const dbVariant = byId.get(v.id);
    if (!dbVariant) throw new Error('Variant not found');
    const entry: Record<string, unknown> = { id: toVariantGid(dbVariant.shopifyId) };
    if (v.price !== undefined) entry.price = v.price;
    if (v.inventoryPolicy !== undefined) entry.inventoryPolicy = v.inventoryPolicy;
    if (v.cost !== undefined) entry.inventoryItem = { cost: v.cost };
    return entry;
  });

  const data = await shopifyGraphQL<{ productVariantsBulkUpdate: { userErrors: ShopifyUserError[] } }>(
    product.store.storeDomain,
    product.store.accessToken!,
    PRODUCT_VARIANTS_BULK_UPDATE_MUTATION,
    { productId: toProductGid(product.shopifyId), variants: bulkInput }
  );
  assertNoUserErrors(data.productVariantsBulkUpdate.userErrors);

  for (const v of variants) {
    await prisma.productVariant.update({
      where: { id: v.id },
      data: {
        ...(v.price !== undefined ? { price: v.price } : {}),
        ...(v.inventoryPolicy !== undefined ? { inventoryPolicy: v.inventoryPolicy } : {}),
        ...(v.cost !== undefined ? { cost: v.cost } : {}),
      },
    });
  }
}

export async function deleteVariants(productId: string, variantIds: string[]) {
  if (variantIds.length === 0) return;
  const product = await getProductForAction(productId);

  const dbVariants = await prisma.productVariant.findMany({
    where: { productId, id: { in: variantIds } },
  });
  if (dbVariants.length === 0) return;

  const data = await shopifyGraphQL<{ productVariantsBulkDelete: { userErrors: ShopifyUserError[] } }>(
    product.store.storeDomain,
    product.store.accessToken!,
    PRODUCT_VARIANTS_BULK_DELETE_MUTATION,
    { productId: toProductGid(product.shopifyId), variantsIds: dbVariants.map((v) => toVariantGid(v.shopifyId)) }
  );
  assertNoUserErrors(data.productVariantsBulkDelete.userErrors);

  await prisma.productVariant.deleteMany({ where: { id: { in: dbVariants.map((v) => v.id) } } });
  await recomputeTotalInventory(productId);
}

/** Applies the same delta to every checked location, for every changed variant, in one Shopify call. */
export async function adjustInventory(productId: string, payload: InventoryAdjustPayload) {
  if (payload.changes.length === 0 || payload.locationIds.length === 0) return;
  const product = await getProductForAction(productId);

  const dbVariants = await prisma.productVariant.findMany({
    where: { productId, id: { in: payload.changes.map((c) => c.variantId) } },
  });
  const byId = new Map(dbVariants.map((v) => [v.id, v]));

  const shopifyChanges: Array<{ inventoryItemId: string; locationId: string; delta: number }> = [];
  for (const change of payload.changes) {
    const variant = byId.get(change.variantId);
    if (!variant?.inventoryItemId || change.delta === 0) continue;
    for (const locationId of payload.locationIds) {
      shopifyChanges.push({
        inventoryItemId: toInventoryItemGid(variant.inventoryItemId),
        locationId: toLocationGid(locationId),
        delta: change.delta,
      });
    }
  }
  if (shopifyChanges.length === 0) return;

  const data = await shopifyGraphQL<{ inventoryAdjustQuantities: { userErrors: ShopifyUserError[] } }>(
    product.store.storeDomain,
    product.store.accessToken!,
    INVENTORY_ADJUST_MUTATION,
    {
      input: { reason: 'correction', name: 'available', changes: shopifyChanges },
      idempotencyKey: crypto.randomUUID(),
    }
  );
  assertNoUserErrors(data.inventoryAdjustQuantities.userErrors);

  for (const change of payload.changes) {
    const variant = byId.get(change.variantId);
    if (!variant?.inventoryItemId || change.delta === 0) continue;
    const totalDelta = change.delta * payload.locationIds.length;
    await prisma.productVariant.update({
      where: { id: change.variantId },
      data: { inventoryQuantity: { increment: totalDelta } },
    });
  }
  await recomputeTotalInventory(productId);
}

export async function searchTaxonomyCategories(storeId: string, search: string): Promise<TaxonomyCategory[]> {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { storeDomain: true, accessToken: true } });
  if (!store?.accessToken) throw new Error('Store is not connected');

  const data = await shopifyGraphQL<{ taxonomy: { categories: { nodes: TaxonomyCategory[] } } }>(
    store.storeDomain,
    store.accessToken,
    TAXONOMY_SEARCH_QUERY,
    { search: search || null, first: 20 }
  );
  return data.taxonomy.categories.nodes;
}

async function recomputeTotalInventory(productId: string) {
  const agg = await prisma.productVariant.aggregate({ where: { productId }, _sum: { inventoryQuantity: true } });
  await prisma.product.update({ where: { id: productId }, data: { totalInventory: agg._sum.inventoryQuantity ?? 0 } });
}

function toVariantGid(id: string) {
  return id.startsWith('gid://shopify/ProductVariant/') ? id : `gid://shopify/ProductVariant/${id}`;
}

function toInventoryItemGid(id: string) {
  return id.startsWith('gid://shopify/InventoryItem/') ? id : `gid://shopify/InventoryItem/${id}`;
}

function toLocationGid(id: string) {
  return id.startsWith('gid://shopify/Location/') ? id : `gid://shopify/Location/${id}`;
}

function assertNoUserErrors(errors: ShopifyUserError[]) {
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }
}
