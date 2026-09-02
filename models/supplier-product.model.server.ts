import prisma from '@/lib/prisma.server';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { Prisma, SupplierProductStatus } from '@prisma/client';

export type ColourOptionData = { name: string; color: string };

export type IncomingLotRow = { quantity: number; date: string | null };

export type SupplierProductVariantRow = {
  id: string;
  sku: string | null;
  barcode: string | null;
  colour: string;
  size: string;
  stockOnHand: number;
  /** Weighted average of unitCost across received PurchaseOrderItems; falls back to the stored column when nothing has been received. */
  buyPrice: number;
  sellPrice: number;
  trigger: number;
  /** Stored, manually-editable — wins over allocatedFromOrders. */
  allocated: number;
  /** Order-derived hint only, shown as a tooltip next to the editable Allocated cell. */
  allocatedFromOrders: number;
  /** Sum of incomingLots — kept for the stock summary / totals row. */
  incoming: number;
  /** One entry per open PO with unreceived quantity, oldest delivery date first. */
  incomingLots: IncomingLotRow[];
  /** One image from the product's pool, Shopify-style. Several variants may point at the same image. */
  imageId: string | null;
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

export type ProductsSortKey = 'name' | 'brand' | 'category' | 'sku' | 'status' | 'variants' | 'stock' | 'stockValue' | 'createdAt';

/** The four price-shortcut buttons — matched against a variant's effective (weighted-average
 * received cost, falling back to the stored buyPrice) buy price and its sell price. */
export type QuickFilterId = 'buying-lt-1' | 'profit-lt-5' | 'selling-lt-1' | 'selling-lt-5';

export type CatalogueListParams = {
  page: number;
  pageSize: number;
  search?: string;
  verified?: boolean;
  status?: SupplierProductStatus;
  supplierName?: string;
  quickFilter?: QuickFilterId | null;
  sort?: ProductsSortKey;
  dir?: 'asc' | 'desc';
};

export type CatalogueListResult = {
  products: SupplierProductRow[];
  total: number;
};

export type SupplierProductRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  itemNo: string;
  /** Unique URL-safe slug — Shopify's product Handle equivalent. */
  handle: string;
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
  stocktake: { lastAt: string | null; nextAt: string | null };
  adjustments: { lastAt: string | null; thisMonth: number };
  activity: SupplierProductActivityRow[];
};

const EMPTY_PRICING: SupplierProductPricingRow = {
  currencyCode: 'USD',
  exchangeRate: 1,
  buyingPrice: 0,
  freight: 0,
  misc: 0,
  marginPercent: 0,
  tax: 10,
};

const OPEN_PO_STATUSES = ['REQUESTED', 'CONFIRMED', 'PARTIALLY_RECEIVED'] as const;

const catalogueInclude = {
  supplier: { select: { id: true, name: true } },
  variants: { orderBy: { position: 'asc' as const } },
  images: { orderBy: { position: 'asc' as const } },
  pricing: true,
  stocktakes: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  activity: { orderBy: { createdAt: 'desc' as const }, take: 30 },
};

type CatalogueRow = Prisma.SupplierProductGetPayload<{ include: typeof catalogueInclude }>;

export class SupplierProductModel {
  /** Server-side filtered/sorted/paginated catalogue page. Every filter — verified, quick
   * filter, status, supplier, search — and the sort/page decision happens in SQL; the caller
   * never receives more than one page. */
  async list(params: CatalogueListParams): Promise<CatalogueListResult> {
    const whereSql = buildCatalogueWhereSql(params);
    const orderSql = buildCatalogueOrderSql(params.sort ?? 'createdAt', params.dir ?? 'desc');
    const skip = (params.page - 1) * params.pageSize;

    const rows = await prisma.$queryRaw<{ total: number; ids: string[] }[]>(Prisma.sql`
      ${CATALOGUE_CTE_SQL},
      filtered AS (${buildCatalogueFilteredSql(whereSql)})
      SELECT
        (SELECT COUNT(*)::integer FROM filtered) AS total,
        COALESCE(
          (SELECT array_agg(id) FROM (SELECT id FROM filtered ORDER BY ${orderSql} OFFSET ${skip} LIMIT ${params.pageSize}) paged),
          ARRAY[]::text[]
        ) AS ids
    `);

    const { total, ids } = rows[0] ?? { total: 0, ids: [] };
    if (ids.length === 0) return { products: [], total };

    const catalogueRows = await prisma.supplierProduct.findMany({ where: { id: { in: ids } }, include: catalogueInclude });
    const hydrated = await this.hydrate(catalogueRows);
    const byId = new Map(hydrated.map((p) => [p.id, p]));
    return { products: ids.map((id) => byId.get(id)!).filter(Boolean), total };
  }

