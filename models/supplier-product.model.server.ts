import moment from 'moment-timezone';
import prisma from '@/lib/prisma.server';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { Prisma, SupplierProductStatus } from '@prisma/client';

export type ColourOptionData = { name: string; color: string };

export type IncomingLotRow = { quantity: number; date: string | null; poNumber: number; status: string };

export type SupplierProductVariantRow = {
  id: string;
  sku: string | null;
  barcode: string | null;
  colour: string;
  size: string;
  /** Σ of `locations[].quantity` while the variant has any location; otherwise its unassigned stock. */
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
  /** Where the variant is kept — any number of locations, A→Z, with the stock held at each. */
  locations: { id: string; name: string; quantity: number }[];
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

export type ProductsSortKey = 'name' | 'brand' | 'category' | 'sku' | 'status' | 'variants' | 'stock' | 'stockValue' | 'reorder' | 'createdAt';

/** The four price-shortcut buttons — matched against a variant's effective (weighted-average
 * received cost, falling back to the stored buyPrice) buy price and its sell price. */
export type QuickFilterId = 'buying-lt-1' | 'profit-lt-5' | 'selling-lt-1' | 'selling-lt-5';

export type CatalogueListParams = {
  page: number;
  pageSize: number;
  search?: string;
  verified?: boolean;
  status?: SupplierProductStatus;
  supplierId?: string;
  /** Filters by the hub-only flat InventoryCategory, distinct from the Shopify taxonomy `category`. */
  inventoryCategoryId?: string;
  quickFilter?: QuickFilterId | null;
  /** Only products with at least one variant in the Reorder state (available stock below its trigger). */
  reorderOnly?: boolean;
  sort?: ProductsSortKey;
  dir?: 'asc' | 'desc';
  /** Omitted products are excluded from every catalogue query by default (list, listIds,
   * findPosition, detail mode) — set true to include them, for the "Show omitted" toggle. */
  includeOmitted?: boolean;
};

export type CatalogueListResult = {
  products: SupplierProductRow[];
  total: number;
  /** Sums over every row matching the current filter set (not just the current page) — for the
   * product list's bottom totals row. Undefined when the filter set is empty. */
  totals: { stockOnHand: number; stockValue: number };
};

export type SupplierProductSupplierRow = { id: string; name: string; poEmail: string };

export type SupplierProductRow = {
  id: string;
  /** Every linked supplier, alphabetical by name — no default/primary among them. */
  suppliers: SupplierProductSupplierRow[];
  itemNo: string;
  /** Unique URL-safe slug — Shopify's product Handle equivalent. */
  handle: string;
  brand: string;
  name: string;
  category: string;
  categoryId: string | null;
  /** Hub-only flat category — distinct from the Shopify taxonomy category above. */
  inventoryCategoryId: string | null;
  inventoryCategoryName: string | null;
  sku: string;
  description: string;
  productRemark: string;
  poQuantity: number;
  omitted: boolean;
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

const OPEN_PO_STATUSES = ['REQUESTED', 'PARTIALLY_RECEIVED'] as const;

const catalogueInclude = {
  supplierLinks: { include: { supplier: { select: { id: true, name: true, poEmail: true } } }, orderBy: { supplier: { name: 'asc' as const } } },
  inventoryCategory: { select: { id: true, name: true } },
  variants: {
    orderBy: { position: 'asc' as const },
    include: { locations: { select: { quantity: true, location: { select: { id: true, name: true } } } } },
  },
  images: { orderBy: { position: 'asc' as const } },
  pricing: true,
  stocktakes: { where: { status: 'COMPLETED' as const }, orderBy: { completedAt: 'desc' as const }, take: 1 },
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

    const rows = await prisma.$queryRaw<{ total: number; ids: string[]; totalStock: number; totalStockValue: number }[]>(Prisma.sql`
      ${CATALOGUE_CTE_SQL},
      filtered AS (${buildCatalogueFilteredSql(whereSql)})
      SELECT
        (SELECT COUNT(*)::integer FROM filtered) AS total,
        COALESCE((SELECT SUM(total_stock) FROM filtered), 0)::float AS "totalStock",
        COALESCE((SELECT SUM(stock_value) FROM filtered), 0)::float AS "totalStockValue",
        COALESCE(
          (SELECT array_agg(id) FROM (SELECT id FROM filtered ORDER BY ${orderSql} OFFSET ${skip} LIMIT ${params.pageSize}) paged),
          ARRAY[]::text[]
        ) AS ids
    `);

    const { total, ids, totalStock, totalStockValue } = rows[0] ?? { total: 0, ids: [], totalStock: 0, totalStockValue: 0 };
    const totals = { stockOnHand: totalStock, stockValue: totalStockValue };
    if (ids.length === 0) return { products: [], total, totals };

    const catalogueRows = await prisma.supplierProduct.findMany({ where: { id: { in: ids } }, include: catalogueInclude });
    const hydrated = await this.hydrate(catalogueRows);
    const byId = new Map(hydrated.map((p) => [p.id, p]));
    return { products: ids.map((id) => byId.get(id)!).filter(Boolean), total, totals };
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

  /** Whole-catalogue count, ignoring every filter — the "of Y" half of the record stepper. */
  async countAll(): Promise<number> {
    return prisma.supplierProduct.count();
  }

  /** Count under the Verified filter only (ignoring every other table filter) — the "n / X"
   * half of the record stepper, kept in sync with the table via useProductsTable's onCounts. */
  async countForStepper(verified?: boolean): Promise<number> {
    return prisma.supplierProduct.count({ where: verified === undefined ? {} : { verified } });
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

  /** Case-sensitive itemNo uniqueness check for the New Product wizard / Product details inline
   * validator — `excludeId` lets an in-place edit check against every other product without
   * tripping on its own current itemNo. */
  async existsByItemNo(itemNo: string, excludeId?: string): Promise<boolean> {
    const row = await prisma.supplierProduct.findUnique({ where: { itemNo }, select: { id: true } });
    if (!row) return false;
    return row.id !== excludeId;
  }

  async create(data: {
    /** Every product needs at least one linked supplier. */
    supplierIds: string[];
    itemNo: string;
    handle: string;
    name: string;
    brand: string | null;
    marginPercent: number;
    exchangeRate: number;
    lowStockThreshold: number;
    actor?: { id?: string | null; name: string };
  }): Promise<string> {
    const row = await prisma.supplierProduct.create({
      data: {
        itemNo: data.itemNo,
        handle: data.handle,
        name: data.name,
        brand: data.brand,
        sku: data.itemNo,
        status: 'DRAFT',
        pricing: { create: { currencyCode: 'USD', exchangeRate: data.exchangeRate, marginPercent: data.marginPercent } },
        // Mirrors Shopify: a product declared with no size/colour still gets one variant (its
        // "Default Title") rather than sitting with an empty matrix — see reconcileVariants,
        // which later promotes this same sentinel row in place once an axis is added.
        variants: { create: { colour: '', size: '', trigger: data.lowStockThreshold, position: 0 } },
        supplierLinks: { create: data.supplierIds.map((supplierId) => ({ supplierId })) },
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
      /** Full replacement of the linked supplier set — at least one id. A supplier dropped from
       * this list has its link removed entirely (a receipt against it later re-creates the link). */
      supplierIds: string[];
      brand: string;
      name: string;
      category: string;
      categoryId: string | null;
      inventoryCategoryId: string | null;
      sku: string;
      description: string;
      productRemark: string;
      poQuantity: number;
      omitted: boolean;
      status: SupplierProductStatus;
      verified: boolean;
      sizes: string[];
      colours: ColourOptionData[];
    }>
  ): Promise<void> {
    const current = await prisma.supplierProduct.findUnique({ where: { id }, select: { sizes: true, colours: true } });
    if (!current) throw new Error('Product not found');

    if (data.colours !== undefined) {
      await this.applyColourRenames(id, normalizeColours(current.colours), data.colours);
    }
    if (data.sizes !== undefined) {
      await this.applySizeRenames(id, current.sizes as string[], data.sizes);
    }

    await prisma.$transaction(async (tx) => {
      await tx.supplierProduct.update({
        where: { id },
        data: {
          ...(data.itemNo !== undefined ? { itemNo: data.itemNo } : {}),
          ...(data.handle !== undefined ? { handle: data.handle } : {}),
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          ...(data.inventoryCategoryId !== undefined ? { inventoryCategoryId: data.inventoryCategoryId } : {}),
          ...(data.sku !== undefined ? { sku: data.sku } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.productRemark !== undefined ? { productRemark: data.productRemark } : {}),
          ...(data.poQuantity !== undefined ? { poQuantity: data.poQuantity } : {}),
          ...(data.omitted !== undefined ? { omitted: data.omitted } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.verified !== undefined ? { verified: data.verified } : {}),
          ...(data.sizes !== undefined ? { sizes: data.sizes } : {}),
          ...(data.colours !== undefined ? { colours: data.colours as unknown as Prisma.InputJsonValue } : {}),
        },
      });

      if (data.supplierIds !== undefined) {
        await tx.supplierProductSupplier.deleteMany({ where: { supplierProductId: id, supplierId: { notIn: data.supplierIds } } });
        await tx.supplierProductSupplier.createMany({
          data: data.supplierIds.map((supplierId) => ({ supplierProductId: id, supplierId })),
          skipDuplicates: true,
        });
      }
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
    // A colour that already has an image assigned should hand it straight to a newly
    // materialised variant of that colour (e.g. adding a size to an already-imaged colour) —
    // otherwise the new row would sit unlinked until someone reassigns the image by hand.
    const taggedImages = await prisma.supplierProductImage.findMany({
      where: { supplierProductId, colour: { not: null } },
      select: { id: true, colour: true },
    });
    const imageIdByColour = new Map(taggedImages.map((img) => [img.colour!.toLowerCase(), img.id]));

    const toCreate: Prisma.SupplierProductVariantCreateManyInput[] = [];
    let position = existing.length;
    for (const colour of colourAxis) {
      for (const size of sizeAxis) {
        const key = `${colour.toLowerCase()}::${size}`;
        if (existingKeys.has(key)) continue;
        toCreate.push({
          supplierProductId,
          colour,
          size,
          trigger: lowStockThreshold,
          position: position++,
          imageId: imageIdByColour.get(colour.toLowerCase()) ?? null,
        });
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

  /**
   * Applies the Colour & size adjustment modal's checked colours/sizes to the product, in one of
   * two modes:
   * - `replace`: the product's colours/sizes become exactly the checked lists; every existing
   *   variant is deleted (along with its stocktake items, adjustments and store-variant links —
   *   cascades on SupplierProductVariant) and one row per checked colour x checked size is
   *   created fresh, seeded from `values`.
   * - `insert`: the product's colours/sizes become the union of what it already had and the
   *   checked lists; only the checked colour x checked size combos that don't already exist are
   *   created (existing variants are left untouched) — mirrors reconcileVariants' sentinel
   *   promotion so a colour-only or size-only product's placeholder row is promoted in place
   *   rather than orphaned.
   * An empty checked axis is represented by the '' sentinel, exactly as reconcileVariants does,
   * so a colour-only or size-only selection still produces one variant per value on its one axis.
   */
  async applyOptions(
    supplierProductId: string,
    data: {
      mode: 'replace' | 'insert';
      /** Checked colours only. */
      colours: ColourOptionData[];
      /** Checked sizes only. */
      sizes: string[];
      /** Per-combo stock on hand / trigger typed in the modal — keyed by colour+size, matched
       * case-insensitively on colour. A combo missing from here falls back to 0 / the store's
       * low-stock threshold, same as reconcileVariants. With `locationId` set, stock on hand is the
       * quantity at that location. */
      values: { colour: string; size: string; stockOnHand?: number; trigger?: number }[];
      /** The location whose stock `values` describe, and where newly created variants are kept; null = unassigned. */
      locationId: string | null;
    }
  ): Promise<void> {
    const current = await prisma.supplierProduct.findUnique({ where: { id: supplierProductId }, select: { sizes: true, colours: true } });
    if (!current) throw new Error('Product not found');

    const colourAxis = data.colours.length > 0 ? data.colours.map((c) => c.name) : [''];
    const sizeAxis = data.sizes.length > 0 ? data.sizes : [''];
    const valuesByKey = new Map(data.values.map((v) => [`${v.colour.toLowerCase()}::${v.size}`, v]));
    const lowStockThreshold =
      (await prisma.appSettings.findUnique({ where: { id: 'default' }, select: { lowStockThreshold: true } }))?.lowStockThreshold ?? 10;
    // Mirrors reconcileVariants: a colour that already has an image assigned hands it straight to
    // any newly materialised variant of that colour.
    const taggedImages = await prisma.supplierProductImage.findMany({
      where: { supplierProductId, colour: { not: null } },
      select: { id: true, colour: true },
    });
    const imageIdByColour = new Map(taggedImages.map((img) => [img.colour!.toLowerCase(), img.id]));

    const buildRow = (colour: string, size: string, position: number): Prisma.SupplierProductVariantCreateManyInput => {
      const v = valuesByKey.get(`${colour.toLowerCase()}::${size}`);
      return {
        supplierProductId,
        colour,
        size,
        stockOnHand: v?.stockOnHand ?? 0,
        trigger: v?.trigger ?? lowStockThreshold,
        position,
        imageId: imageIdByColour.get(colour.toLowerCase()) ?? null,
      };
    };

    if (data.mode === 'replace') {
      const nextColourKeys = new Set(data.colours.map((c) => c.name.toLowerCase()));
      const toCreate: Prisma.SupplierProductVariantCreateManyInput[] = [];
      let position = 0;
      for (const colour of colourAxis) {
        for (const size of sizeAxis) toCreate.push(buildRow(colour, size, position++));
      }

      await prisma.$transaction(async (tx) => {
        await tx.supplierProduct.update({
          where: { id: supplierProductId },
          data: { sizes: data.sizes, colours: data.colours as unknown as Prisma.InputJsonValue },
        });
        for (const img of taggedImages) {
          if (!nextColourKeys.has(img.colour!.toLowerCase())) {
            await tx.supplierProductImage.update({ where: { id: img.id }, data: { colour: null } });
          }
        }
        // Replace recreates every variant, so a combo that already existed gets its locations (and
        // their stock) back — only combos new to the product land at the chosen location.
        const previous = await tx.supplierProductVariant.findMany({
          where: { supplierProductId },
          select: { id: true, colour: true, size: true, locations: { select: { locationId: true, quantity: true } } },
        });
        const previousLocations = new Map(previous.map((v) => [`${v.colour.toLowerCase()}::${v.size}`, v.locations]));
        // PO lines point at variants with ON DELETE SET NULL — remember which combo each one was on so
        // it can be re-linked to the recreated variant (otherwise its incoming drops off the matrix).
        const poItemsByKey = new Map<string, string[]>();
        const poItems = await tx.purchaseOrderItem.findMany({ where: { variantId: { in: previous.map((v) => v.id) } }, select: { id: true, variantId: true } });
        const keyByOldId = new Map(previous.map((v) => [v.id, `${v.colour.toLowerCase()}::${v.size}`]));
        for (const item of poItems) {
          const key = keyByOldId.get(item.variantId!)!;
          poItemsByKey.set(key, [...(poItemsByKey.get(key) ?? []), item.id]);
        }
        await tx.supplierProductVariant.deleteMany({ where: { supplierProductId } });
        if (toCreate.length > 0) {
          const created = await tx.supplierProductVariant.createManyAndReturn({ data: toCreate, select: { id: true, colour: true, size: true, stockOnHand: true } });
          const links: Prisma.SupplierProductVariantLocationCreateManyInput[] = [];
          for (const v of created) {
            const relink = poItemsByKey.get(`${v.colour.toLowerCase()}::${v.size}`);
            if (relink) await tx.purchaseOrderItem.updateMany({ where: { id: { in: relink } }, data: { variantId: v.id } });
            const kept = previousLocations.get(`${v.colour.toLowerCase()}::${v.size}`) ?? [];
            if (kept.length > 0) {
              // The typed stock is for the chosen location; every other location keeps its quantity.
              const typed = data.locationId ? valuesByKey.get(`${v.colour.toLowerCase()}::${v.size}`)?.stockOnHand : undefined;
              const quantities = new Map(kept.map((l) => [l.locationId, l.quantity]));
              if (data.locationId && typed !== undefined && (quantities.has(data.locationId) || typed > 0)) quantities.set(data.locationId, typed);
              for (const [locationId, quantity] of quantities) links.push({ variantId: v.id, locationId, quantity });
              await tx.supplierProductVariant.update({ where: { id: v.id }, data: { stockOnHand: [...quantities.values()].reduce((sum, q) => sum + q, 0) } });
            } else if (data.locationId) {
              links.push({ variantId: v.id, locationId: data.locationId, quantity: v.stockOnHand });
            }
          }
          if (links.length > 0) await tx.supplierProductVariantLocation.createMany({ data: links });
        }
      });
      return;
    }

    // insert: the product's lists become the union of what it already had and the checked items.
    const currentColours = normalizeColours(current.colours);
    const colourByLower = new Map(currentColours.map((c) => [c.name.toLowerCase(), c]));
    for (const c of data.colours) if (!colourByLower.has(c.name.toLowerCase())) colourByLower.set(c.name.toLowerCase(), c);
    const nextColours = [...colourByLower.values()];

    const currentSizes = current.sizes as string[];
    const sizeSeen = new Set(currentSizes.map((s) => s.toLowerCase()));
    const nextSizes = [...currentSizes];
    for (const s of data.sizes) {
      if (!sizeSeen.has(s.toLowerCase())) {
        sizeSeen.add(s.toLowerCase());
        nextSizes.push(s);
      }
    }

    await prisma.supplierProduct.update({
      where: { id: supplierProductId },
      data: { sizes: nextSizes, colours: nextColours as unknown as Prisma.InputJsonValue },
    });

    const existing = await prisma.supplierProductVariant.findMany({ where: { supplierProductId }, select: { id: true, colour: true, size: true } });
    await this.promoteSentinelAxis(existing, 'size', nextSizes);
    await this.promoteSentinelAxis(existing, 'colour', nextColours.map((c) => c.name));

    const existingKeys = new Set(existing.map((v) => `${v.colour.toLowerCase()}::${v.size}`));
    const toCreate: Prisma.SupplierProductVariantCreateManyInput[] = [];
    let position = existing.length;
    for (const colour of colourAxis) {
      for (const size of sizeAxis) {
        const key = `${colour.toLowerCase()}::${size}`;
        if (existingKeys.has(key)) continue;
        toCreate.push(buildRow(colour, size, position++));
        existingKeys.add(key);
      }
    }
    if (toCreate.length === 0) return;
    const created = await prisma.supplierProductVariant.createManyAndReturn({ data: toCreate, select: { id: true, stockOnHand: true } });
    if (data.locationId) {
      const locationId = data.locationId;
      await prisma.supplierProductVariantLocation.createMany({ data: created.map((v) => ({ variantId: v.id, locationId, quantity: v.stockOnHand })) });
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

  /** Deletes one variant. The product's declared colours/sizes are left as they are — a colour or
   * size with no variants left simply shows unchecked in the Variants / stock panel. */
  /** How many of the given variants of this product still hold stock, have stock allocated, or
   * have unreceived quantity on an open PO — any of those blocks a delete. (Available is
   * stock − allocated, so it's covered by the first two.) */
  async countUndeletableVariants(supplierProductId: string, variantIds: string[]): Promise<number> {
    return prisma.supplierProductVariant.count({
      where: {
        id: { in: variantIds },
        supplierProductId,
        OR: [
          { stockOnHand: { gt: 0 } },
          { allocated: { gt: 0 } },
          {
            purchaseOrderItems: {
              some: {
                purchaseOrder: { status: { in: [...OPEN_PO_STATUSES] } },
                quantity: { gt: prisma.purchaseOrderItem.fields.receivedQuantity },
              },
            },
          },
        ],
      },
    });
  }

  async deleteVariant(supplierProductId: string, variantId: string): Promise<boolean> {
    const result = await prisma.supplierProductVariant.deleteMany({ where: { id: variantId, supplierProductId } });
    return result.count > 0;
  }

  /** Deletes several variants, leaving the product's declared colours/sizes untouched (same as
   * deleteVariant). Returns the number actually deleted (ids outside this product are silently
   * ignored). */
  async deleteVariants(supplierProductId: string, variantIds: string[]): Promise<number> {
    const result = await prisma.supplierProductVariant.deleteMany({ where: { id: { in: variantIds }, supplierProductId } });
    return result.count;
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

  async setOmittedMany(ids: string[], omitted: boolean): Promise<number> {
    const result = await prisma.supplierProduct.updateMany({ where: { id: { in: ids } }, data: { omitted } });
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

  async countImages(supplierProductId: string): Promise<number> {
    return prisma.supplierProductImage.count({ where: { supplierProductId } });
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

  /**
   * Assigns (or clears) which colour an image belongs to — Shopify-style, one image per colour,
   * an image may be shared across every variant of that colour. Assigning fans the image out to
   * every variant of that colour (replacing whatever they previously pointed at) and untags any
   * other image this product had tagged with that colour, since only one can hold it at a time.
   * Clearing (colour: null) untags the image and unlinks every variant currently pointing at it.
   */
  async updateImageColour(supplierProductId: string, imageId: string, colour: string | null): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const image = await tx.supplierProductImage.findFirst({ where: { id: imageId, supplierProductId }, select: { id: true } });
      if (!image) return false;

      if (colour === null) {
        await tx.supplierProductImage.update({ where: { id: imageId }, data: { colour: null } });
        await tx.supplierProductVariant.updateMany({ where: { supplierProductId, imageId }, data: { imageId: null } });
        return true;
      }

      const previousHolders = await tx.supplierProductImage.findMany({
        where: { supplierProductId, colour: { equals: colour, mode: 'insensitive' }, id: { not: imageId } },
        select: { id: true },
      });
      if (previousHolders.length > 0) {
        const previousIds = previousHolders.map((img) => img.id);
        await tx.supplierProductImage.updateMany({ where: { id: { in: previousIds } }, data: { colour: null } });
        await tx.supplierProductVariant.updateMany({ where: { supplierProductId, imageId: { in: previousIds } }, data: { imageId: null } });
      }

      await tx.supplierProductImage.update({ where: { id: imageId }, data: { colour } });
      await tx.supplierProductVariant.updateMany({
        where: { supplierProductId, colour: { equals: colour, mode: 'insensitive' } },
        data: { imageId },
      });
      return true;
    });
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
            select: { variantId: true, quantity: true, receivedQuantity: true, purchaseOrder: { select: { deliveryDate: true, number: true, status: true } } },
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
        ? prisma.stockAdjustmentBatch.groupBy({
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
      lots.push({
        quantity: remaining,
        date: item.purchaseOrder.deliveryDate?.toISOString() ?? null,
        poNumber: item.purchaseOrder.number,
        status: item.purchaseOrder.status,
      });
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
      ? await prisma.stockAdjustmentBatch.findMany({
          where: { supplierProductId: { in: productIds } },
          distinct: ['supplierProductId'],
          orderBy: { createdAt: 'desc' },
          select: { supplierProductId: true, createdAt: true },
        })
      : [];
    const lastAdjustmentByProduct = new Map(lastAdjustmentRows.map((r) => [r.supplierProductId, r.createdAt.toISOString()]));

    // Stocktakes fall on the 1st of every month: a product's next one is the 1st of the month after its
    // last completed stocktake, in the app's operating timezone. Derived here, not stored, so it can't go stale.
    const settings = await prisma.appSettings.findUnique({ where: { id: 'default' }, select: { timezone: true } });
    const timezone = settings?.timezone ?? 'Australia/Sydney';

    return rows.map((row) => {
      // Already alphabetical by supplier name — see catalogueInclude's supplierLinks orderBy.
      return {
      id: row.id,
      suppliers: row.supplierLinks.map((l) => ({ id: l.supplierId, name: l.supplier.name, poEmail: l.supplier.poEmail })),
      itemNo: row.itemNo,
      handle: row.handle,
      brand: row.brand ?? '',
      name: row.name,
      category: row.category ?? '',
      categoryId: row.categoryId,
      inventoryCategoryId: row.inventoryCategoryId,
      inventoryCategoryName: row.inventoryCategory?.name ?? null,
      sku: row.sku,
      description: row.description ?? '',
      productRemark: row.productRemark ?? '',
      poQuantity: row.poQuantity,
      omitted: row.omitted,
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
          locations: v.locations.map((l) => ({ ...l.location, quantity: l.quantity })).sort((a, b) => a.name.localeCompare(b.name)),
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
        nextAt: row.stocktakes[0]?.completedAt ? moment.tz(row.stocktakes[0].completedAt, timezone).add(1, 'month').startOf('month').toISOString() : null,
      },
      adjustments: {
        lastAt: lastAdjustmentByProduct.get(row.id) ?? null,
        thisMonth: adjustmentCountByProduct.get(row.id) ?? 0,
      },
      activity: row.activity.map((a) => ({ id: a.id, at: a.createdAt.toISOString(), actor: a.actorName, message: a.message })),
    };
    });
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
 * sorting (variant count, total stock, stock value) and for the quick filter, which flags a
 * product when *any* of its variants falls under the threshold — never an average. */
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
      v."allocated" AS allocated,
      v."trigger" AS reorder_point,
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
      SUM(stock * sell) AS stock_value,
      BOOL_OR(buy < 1) AS any_buy_lt_1,
      BOOL_OR((sell - buy) < 5) AS any_profit_lt_5,
      BOOL_OR(sell < 1) AS any_sell_lt_1,
      BOOL_OR(sell < 5) AS any_sell_lt_5,
      COUNT(*) FILTER (WHERE stock - allocated < reorder_point) AS reorder_count
    FROM variant_eff
    GROUP BY pid
  )
`;

function buildLikePattern(value: string): string {
  const escaped = value.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

/** Matches a product if *any* of its variants falls under the threshold — a product with
 * variants on both sides (e.g. buy $0.50 and $3.00) still qualifies for "Buy < $1", same as the
 * client-side per-variant predicate in the single-product detail view. `pa.any_*` is NULL for a
 * variant-less product, so it never matches (same as before). */
function quickFilterPredicateSql(quickFilter: QuickFilterId): Prisma.Sql {
  switch (quickFilter) {
    case 'buying-lt-1':
      return Prisma.sql`pa.any_buy_lt_1`;
    case 'profit-lt-5':
      return Prisma.sql`pa.any_profit_lt_5`;
    case 'selling-lt-1':
      return Prisma.sql`pa.any_sell_lt_1`;
    case 'selling-lt-5':
      return Prisma.sql`pa.any_sell_lt_5`;
    default:
      return Prisma.sql`false`;
  }
}

function buildCatalogueWhereSql(params: {
  search?: string;
  verified?: boolean;
  status?: SupplierProductStatus;
  supplierId?: string;
  inventoryCategoryId?: string;
  quickFilter?: QuickFilterId | null;
  reorderOnly?: boolean;
  includeOmitted?: boolean;
}): Prisma.Sql {
  const whereParts: Prisma.Sql[] = [Prisma.sql`1 = 1`];

  if (!params.includeOmitted) {
    whereParts.push(Prisma.sql`sp.omitted = false`);
  }

  if (params.verified !== undefined) {
    whereParts.push(Prisma.sql`sp.verified = ${params.verified}`);
  }
  if (params.status) {
    whereParts.push(Prisma.sql`sp.status = ${params.status}::"SupplierProductStatus"`);
  }
  if (params.supplierId) {
    whereParts.push(Prisma.sql`EXISTS (SELECT 1 FROM "SupplierProductSupplier" sps WHERE sps."supplierProductId" = sp.id AND sps."supplierId" = ${params.supplierId})`);
  }
  if (params.inventoryCategoryId) {
    whereParts.push(Prisma.sql`sp."inventoryCategoryId" = ${params.inventoryCategoryId}`);
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
    // `pa` (product_agg) is already LEFT JOINed onto `sp` by buildCatalogueFilteredSql, so the
    // predicate can reference it directly rather than re-deriving it via an EXISTS subquery.
    whereParts.push(quickFilterPredicateSql(params.quickFilter));
  }

  if (params.reorderOnly) {
    // Same "Reorder" rule as the variants matrix's getStatus(): stock on hand − allocated < trigger.
    whereParts.push(Prisma.sql`COALESCE(pa.reorder_count, 0) > 0`);
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
      COALESCE(pa.stock_value, 0) AS stock_value,
      COALESCE(pa.reorder_count, 0) AS reorder_count
    FROM "SupplierProduct" sp
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
    case 'reorder':
      return Prisma.sql`reorder_count ${dirSql}, LOWER(name) ASC, id ASC`;
    case 'createdAt':
    default:
      return Prisma.sql`"createdAt" ${dirSql}, id ASC`;
  }
}
