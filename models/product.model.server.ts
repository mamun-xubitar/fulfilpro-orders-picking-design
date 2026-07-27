import prisma from '@/lib/prisma.server';
import { Prisma, ProductStatus } from '@prisma/client';

const SORTABLE_FIELDS = new Set(['title', 'vendor', 'category', 'productType', 'status', 'totalInventory', 'soldQuantity', 'updatedAt', 'store']);

export type ProductListParams = {
  search?: string;
  searchField?: string;
  storeIds?: string[];
  status?: ProductStatus[];
  stockLevel?: string;
  stockCompare?: 'below' | 'above' | '';
  stockQty?: number | null;
  sort?: string;
  dir?: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

export class ProductModel {
  async list(params: ProductListParams) {
    const { sort = 'title', dir = 'asc', page, pageSize } = params;
    const where = buildWhere(params);

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: buildOrderBy(sort, dir),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { store: { select: { id: true, name: true, storeDomain: true } } },
      }),
    ]);

    return { products: products.map(serializeProduct), total };
  }

  /** Resolves "select all matching filters" for bulk actions into concrete product ids. */
  async listIds(params: Omit<ProductListParams, 'page' | 'pageSize' | 'sort' | 'dir'>) {
    const where = buildWhere(params);
    const products = await prisma.product.findMany({ where, select: { id: true } });
    return products.map((p) => p.id);
  }

  async formData(allowedStoreIds?: string[] | null) {
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (allowedStoreIds !== null && allowedStoreIds !== undefined) {
      where.storeId = { in: allowedStoreIds };
    }

    const [vendors, productTypes, categories, tagsAndChannels, stores] = await Promise.all([
      prisma.product.findMany({ where, distinct: ['vendor'], select: { vendor: true } }),
      prisma.product.findMany({ where, distinct: ['productType'], select: { productType: true } }),
      prisma.product.findMany({ where, distinct: ['category'], select: { category: true } }),
      prisma.product.findMany({ where, select: { tags: true, salesChannels: true } }),
      this.getStoreOptions(allowedStoreIds),
    ]);

    const tagSet = new Set<string>();
    const channelSet = new Set<string>();
    for (const product of tagsAndChannels) {
      for (const tag of product.tags) tagSet.add(tag);
      if (Array.isArray(product.salesChannels)) {
        for (const channel of product.salesChannels as unknown[]) {
          if (channel && typeof channel === 'object' && 'name' in channel && typeof (channel as { name: unknown }).name === 'string') {
            channelSet.add((channel as { name: string }).name);
          }
        }
      }
    }

    return {
      vendors: vendors.map((v) => v.vendor).filter((v): v is string => !!v).sort(),
      productTypes: productTypes.map((v) => v.productType).filter((v): v is string => !!v).sort(),
      categories: categories.map((v) => v.category).filter((v): v is string => !!v).sort(),
      tags: [...tagSet].sort(),
      salesChannels: [...channelSet].sort(),
      stores,
    };
  }

  async findDetail(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true, storeDomain: true } },
        variants: { orderBy: { position: 'asc' } },
      },
    });
    return product ? serializeProductDetail(product) : null;
  }

  async findSiblingsByHandle(handle: string, excludeProductId: string) {
    const products = await prisma.product.findMany({
      where: { handle, deletedAt: null, id: { not: excludeProductId } },
      select: {
        id: true,
        title: true,
        onlineStoreUrl: true,
        store: { select: { id: true, name: true, storeDomain: true } },
      },
    });
    return products.map((p) => ({
      id: p.id,
      title: p.title,
      onlineStoreUrl: p.onlineStoreUrl,
      store: { id: p.store.id, name: p.store.name ?? p.store.storeDomain },
    }));
  }

  async getStoreOptions(allowedStoreIds?: string[] | null) {
    const where: Prisma.StoreWhereInput = { status: 'connected' };
    if (allowedStoreIds !== null && allowedStoreIds !== undefined) {
      where.id = { in: allowedStoreIds };
    }

    const stores = await prisma.store.findMany({
      where,
      select: { id: true, name: true, storeDomain: true },
      orderBy: [{ name: 'asc' }, { storeDomain: 'asc' }],
    });

    return stores.map((store) => ({ id: store.id, name: store.name ?? store.storeDomain, storeDomain: store.storeDomain }));
  }
}

