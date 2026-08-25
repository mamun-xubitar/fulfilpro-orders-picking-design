import prisma from '@/lib/prisma.server';
import { Prisma, SupplierProductStatus } from '@prisma/client';

export type ColourOptionData = { name: string; hex: string };

export type SupplierProductVariantRow = {
  id: string;
  sku: string | null;
  barcode: string | null;
  colour: string;
  size: string;
  stockOnHand: number;
  buyPrice: number;
  sellPrice: number;
  trigger: number;
  allocated: number;
  incoming: number;
  forwardOrders: number;
};

export type SupplierProductImageRow = { id: string; url: string; altText: string | null; colour: string | null };

export type SupplierProductPricingRow = {
  currencyCode: string;
  exchangeRate: number;
  buyingPrice: number;
  freight: number;
  misc: number;
  marginPercent: number;
  tax: number;
};

export type SupplierProductActivityRow = { id: string; at: string; actor: string; message: string };

export type SupplierProductRow = {
  id: string;
  itemNo: string;
  brand: string;
  name: string;
  category: string;
  categoryId: string | null;
  sku: string;
  description: string;
  deliveryRemarks: string;
  status: SupplierProductStatus;
  verified: boolean;
  createdAt: string;
  images: SupplierProductImageRow[];
  sizes: string[];
  colours: ColourOptionData[];
  variants: SupplierProductVariantRow[];
  pricing: SupplierProductPricingRow;
  /** Always empty this pass — the hub has no Shopify store link yet. */
  stores: [];
  stocktake: { lastAt: string | null; nextAt: string | null };
  adjustments: { lastAt: string | null; thisMonth: number };
  activity: SupplierProductActivityRow[];
};

const EMPTY_PRICING: SupplierProductPricingRow = {
  currencyCode: 'AUD',
  exchangeRate: 1,
  buyingPrice: 0,
  freight: 0,
  misc: 0,
  marginPercent: 0,
  tax: 0,
};

const OPEN_PO_STATUSES = ['REQUESTED', 'CONFIRMED', 'PARTIALLY_RECEIVED'] as const;

const catalogueInclude = {
  variants: { orderBy: { position: 'asc' as const } },
  images: { orderBy: { position: 'asc' as const } },
  pricing: true,
  stocktakes: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  activity: { orderBy: { createdAt: 'desc' as const }, take: 30 },
};

type CatalogueRow = Prisma.SupplierProductGetPayload<{ include: typeof catalogueInclude }>;