  /** Every id matching the current filters, in the same order `list()` would page through them —
   * for "select all matching filters" bulk actions. No row hydration, no limit. */
  async listIds(params: Omit<CatalogueListParams, 'page' | 'pageSize'>): Promise<string[]> {
    const whereSql = buildCatalogueWhereSql(params);
    const orderSql = buildCatalogueOrderSql(params.sort ?? 'createdAt', params.dir ?? 'desc');
    const rows = await prisma.$queryRaw<{ ids: string[] }[]>(Prisma.sql`
      ${CATALOGUE_CTE_SQL},
      filtered AS (${buildCatalogueFilteredSql(whereSql)})
      SELECT COALESCE((SELECT array_agg(id ORDER BY ${orderSql}) FROM filtered), ARRAY[]::text[]) AS ids
    `);
    return rows[0]?.ids ?? [];
  }

  /** 1-indexed position of `id` within the given filter set (detail-mode ordering is always
   * createdAt desc), plus the total row count under that filter set. Null when `id` doesn't
   * match the filters at all. */
  async findPosition(id: string, params: Pick<CatalogueListParams, 'verified'>): Promise<{ position: number; total: number } | null> {
    const whereSql = buildCatalogueWhereSql(params);
    const orderSql = buildCatalogueOrderSql('createdAt', 'desc');
    const rows = await prisma.$queryRaw<{ position: number; total: number }[]>(Prisma.sql`
      ${CATALOGUE_CTE_SQL},
      filtered AS (${buildCatalogueFilteredSql(whereSql)}),
      ranked AS (
        SELECT id, row_number() OVER (ORDER BY ${orderSql}) AS position, COUNT(*) OVER () AS total
        FROM filtered
      )
      SELECT position::integer, total::integer FROM ranked WHERE id = ${id}
    `);
    return rows[0] ?? null;
  }

  /** Distinct supplier names among products — for the products table's supplier filter dropdown. */
  async listSupplierNames(): Promise<string[]> {
    const rows = await prisma.supplierProduct.findMany({
      select: { supplier: { select: { name: true } } },
      distinct: ['supplierId'],
    });
    return [...new Set(rows.map((r) => r.supplier.name))].sort();
  }