function buildWhere(params: Omit<ProductListParams, 'page' | 'pageSize' | 'sort' | 'dir'>): Prisma.ProductWhereInput {
  const { search, searchField, storeIds = [], status = [], stockLevel, stockCompare, stockQty } = params;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(storeIds.length > 0 ? { storeId: { in: storeIds } } : {}),
    ...(status.length > 0 ? { status: { in: status } } : {}),
  };

  const tokens = (search?.trim() ?? '').split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    where.AND = tokens.map((token) => (searchField ? buildFieldCondition(searchField, token) : buildAnyFieldCondition(token)));
  }

  if (stockLevel === 'not_tracked') {
    where.variants = { some: { inventoryTracked: false } };
  } else if (stockLevel === 'out_of_stock') {
    where.totalInventory = { lte: 0 };
  } else if (stockLevel === 'in_stock') {
    where.totalInventory = { gt: 0 };
  }

  if (stockCompare && stockQty != null) {
    where.totalInventory = {
      ...(typeof where.totalInventory === 'object' ? where.totalInventory : {}),
      ...(stockCompare === 'below' ? { lt: stockQty } : { gt: stockQty }),
    };
  }

  return where;
}

function buildFieldCondition(field: string, token: string): Prisma.ProductWhereInput {
  switch (field) {
    case 'title':
      return { title: { contains: token, mode: 'insensitive' } };
    case 'vendor':
    case 'supplier':
      return { vendor: { contains: token, mode: 'insensitive' } };
    case 'category':
      return { category: { contains: token, mode: 'insensitive' } };
    case 'type':
      return { productType: { contains: token, mode: 'insensitive' } };
    case 'tag':
      return { tags: { hasSome: [token] } };
    default:
      return {};
  }
}

function buildAnyFieldCondition(token: string): Prisma.ProductWhereInput {
  return {
    OR: [
      { title: { contains: token, mode: 'insensitive' } },
      { vendor: { contains: token, mode: 'insensitive' } },
      { category: { contains: token, mode: 'insensitive' } },
      { productType: { contains: token, mode: 'insensitive' } },
      { tags: { hasSome: [token] } },
    ],
  };
}

function buildOrderBy(sort: string, dir: 'asc' | 'desc'): Prisma.ProductOrderByWithRelationInput {
  if (!SORTABLE_FIELDS.has(sort)) return { title: 'asc' };
  if (sort === 'store') return { store: { name: dir } };
  return { [sort]: dir } as Prisma.ProductOrderByWithRelationInput;
}

type ProductWithStore = Prisma.ProductGetPayload<{ include: { store: { select: { id: true; name: true; storeDomain: true } } } }>;

function serializeProduct(product: ProductWithStore) {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    vendor: product.vendor,
    productType: product.productType,
    category: product.category,
    status: product.status,
    tags: product.tags,
    imageUrl: product.imageUrl,
    onlineStoreUrl: product.onlineStoreUrl,
    salesChannels: Array.isArray(product.salesChannels) ? (product.salesChannels as Array<{ id: string; name: string }>) : [],
    totalInventory: product.totalInventory,
    soldQuantity: product.soldQuantity,
    soldAmount: Number(product.soldAmount),
    store: { id: product.store.id, name: product.store.name ?? product.store.storeDomain },
    shopifyUpdatedAt: product.shopifyUpdatedAt?.toISOString() ?? null,
    updatedAt: product.updatedAt.toISOString(),
  };
}

type ProductDetailPayload = Prisma.ProductGetPayload<{
  include: {
    store: { select: { id: true; name: true; storeDomain: true } };
    variants: true;
  };
}>;

function serializeProductDetail(product: ProductDetailPayload) {
  return {
    id: product.id,
    storeId: product.storeId,
    shopifyId: product.shopifyId,
    title: product.title,
    handle: product.handle,
    vendor: product.vendor,
    productType: product.productType,
    category: product.category,
    categoryId: product.categoryId,
    status: product.status,
    tags: product.tags,
    imageUrl: product.imageUrl,
    descriptionHtml: product.descriptionHtml,
    images: Array.isArray(product.images) ? (product.images as Array<{ id: string; url: string; altText: string | null }>) : [],
    onlineStoreUrl: product.onlineStoreUrl,
    salesChannels: Array.isArray(product.salesChannels) ? (product.salesChannels as Array<{ id: string; name: string }>) : [],
    totalInventory: product.totalInventory,
    store: { id: product.store.id, name: product.store.name ?? product.store.storeDomain, storeDomain: product.store.storeDomain },
    variants: product.variants.map(serializeVariantDetail),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function serializeVariantDetail(variant: ProductDetailPayload['variants'][number]) {
  return {
    id: variant.id,
    shopifyId: variant.shopifyId,
    title: variant.title,
    sku: variant.sku,
    price: Number(variant.price),
    cost: variant.cost != null ? Number(variant.cost) : null,
    inventoryItemId: variant.inventoryItemId,
    inventoryQuantity: variant.inventoryQuantity,
    inventoryTracked: variant.inventoryTracked,
    inventoryPolicy: variant.inventoryPolicy,
    imageUrl: variant.imageUrl,
    optionValues: Array.isArray(variant.optionValues) ? (variant.optionValues as Array<{ name: string; value: string }>) : [],
    position: variant.position,
    soldQuantity: variant.soldQuantity,
  };
}