export class SupplierProductModel {
  /** Loads the whole catalogue for the page's single fetch-on-mount — newest first. */
  async listAll(): Promise<SupplierProductRow[]> {
    const rows = await prisma.supplierProduct.findMany({
      include: catalogueInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.hydrate(rows);
  }

  async findById(id: string): Promise<SupplierProductRow | null> {
    const row = await prisma.supplierProduct.findUnique({ where: { id }, include: catalogueInclude });
    if (!row) return null;
    const [hydrated] = await this.hydrate([row]);
    return hydrated;
  }

  async exists(id: string): Promise<boolean> {
    const row = await prisma.supplierProduct.findUnique({ where: { id }, select: { id: true } });
    return !!row;
  }

  async create(data: {
    supplierId: string;
    itemNo: string;
    name: string;
    brand: string | null;
    marginPercent: number;
  }): Promise<string> {
    const row = await prisma.supplierProduct.create({
      data: {
        supplierId: data.supplierId,
        itemNo: data.itemNo,
        name: data.name,
        brand: data.brand,
        sku: data.itemNo,
        status: 'DRAFT',
        pricing: { create: { currencyCode: 'AUD', exchangeRate: 1, marginPercent: data.marginPercent } },
      },
    });
    await prisma.inventoryActivity.create({
      data: { supplierProductId: row.id, type: 'created', message: `Product "${data.name}" created`, actorName: 'System' },
    });
    return row.id;
  }

  async updateDetails(
    id: string,
    data: Partial<{
      itemNo: string;
      brand: string;
      name: string;
      category: string;
      categoryId: string | null;
      sku: string;
      description: string;
      deliveryRemarks: string;
      status: SupplierProductStatus;
      verified: boolean;
      sizes: string[];
      colours: ColourOptionData[];
    }>
  ): Promise<void> {
    const current = await prisma.supplierProduct.findUnique({ where: { id }, select: { supplierId: true, sizes: true, colours: true } });
    if (!current) throw new Error('Product not found');

    await prisma.supplierProduct.update({
      where: { id },
      data: {
        ...(data.itemNo !== undefined ? { itemNo: data.itemNo } : {}),
        ...(data.brand !== undefined ? { brand: data.brand } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.deliveryRemarks !== undefined ? { deliveryRemarks: data.deliveryRemarks } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.verified !== undefined ? { verified: data.verified } : {}),
        ...(data.sizes !== undefined ? { sizes: data.sizes } : {}),
        ...(data.colours !== undefined ? { colours: data.colours as unknown as Prisma.InputJsonValue } : {}),
      },
    });

    if (data.sizes !== undefined || data.colours !== undefined) {
      await this.reconcileVariants(id, data.sizes ?? (current.sizes as string[]), (data.colours ?? (current.colours as unknown as ColourOptionData[])).map((c) => c.name));
    }
  }

  /**
   * Ensures every colour × size combo has a variant row, and removes rows whose combo is no
   * longer in the saved sizes/colours lists (so the matrix always matches Product Details).
   */
  private async reconcileVariants(supplierProductId: string, sizes: string[], colours: string[]) {
    if (sizes.length === 0 || colours.length === 0) return;
    const existing = await prisma.supplierProductVariant.findMany({ where: { supplierProductId }, select: { id: true, colour: true, size: true } });
    const existingKeys = new Set(existing.map((v) => `${v.colour.toLowerCase()}::${v.size}`));
    const lowStockThreshold = (await prisma.appSettings.findUnique({ where: { id: 'default' }, select: { lowStockThreshold: true } }))
      ?.lowStockThreshold ?? 10;

    const toCreate: Prisma.SupplierProductVariantCreateManyInput[] = [];
    let position = existing.length;
    for (const colour of colours) {
      for (const size of sizes) {
        const key = `${colour.toLowerCase()}::${size}`;
        if (existingKeys.has(key)) continue;
        toCreate.push({ supplierProductId, colour, size, trigger: lowStockThreshold, position: position++ });
        existingKeys.add(key);
      }
    }
    if (toCreate.length > 0) await prisma.supplierProductVariant.createMany({ data: toCreate });

    const validKeys = new Set(colours.flatMap((colour) => sizes.map((size) => `${colour.toLowerCase()}::${size}`)));
    const staleIds = existing.filter((v) => !validKeys.has(`${v.colour.toLowerCase()}::${v.size}`)).map((v) => v.id);
    if (staleIds.length > 0) await prisma.supplierProductVariant.deleteMany({ where: { supplierProductId, id: { in: staleIds } } });
  }

  async upsertPricing(id: string, data: SupplierProductPricingRow): Promise<void> {
    await prisma.supplierProductPricing.upsert({
      where: { supplierProductId: id },
      update: data,
      create: { supplierProductId: id, ...data },
    });
  }

  async updateVariant(
    variantId: string,
    data: Partial<{ sku: string | null; barcode: string | null; colour: string; size: string; stockOnHand: number; buyPrice: number; sellPrice: number; trigger: number; forwardOrders: number }>
  ): Promise<void> {
    try {
      await prisma.supplierProductVariant.update({ where: { id: variantId }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('This colour/size combination already exists on this product');
      }
      throw error;
    }
  }

  async deleteVariant(supplierProductId: string, variantId: string): Promise<boolean> {
    const result = await prisma.supplierProductVariant.deleteMany({ where: { id: variantId, supplierProductId } });
    return result.count > 0;
  }

  async applyPriceToColours(supplierProductId: string, colours: string[], sellPrice: number, buyPrice: number): Promise<number> {
    const result = await prisma.supplierProductVariant.updateMany({
      where: { supplierProductId, colour: { in: colours } },
      data: { sellPrice, buyPrice },
    });
    return result.count;
  }

  async addImage(supplierProductId: string, data: { url: string; altText: string | null; colour: string | null }): Promise<void> {
    const position = await prisma.supplierProductImage.count({ where: { supplierProductId } });
    await prisma.supplierProductImage.create({ data: { supplierProductId, ...data, position } });
  }

  async addImages(supplierProductId: string, images: { url: string; altText: string | null; colour: string | null }[]): Promise<void> {
    let position = await prisma.supplierProductImage.count({ where: { supplierProductId } });
    await prisma.supplierProductImage.createMany({
      data: images.map((image) => ({ supplierProductId, ...image, position: position++ })),
    });
  }

  async removeImage(supplierProductId: string, imageId: string): Promise<boolean> {
    const result = await prisma.supplierProductImage.deleteMany({ where: { id: imageId, supplierProductId } });
    return result.count > 0;
  }

  async updateImageColour(supplierProductId: string, imageId: string, colour: string | null): Promise<boolean> {
    const result = await prisma.supplierProductImage.updateMany({ where: { id: imageId, supplierProductId }, data: { colour } });
    return result.count > 0;
  }

  async logActivity(supplierProductId: string, message: string, type: string, actor: { id?: string | null; name: string }, variantId?: string): Promise<void> {
    await prisma.inventoryActivity.create({
      data: { supplierProductId, variantId, type, message, actorId: actor.id ?? null, actorName: actor.name },
    });
  }

  private async hydrate(rows: CatalogueRow[]): Promise<SupplierProductRow[]> {
    const variantIds = rows.flatMap((r) => r.variants.map((v) => v.id));
    const productIds = rows.map((r) => r.id);
    const skus = rows.flatMap((r) => r.variants.map((v) => v.sku).filter((s): s is string => !!s));

    const [incomingRows, adjustmentCounts, allocatedRows] = await Promise.all([
      variantIds.length
        ? prisma.purchaseOrderItem.groupBy({
            by: ['variantId'],
            where: { variantId: { in: variantIds }, purchaseOrder: { status: { in: [...OPEN_PO_STATUSES] } } },
            _sum: { quantity: true, receivedQuantity: true },
          })
        : Promise.resolve([]),
      productIds.length
        ? prisma.stockAdjustment.groupBy({
            by: ['supplierProductId'],
            where: { supplierProductId: { in: productIds }, createdAt: { gte: startOfMonth() } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      // "Allocated" = committed to orders that haven't shipped yet. There's no FK from
      // OrderLineItem to SupplierProductVariant, so this joins on SKU string equality —
      // the only link available (mirrors buildFulfillmentStatusConditions' "still owed" bucket).
      skus.length
        ? prisma.orderLineItem.groupBy({
            by: ['sku'],
            where: {
              sku: { in: skus },
              order: {
                canceled: false,
                closed: false,
                OR: [{ fulfillmentStatus: null }, { fulfillmentStatus: { in: ['unfulfilled', 'pending', '', 'partial', 'partially_fulfilled'] } }],
              },
            },
            _sum: { netQuantity: true },
          })
        : Promise.resolve([]),
    ]);

    const incomingByVariant = new Map(incomingRows.map((r) => [r.variantId!, (r._sum.quantity ?? 0) - (r._sum.receivedQuantity ?? 0)]));
    const adjustmentCountByProduct = new Map(adjustmentCounts.map((r) => [r.supplierProductId, r._count.id]));
    const allocatedBySku = new Map(allocatedRows.map((r) => [r.sku!, r._sum.netQuantity ?? 0]));

    const lastAdjustmentRows = productIds.length
      ? await prisma.stockAdjustment.findMany({
          where: { supplierProductId: { in: productIds } },
          distinct: ['supplierProductId'],
          orderBy: { createdAt: 'desc' },
          select: { supplierProductId: true, createdAt: true },
        })
      : [];
    const lastAdjustmentByProduct = new Map(lastAdjustmentRows.map((r) => [r.supplierProductId, r.createdAt.toISOString()]));

    return rows.map((row) => ({
      id: row.id,
      itemNo: row.itemNo,
      brand: row.brand ?? '',
      name: row.name,
      category: row.category ?? '',
      categoryId: row.categoryId,
      sku: row.sku,
      description: row.description ?? '',
      deliveryRemarks: row.deliveryRemarks ?? '',
      status: row.status,
      verified: row.verified,
      createdAt: row.createdAt.toISOString(),
      images: row.images.map((i) => ({ id: i.id, url: i.url, altText: i.altText, colour: i.colour })),
      sizes: row.sizes,
      colours: (row.colours as unknown as ColourOptionData[]) ?? [],
      variants: row.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        colour: v.colour,
        size: v.size,
        stockOnHand: v.stockOnHand,
        buyPrice: Number(v.buyPrice),
        sellPrice: Number(v.sellPrice),
        trigger: v.trigger,
        allocated: v.sku ? allocatedBySku.get(v.sku) ?? 0 : 0,
        incoming: incomingByVariant.get(v.id) ?? 0,
        forwardOrders: v.forwardOrders,
      })),
      pricing: row.pricing
        ? {
            currencyCode: row.pricing.currencyCode,
            exchangeRate: Number(row.pricing.exchangeRate),
            buyingPrice: Number(row.pricing.buyingPrice),
            freight: Number(row.pricing.freight),
            misc: Number(row.pricing.misc),
            marginPercent: Number(row.pricing.marginPercent),
            tax: Number(row.pricing.tax),
          }
        : EMPTY_PRICING,
      stores: [],
      stocktake: {
        lastAt: row.stocktakes[0]?.completedAt?.toISOString() ?? null,
        nextAt: row.nextStocktakeAt?.toISOString() ?? null,
      },
      adjustments: {
        lastAt: lastAdjustmentByProduct.get(row.id) ?? null,
        thisMonth: adjustmentCountByProduct.get(row.id) ?? 0,
      },
      activity: row.activity.map((a) => ({ id: a.id, at: a.createdAt.toISOString(), actor: a.actorName, message: a.message })),
    }));
  }
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