  /** Whole-catalogue count, ignoring every filter — the "of Y" half of the record stepper. */
  async countAll(): Promise<number> {
    return prisma.supplierProduct.count();
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

  /** Lightweight lookup for callers that only need the handle (e.g. the store-listings lookup) —
   * avoids the full hydrate() pass that findById() does. */
  async findHandle(id: string): Promise<string | null> {
    const row = await prisma.supplierProduct.findUnique({ where: { id }, select: { handle: true } });
    return row?.handle ?? null;
  }

  async create(data: {
    supplierId: string;
    itemNo: string;
    handle: string;
    name: string;
    brand: string | null;
    marginPercent: number;
    exchangeRate: number;
    actor?: { id?: string | null; name: string };
  }): Promise<string> {
    const row = await prisma.supplierProduct.create({
      data: {
        supplierId: data.supplierId,
        itemNo: data.itemNo,
        handle: data.handle,
        name: data.name,
        brand: data.brand,
        sku: data.itemNo,
        status: 'DRAFT',
        pricing: { create: { currencyCode: 'USD', exchangeRate: data.exchangeRate, marginPercent: data.marginPercent } },
      },
    });
    await prisma.inventoryActivity.create({
      data: {
        supplierProductId: row.id,
        type: 'created',
        message: `Product "${data.name}" created`,
        actorId: data.actor?.id ?? null,
        actorName: data.actor?.name ?? 'System',
      },
    });
    return row.id;
  }

  async updateDetails(
    id: string,
    data: Partial<{
      itemNo: string;
      handle: string;
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

    if (data.colours !== undefined) {
      await this.applyColourRenames(id, normalizeColours(current.colours), data.colours);
    }
    if (data.sizes !== undefined) {
      await this.applySizeRenames(id, current.sizes as string[], data.sizes);
    }

    await prisma.supplierProduct.update({
      where: { id },
      data: {
        ...(data.itemNo !== undefined ? { itemNo: data.itemNo } : {}),
        ...(data.handle !== undefined ? { handle: data.handle } : {}),
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
      await this.reconcileVariants(id, data.sizes ?? (current.sizes as string[]), (data.colours ?? normalizeColours(current.colours)).map((c) => c.name));
    }
  }

  /**
   * A colour that only changed casing (e.g. "orange" -> "Orange") is a rename, not a
   * remove+add — update the matching variant/image rows in place so reconcileVariants sees
   * them as already current instead of deleting and recreating them. A colour genuinely no
   * longer in the list clears its tag from any image that still carries it, rather than
   * leaving the image pointing at a colour that no longer exists.
   */
  private async applyColourRenames(supplierProductId: string, oldColours: ColourOptionData[], newColours: ColourOptionData[]) {
    const oldByLower = new Map(oldColours.map((c) => [c.name.toLowerCase(), c.name]));
    const newByLower = new Map(newColours.map((c) => [c.name.toLowerCase(), c.name]));

    for (const [lower, oldName] of oldByLower) {
      const newName = newByLower.get(lower);
      if (newName !== undefined) {
        if (newName !== oldName) {
          await prisma.supplierProductVariant.updateMany({
            where: { supplierProductId, colour: { equals: oldName, mode: 'insensitive' } },
            data: { colour: newName },
          });
          await prisma.supplierProductImage.updateMany({
            where: { supplierProductId, colour: { equals: oldName, mode: 'insensitive' } },
            data: { colour: newName },
          });
        }
      } else {
        await prisma.supplierProductImage.updateMany({
          where: { supplierProductId, colour: { equals: oldName, mode: 'insensitive' } },
          data: { colour: null },
        });
      }
    }
  }

  /** Mirrors applyColourRenames for sizes — a casing-only change updates matching variant rows
   * in place instead of deleting and recreating them. Sizes don't tag images, so no image step. */
  private async applySizeRenames(supplierProductId: string, oldSizes: string[], newSizes: string[]) {
    const oldByLower = new Map(oldSizes.map((s) => [s.toLowerCase(), s]));
    const newByLower = new Map(newSizes.map((s) => [s.toLowerCase(), s]));

    for (const [lower, oldSize] of oldByLower) {
      const newSize = newByLower.get(lower);
      if (newSize !== undefined && newSize !== oldSize) {
        await prisma.supplierProductVariant.updateMany({
          where: { supplierProductId, size: { equals: oldSize, mode: 'insensitive' } },
          data: { size: newSize },
        });
      }
    }
  }

  /**
   * Ensures every colour x size combo has a variant row, and removes rows whose combo is no
   * longer in the saved sizes/colours lists (so the matrix always matches Product Details).
   * A missing axis (no sizes, or no colours) is represented by the empty-string sentinel '' on
   * that axis instead of skipping variant generation entirely, so a colour-only or size-only
   * product still gets one variant per declared value on its one axis.
   */
  private async reconcileVariants(supplierProductId: string, sizes: string[], colours: string[]) {
    if (sizes.length === 0 && colours.length === 0) return;
    const colourAxis = colours.length > 0 ? colours : [''];
    const sizeAxis = sizes.length > 0 ? sizes : [''];

    const existing = await prisma.supplierProductVariant.findMany({ where: { supplierProductId }, select: { id: true, colour: true, size: true } });
    await this.promoteSentinelAxis(existing, 'size', sizes);
    await this.promoteSentinelAxis(existing, 'colour', colours);

    const existingKeys = new Set(existing.map((v) => `${v.colour.toLowerCase()}::${v.size}`));
    const lowStockThreshold = (await prisma.appSettings.findUnique({ where: { id: 'default' }, select: { lowStockThreshold: true } }))
      ?.lowStockThreshold ?? 10;

    const toCreate: Prisma.SupplierProductVariantCreateManyInput[] = [];
    let position = existing.length;
    for (const colour of colourAxis) {
      for (const size of sizeAxis) {
        const key = `${colour.toLowerCase()}::${size}`;
        if (existingKeys.has(key)) continue;
        toCreate.push({ supplierProductId, colour, size, trigger: lowStockThreshold, position: position++ });
        existingKeys.add(key);
      }
    }
    if (toCreate.length > 0) await prisma.supplierProductVariant.createMany({ data: toCreate });

    const validKeys = new Set(colourAxis.flatMap((colour) => sizeAxis.map((size) => `${colour.toLowerCase()}::${size}`)));
    const staleIds = existing.filter((v) => !validKeys.has(`${v.colour.toLowerCase()}::${v.size}`)).map((v) => v.id);
    if (staleIds.length > 0) await prisma.supplierProductVariant.deleteMany({ where: { supplierProductId, id: { in: staleIds } } });
  }

  /**
   * Promotes variant rows still on the '' sentinel for the given axis to the first declared
   * value on that axis, in place — so stock/pricing on a colour-only (or size-only) product
   * survives the moment its first size (or colour) is added, instead of the sentinel row being
   * deleted and a fresh zero-stock row created in its place. Mutates `existing` in place so the
   * caller's key sets reflect the promotion. No-ops when the axis has nothing declared yet, or
   * a real row already occupies the promoted row's target combo (the stale-row pass then drops
   * the now-redundant sentinel).
   */
  private async promoteSentinelAxis(
    existing: { id: string; colour: string; size: string }[],
    axis: 'colour' | 'size',
    values: string[]
  ): Promise<void> {
    if (values.length === 0) return;
    const target = values[0];
    const key = (v: { colour: string; size: string }) => `${v.colour.toLowerCase()}::${v.size}`;
    const takenKeys = new Set(existing.filter((v) => v[axis] !== '').map(key));

    for (const v of existing) {
      if (v[axis] !== '') continue;
      const promoted = axis === 'colour' ? { colour: target, size: v.size } : { colour: v.colour, size: target };
      const promotedKey = key(promoted);
      if (takenKeys.has(promotedKey)) continue; // a real row already occupies the target — the stale-row pass drops this sentinel
      await prisma.supplierProductVariant.update({ where: { id: v.id }, data: { [axis]: target } });
      v[axis] = target;
      takenKeys.add(promotedKey);
    }
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
    data: Partial<{ sku: string | null; barcode: string | null; colour: string; size: string; stockOnHand: number; buyPrice: number; sellPrice: number; trigger: number; allocated: number }>
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

  /**
   * Deletes one variant, then prunes any colour/size from the product's declared lists that no
   * remaining variant uses — otherwise the next Product Details save would re-create the row
   * just deleted (reconcileVariants treats every declared colour x size as required). Images
   * tagged with a pruned colour are untagged (mirrors applyColourRenames' removal branch)
   * rather than left pointing at a colour that no longer exists anywhere on the product.
   */
  async deleteVariant(supplierProductId: string, variantId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const result = await tx.supplierProductVariant.deleteMany({ where: { id: variantId, supplierProductId } });
      if (result.count === 0) return false;

      const product = await tx.supplierProduct.findUnique({ where: { id: supplierProductId }, select: { sizes: true, colours: true } });
      if (!product) return true;

      const remaining = await tx.supplierProductVariant.findMany({ where: { supplierProductId }, select: { colour: true, size: true } });
      const usedColours = new Set(remaining.map((v) => v.colour.toLowerCase()).filter(Boolean));
      const usedSizes = new Set(remaining.map((v) => v.size.toLowerCase()).filter(Boolean));

      const currentColours = normalizeColours(product.colours);
      const currentSizes = product.sizes as string[];
      const nextColours = currentColours.filter((c) => usedColours.has(c.name.toLowerCase()));
      const nextSizes = currentSizes.filter((s) => usedSizes.has(s.toLowerCase()));
      const prunedColours = currentColours.filter((c) => !usedColours.has(c.name.toLowerCase()));

      if (nextColours.length !== currentColours.length || nextSizes.length !== currentSizes.length) {
        await tx.supplierProduct.update({
          where: { id: supplierProductId },
          data: {
            ...(nextColours.length !== currentColours.length ? { colours: nextColours as unknown as Prisma.InputJsonValue } : {}),
            ...(nextSizes.length !== currentSizes.length ? { sizes: nextSizes } : {}),
          },
        });
      }
      for (const colour of prunedColours) {
        await tx.supplierProductImage.updateMany({
          where: { supplierProductId, colour: { equals: colour.name, mode: 'insensitive' } },
          data: { colour: null },
        });
      }

      return true;
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await prisma.supplierProduct.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async deleteMany(ids: string[]): Promise<number> {
    const result = await prisma.supplierProduct.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }

  async setStatusMany(ids: string[], status: SupplierProductStatus): Promise<number> {
    const result = await prisma.supplierProduct.updateMany({ where: { id: { in: ids } }, data: { status } });
    return result.count;
  }

  async setVerifiedMany(ids: string[], verified: boolean): Promise<number> {
    const result = await prisma.supplierProduct.updateMany({ where: { id: { in: ids } }, data: { verified } });
    return result.count;
  }

  /** `colours: null` means "every variant of this product" — no colour filter at all. Pass an
   * array only when the caller is explicitly scoping the update to a set of colourways. */
  async applyPriceToColours(supplierProductId: string, colours: string[] | null, sellPrice: number, buyPrice: number): Promise<number> {
    const result = await prisma.supplierProductVariant.updateMany({
      where: { supplierProductId, ...(colours ? { colour: { in: colours } } : {}) },
      data: { sellPrice, buyPrice },
    });
    return result.count;
  }

  async addImage(supplierProductId: string, data: { url: string; altText: string | null; colour: string | null }): Promise<void> {
    const position = await prisma.supplierProductImage.count({ where: { supplierProductId } });
    await prisma.supplierProductImage.create({ data: { supplierProductId, ...data, position } });
  }

  /** Returns the created rows (id + url) so a caller can link them to variants — e.g. the first
   * one to a variant after an upload, or a whole CSV import's `Variant Image` URLs by lookup. */
  async addImages(
    supplierProductId: string,
    images: { url: string; altText: string | null; colour: string | null }[]
  ): Promise<{ id: string; url: string }[]> {
    let position = await prisma.supplierProductImage.count({ where: { supplierProductId } });
    return prisma.supplierProductImage.createManyAndReturn({
      data: images.map((image) => ({ supplierProductId, ...image, position: position++ })),
      select: { id: true, url: true },
    });
  }

  /** Links a variant to one image from the product's own pool, or unlinks when imageId is null.
   * Rejects an imageId that belongs to a different product's pool. */
  async setVariantImage(supplierProductId: string, variantId: string, imageId: string | null): Promise<boolean> {
    if (imageId !== null) {
      const image = await prisma.supplierProductImage.findUnique({ where: { id: imageId }, select: { supplierProductId: true } });
      if (!image || image.supplierProductId !== supplierProductId) throw new Error('Image not found on this product');
    }
    const result = await prisma.supplierProductVariant.updateMany({ where: { id: variantId, supplierProductId }, data: { imageId } });
    return result.count > 0;
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

    const [incomingItems, receivedCostItems, adjustmentCounts, allocatedRows] = await Promise.all([
      // One row per open PO line, kept ungrouped so each PO's own quantity/date survives
      // into the Incoming column instead of being folded into a single total.
      variantIds.length
        ? prisma.purchaseOrderItem.findMany({
            where: { variantId: { in: variantIds }, purchaseOrder: { status: { in: [...OPEN_PO_STATUSES] } } },
            select: { variantId: true, quantity: true, receivedQuantity: true, purchaseOrder: { select: { deliveryDate: true } } },
          })
        : Promise.resolve([]),
      // Weighted average buy price = Σ(unitCost × receivedQuantity) / Σ(receivedQuantity), over every
      // PO line that has actually been received (any status — a partially-received PO still counts).
      variantIds.length
        ? prisma.purchaseOrderItem.findMany({
            where: { variantId: { in: variantIds }, receivedQuantity: { gt: 0 }, unitCost: { not: null } },
            select: { variantId: true, receivedQuantity: true, unitCost: true },
          })
        : Promise.resolve([]),
      productIds.length
        ? prisma.stockAdjustment.groupBy({
            by: ['supplierProductId'],
            where: { supplierProductId: { in: productIds }, createdAt: { gte: startOfMonth() } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      // "AllocatedFromOrders" = committed to orders that haven't shipped yet, shown as a hint next to
      // the now-editable Allocated cell. There's no FK from OrderLineItem to SupplierProductVariant,
      // so this joins on SKU string equality — the only link available (mirrors
      // buildFulfillmentStatusConditions' "still owed" bucket).
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

    const incomingLotsByVariant = new Map<string, IncomingLotRow[]>();
    for (const item of incomingItems) {
      const remaining = item.quantity - item.receivedQuantity;
      if (remaining <= 0) continue;
      const lots = incomingLotsByVariant.get(item.variantId!) ?? [];
      lots.push({ quantity: remaining, date: item.purchaseOrder.deliveryDate?.toISOString() ?? null });
      incomingLotsByVariant.set(item.variantId!, lots);
    }
    for (const lots of incomingLotsByVariant.values()) {
      lots.sort((a, b) => {
        if (a.date === b.date) return 0;
        if (a.date === null) return 1;
        if (b.date === null) return -1;
        return a.date.localeCompare(b.date);
      });
    }

    const buyPriceSumsByVariant = new Map<string, { totalCost: number; totalQty: number }>();
    for (const item of receivedCostItems) {
      const entry = buyPriceSumsByVariant.get(item.variantId!) ?? { totalCost: 0, totalQty: 0 };
      entry.totalCost += Number(item.unitCost) * item.receivedQuantity;
      entry.totalQty += item.receivedQuantity;
      buyPriceSumsByVariant.set(item.variantId!, entry);
    }

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
      supplierId: row.supplierId,
      supplierName: row.supplier?.name ?? '',
      itemNo: row.itemNo,
      handle: row.handle,
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
      colours: normalizeColours(row.colours),
      variants: row.variants.map((v) => {
        const incomingLots = incomingLotsByVariant.get(v.id) ?? [];
        const costs = buyPriceSumsByVariant.get(v.id);
        return {
          id: v.id,
          sku: v.sku,
          barcode: v.barcode,
          colour: v.colour,
          size: v.size,
          stockOnHand: v.stockOnHand,
          buyPrice: costs && costs.totalQty > 0 ? costs.totalCost / costs.totalQty : Number(v.buyPrice),
          sellPrice: Number(v.sellPrice),
          trigger: v.trigger,
          allocated: v.allocated,
          allocatedFromOrders: v.sku ? allocatedBySku.get(v.sku) ?? 0 : 0,
          incoming: incomingLots.reduce((sum, lot) => sum + lot.quantity, 0),
          incomingLots,
          imageId: v.imageId,
        };
      }),
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

/** Reads legacy `{name, hex}` rows (pre-redesign) as `{name, color}`, preserving the old hex
 * verbatim as `color` — still valid CSS — until the product's colours are next saved. */
function normalizeColours(raw: unknown): ColourOptionData[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const c = (entry ?? {}) as Record<string, unknown>;
    const name = String(c.name ?? '');
    const color = typeof c.color === 'string' && c.color ? c.color : typeof c.hex === 'string' && c.hex ? c.hex : deriveColorFromName(name);
    return { name, color };
  });
}

// — Server-driven catalogue list: SQL builders —

/** Common table expressions shared by list/listIds/findPosition: a weighted-average received
 * cost per variant (mirrors hydrate()'s buyPrice fallback), and a per-product rollup used for
 * sorting (variant count, total stock, stock value) and for the quick-filter EXISTS check. */
const CATALOGUE_CTE_SQL = Prisma.sql`
  WITH avg_cost AS (
    SELECT "variantId", SUM("unitCost" * "receivedQuantity") / NULLIF(SUM("receivedQuantity"), 0) AS wac
    FROM "PurchaseOrderItem"
    WHERE "receivedQuantity" > 0 AND "unitCost" IS NOT NULL
    GROUP BY "variantId"
  ),
  variant_eff AS (
    SELECT
      v.id,
      v."supplierProductId" AS pid,
      v."stockOnHand" AS stock,
      v."sellPrice" AS sell,
      COALESCE(a.wac, v."buyPrice") AS buy
    FROM "SupplierProductVariant" v
    LEFT JOIN avg_cost a ON a."variantId" = v.id
  ),
  product_agg AS (
    SELECT
      pid,
      COUNT(*) AS variant_count,
      SUM(stock) AS total_stock,
      SUM(stock * sell) AS stock_value
    FROM variant_eff
    GROUP BY pid
  )
`;

function buildLikePattern(value: string): string {
  const escaped = value.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

function quickFilterPredicateSql(quickFilter: QuickFilterId): Prisma.Sql {
  switch (quickFilter) {
    case 'buying-lt-1':
      return Prisma.sql`buy < 1`;
    case 'profit-lt-5':
      return Prisma.sql`(sell - buy) < 5`;
    case 'selling-lt-1':
      return Prisma.sql`sell < 1`;
    case 'selling-lt-5':
      return Prisma.sql`sell < 5`;
    default:
      return Prisma.sql`false`;
  }
}

function buildCatalogueWhereSql(params: {
  search?: string;
  verified?: boolean;
  status?: SupplierProductStatus;
  supplierName?: string;
  quickFilter?: QuickFilterId | null;
}): Prisma.Sql {
  const whereParts: Prisma.Sql[] = [Prisma.sql`1 = 1`];

  if (params.verified !== undefined) {
    whereParts.push(Prisma.sql`sp.verified = ${params.verified}`);
  }
  if (params.status) {
    whereParts.push(Prisma.sql`sp.status = ${params.status}::"SupplierProductStatus"`);
  }
  if (params.supplierName) {
    whereParts.push(Prisma.sql`su.name = ${params.supplierName}`);
  }

  const term = params.search?.trim();
  if (term) {
    const pattern = buildLikePattern(term);
    whereParts.push(Prisma.sql`(
      sp.name ILIKE ${pattern} ESCAPE '\\'
      OR sp.sku ILIKE ${pattern} ESCAPE '\\'
      OR sp."itemNo" ILIKE ${pattern} ESCAPE '\\'
      OR sp.handle ILIKE ${pattern} ESCAPE '\\'
      OR COALESCE(sp.brand, '') ILIKE ${pattern} ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM "SupplierProductVariant" v
        WHERE v."supplierProductId" = sp.id
          AND (COALESCE(v.sku, '') ILIKE ${pattern} ESCAPE '\\' OR COALESCE(v.barcode, '') ILIKE ${pattern} ESCAPE '\\')
      )
    )`);
  }

  if (params.quickFilter) {
    const predicate = quickFilterPredicateSql(params.quickFilter);
    whereParts.push(Prisma.sql`EXISTS (SELECT 1 FROM variant_eff ve WHERE ve.pid = sp.id AND ${predicate})`);
  }

  return Prisma.join(whereParts, ' AND ');
}

/** Projects every column ORDER BY / the caller might need, so downstream queries can select
 * just `id` from `filtered` and still ORDER BY the other columns (Postgres allows ordering by
 * a CTE's non-selected columns as long as the FROM is a simple relation reference). */
function buildCatalogueFilteredSql(whereSql: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    SELECT
      sp.id,
      sp.name,
      sp.brand,
      sp.category,
      sp.sku,
      sp.status,
      sp."createdAt",
      COALESCE(pa.variant_count, 0) AS variant_count,
      COALESCE(pa.total_stock, 0) AS total_stock,
      COALESCE(pa.stock_value, 0) AS stock_value
    FROM "SupplierProduct" sp
    JOIN "Supplier" su ON su.id = sp."supplierId"
    LEFT JOIN product_agg pa ON pa.pid = sp.id
    WHERE ${whereSql}
  `;
}

function buildCatalogueOrderSql(sort: ProductsSortKey, dir: 'asc' | 'desc'): Prisma.Sql {
  const dirSql = dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  switch (sort) {
    case 'name':
      return Prisma.sql`LOWER(name) ${dirSql}, id ASC`;
    case 'brand':
      return Prisma.sql`LOWER(COALESCE(brand, '')) ${dirSql}, id ASC`;
    case 'category':
      return Prisma.sql`LOWER(COALESCE(category, '')) ${dirSql}, id ASC`;
    case 'sku':
      return Prisma.sql`LOWER(sku) ${dirSql}, id ASC`;
    case 'status':
      return Prisma.sql`status ${dirSql}, id ASC`;
    case 'variants':
      return Prisma.sql`variant_count ${dirSql}, id ASC`;
    case 'stock':
      return Prisma.sql`total_stock ${dirSql}, id ASC`;
    case 'stockValue':
      return Prisma.sql`stock_value ${dirSql}, id ASC`;
    case 'createdAt':
    default:
      return Prisma.sql`"createdAt" ${dirSql}, id ASC`;
  }
}
