import prisma from '@/lib/prisma.server';
import { formatPoNumber } from '@/lib/inventory/po-number';
import { Prisma, PoPaymentStatus, PurchaseOrderStatus } from '@prisma/client';
import { toPoPaymentRow, type PoPaymentRow } from '@/models/po-payment.model.server';
import { addStock } from '@/lib/inventory-stock.server';

export type PurchaseOrderItemRow = {
  id: string;
  variantId: string | null;
  variantTitle: string;
  /** Null when the linked variant has since been deleted. */
  colour: string | null;
  size: string | null;
  sku: string | null;
  quantity: number;
  receivedQuantity: number;
  unitCost: number | null;
  /** The linked variant's locations, A→Z — where a receipt can be put away. */
  locations: { id: string; name: string }[];
};

export type PurchaseOrderRow = {
  id: string;
  number: number;
  referenceNumber: string | null;
  supplierId: string;
  supplierName: string;
  poEmail: string;
  supplierProductId: string;
  productTitle: string;
  status: PurchaseOrderStatus;
  deliveryDate: string | null;
  poRemark: string | null;
  shippingRemark: string | null;
  createdById: string;
  createdByName: string;
  statusUpdatedById: string | null;
  statusUpdatedByName: string | null;
  statusUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemRow[];
  /** Where the PO's receipts were put away, A→Z, totalled per location; empty until something is received (and for POs received before receipts were recorded). */
  receivedLocations: { name: string; quantity: number }[];
  /** The hub product's item number. */
  itemNo: string;
  /** What has been paid / is to be paid for this PO; null until a payment is first saved. */
  payment: PoPaymentRow | null;
  /** The "Pricing & margin" figures frozen on the PO when it was created (the product's live ones for a PO that predates the snapshot) — what the Pay modal seeds from before any payment exists. */
  productPricing: PoPricingSnapshot | null;
};

export type PoPricingSnapshot = { currencyCode: string; exchangeRate: number; buyingPrice: number; freight: number; misc: number };

const itemsInclude = {
  items: { include: { variant: { select: { colour: true, size: true, locations: { select: { location: { select: { id: true, name: true } } } } } } } },
  receipts: { select: { locationName: true, quantity: true } },
  payment: true,
  supplierProduct: { select: { itemNo: true, pricing: { select: { currencyCode: true, exchangeRate: true, buyingPrice: true, freight: true, misc: true } } } },
} as const;

export const PO_SORT_KEYS = ['number', 'createdAt', 'deliveryDate', 'supplierName', 'productTitle', 'status', 'updatedAt'] as const;
export type PoSortKey = (typeof PO_SORT_KEYS)[number];

type PurchaseOrderWithItems = Prisma.PurchaseOrderGetPayload<{ include: typeof itemsInclude }>;

export class PurchaseOrderModel {
  async list(params: {
    /** Omit for every product's POs. */
    supplierProductId?: string;
    supplierId?: string;
    status?: PurchaseOrderStatus;
    /** UNPAID also matches POs with no payment saved yet. */
    payStatus?: PoPaymentStatus;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: PoSortKey;
    dir?: 'asc' | 'desc';
    page: number;
    pageSize: number;
  }) {
    const { supplierProductId, supplierId, status, payStatus, search, dateFrom, dateTo, sort = 'createdAt', dir = 'desc', page, pageSize } = params;
    const where: Prisma.PurchaseOrderWhereInput = {};
    const and: Prisma.PurchaseOrderWhereInput[] = [];

    if (supplierProductId) where.supplierProductId = supplierProductId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (payStatus === 'PAID') and.push({ payment: { is: { status: 'PAID' } } });
    if (payStatus === 'UNPAID') and.push({ OR: [{ payment: { is: null } }, { payment: { is: { status: 'UNPAID' } } }] });

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const term = search?.trim();
    if (term) {
      const digits = term.replace(/\D/g, '');
      and.push({
        OR: [
          { referenceNumber: { contains: term, mode: 'insensitive' } },
          { productTitle: { contains: term, mode: 'insensitive' } },
          { supplierName: { contains: term, mode: 'insensitive' } },
          { poRemark: { contains: term, mode: 'insensitive' } },
          { shippingRemark: { contains: term, mode: 'insensitive' } },
          { items: { some: { OR: [{ sku: { contains: term, mode: 'insensitive' } }, { variantTitle: { contains: term, mode: 'insensitive' } }] } } },
          ...(digits ? [{ number: Number(digits) }] : []),
        ],
      });
    }
    if (and.length > 0) where.AND = and;

    const [rows, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: itemsInclude,
        // `number` breaks ties so paging stays stable when many rows share a status / date.
        orderBy: sort === 'number' ? { number: dir } : [{ [sort]: dir }, { number: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { purchaseOrders: rows.map(toPurchaseOrderRow), total };
  }

  async findManyByIds(ids: string[]): Promise<PurchaseOrderRow[]> {
    const rows = await prisma.purchaseOrder.findMany({ where: { id: { in: ids } }, include: itemsInclude, orderBy: { number: 'asc' } });
    return rows.map(toPurchaseOrderRow);
  }

  async updateRemark(id: string, poRemark: string | null) {
    const row = await prisma.purchaseOrder.update({ where: { id }, data: { poRemark }, include: itemsInclude });
    return toPurchaseOrderRow(row);
  }

  async findById(id: string): Promise<PurchaseOrderRow | null> {
    const row = await prisma.purchaseOrder.findUnique({ where: { id }, include: itemsInclude });
    return row ? toPurchaseOrderRow(row) : null;
  }

  /** The product's current "Pricing & margin" figures, to freeze onto a PO being created. */
  async findProductPricing(supplierProductId: string): Promise<PoPricingSnapshot | null> {
    const row = await prisma.supplierProductPricing.findUnique({
      where: { supplierProductId },
      select: { currencyCode: true, exchangeRate: true, buyingPrice: true, freight: true, misc: true },
    });
    return row
      ? { currencyCode: row.currencyCode, exchangeRate: Number(row.exchangeRate), buyingPrice: Number(row.buyingPrice), freight: Number(row.freight), misc: Number(row.misc) }
      : null;
  }

  async create(data: {
    supplierId: string;
    supplierName: string;
    poEmail: string;
    supplierProductId: string;
    productTitle: string;
    referenceNumber: string | null;
    deliveryDate: Date | null;
    poRemark: string | null;
    /** May contain the literal token "{orderNumber}" — replaced with this PO's own formatted
     * display number ("PO-00074") once the row exists and its autoincrement number is known. */
    shippingRemark: string | null;
    createdById: string;
    createdByName: string;
    items: Array<{ variantId: string; variantTitle: string; sku: string | null; quantity: number; unitCost?: number }>;
    /** The product's pricing at this moment — frozen onto the PO so later product edits don't move it. */
    pricing: PoPricingSnapshot | null;
  }) {
    const { pricing, ...fields } = data;
    const created = await prisma.purchaseOrder.create({
      data: {
        supplierId: fields.supplierId,
        supplierName: fields.supplierName,
        poEmail: fields.poEmail,
        supplierProductId: fields.supplierProductId,
        productTitle: fields.productTitle,
        referenceNumber: fields.referenceNumber,
        status: 'REQUESTED',
        deliveryDate: fields.deliveryDate,
        poRemark: fields.poRemark,
        shippingRemark: fields.shippingRemark,
        pricingCurrencyCode: pricing?.currencyCode ?? null,
        pricingExchangeRate: pricing?.exchangeRate ?? null,
        pricingBuyingPrice: pricing?.buyingPrice ?? null,
        pricingFreight: pricing?.freight ?? null,
        pricingMisc: pricing?.misc ?? null,
        createdById: fields.createdById,
        createdByName: fields.createdByName,
        items: { create: fields.items },
      },
      include: itemsInclude,
    });

    // {orderNumber} can only resolve once the row exists and its autoincrement `number` is known
    // — a second, targeted update rather than folding into the create above. Matched
    // case-insensitively: the controller upper-cases every free-text field before it gets here
    // (item 3), so the token itself normally arrives as "{ORDERNUMBER}".
    const resolvedShippingRemark = data.shippingRemark && /\{orderNumber\}/i.test(data.shippingRemark)
      ? data.shippingRemark.replace(/\{orderNumber\}/gi, formatPoNumber(created.number))
      : null;
    const row = resolvedShippingRemark
      ? await prisma.purchaseOrder.update({ where: { id: created.id }, data: { shippingRemark: resolvedShippingRemark }, include: itemsInclude })
      : created;
    return toPurchaseOrderRow(row);
  }

  async updateStatus(id: string, status: PurchaseOrderStatus, actor: { id: string; name: string }) {
    const row = await prisma.purchaseOrder.update({
      where: { id },
      data: { status, statusUpdatedById: actor.id, statusUpdatedByName: actor.name, statusUpdatedAt: new Date() },
      include: itemsInclude,
    });
    return toPurchaseOrderRow(row);
  }

  /**
   * Applies received quantities to the hub catalogue: adds stock at the receipt's location (the
   * variant's first location when none is given, its unassigned stock when it has none), and creates a new variant when the receipt references a colour/size the catalogue
   * doesn't have yet (e.g. the supplier substituted or added an item).
   */
  async receive(
    id: string,
    receipts: Array<{ itemId?: string; variantId?: string; colour?: string; size?: string; sku?: string | null; locationId?: string | null; quantity: number; unitCost?: number | null }>,
    actor: { id: string; name: string }
  ) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: itemsInclude });
      const itemById = new Map(po.items.map((item) => [item.id, item]));

      for (const receipt of receipts) {
        let variantId = receipt.variantId ?? null;
        let unitCost: Prisma.Decimal | null = null;

        if (receipt.itemId) {
          const item = itemById.get(receipt.itemId);
          if (!item) continue;
          variantId = item.variantId;
          // An edited unit cost on the receive form overrides the PO line's own cost; otherwise
          // fall back to what was ordered at.
          unitCost = receipt.unitCost != null ? new Prisma.Decimal(receipt.unitCost) : item.unitCost;

          if (!variantId && receipt.colour && receipt.size) {
            const created = await tx.supplierProductVariant.create({
              data: { supplierProductId: po.supplierProductId, colour: receipt.colour, size: receipt.size, sku: receipt.sku ?? null },
            });
            variantId = created.id;
            await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { variantId } });
          }

          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { receivedQuantity: { increment: receipt.quantity }, ...(receipt.unitCost != null && { unitCost: receipt.unitCost }) },
          });
        } else if (receipt.colour && receipt.size) {
          const existing = await tx.supplierProductVariant.findUnique({
            where: { supplierProductId_colour_size: { supplierProductId: po.supplierProductId, colour: receipt.colour, size: receipt.size } },
          });
          variantId = existing?.id ?? (await tx.supplierProductVariant.create({
            data: { supplierProductId: po.supplierProductId, colour: receipt.colour, size: receipt.size, sku: receipt.sku ?? null },
          })).id;
        }

        if (variantId) {
          const move = await addStock(tx, variantId, receipt.locationId ?? null, receipt.quantity);
          await tx.purchaseOrderReceipt.create({ data: { purchaseOrderId: id, locationName: move?.locationName ?? null, quantity: receipt.quantity } });
          if (unitCost !== null) await tx.supplierProductVariant.update({ where: { id: variantId }, data: { buyPrice: unitCost } });
        }
      }

      // A product may have multiple suppliers over time — receiving against this PO's supplier
      // means they've now actually supplied this product, so it counts toward their Products
      // Count on the Suppliers tab even if they weren't linked to it before.
      // Idempotent: a repeat receipt against the same (product, supplier) pair is a no-op here.
      await tx.supplierProductSupplier.upsert({
        where: { supplierProductId_supplierId: { supplierProductId: po.supplierProductId, supplierId: po.supplierId } },
        create: { supplierProductId: po.supplierProductId, supplierId: po.supplierId },
        update: {},
      });

      const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const status: PurchaseOrderStatus = items.every((item) => item.receivedQuantity >= item.quantity) ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      const totalReceived = receipts.reduce((sum, r) => sum + r.quantity, 0);
      await tx.inventoryActivity.create({
        data: {
          supplierProductId: po.supplierProductId,
          type: 'po_received',
          message: `Received ${totalReceived} unit${totalReceived === 1 ? '' : 's'} against PO-${String(po.number).padStart(5, '0')}`,
          actorId: actor.id,
          actorName: actor.name,
        },
      });

      const row = await tx.purchaseOrder.update({
        where: { id },
        data: { status, statusUpdatedById: actor.id, statusUpdatedByName: actor.name, statusUpdatedAt: new Date() },
        include: itemsInclude,
      });
      return toPurchaseOrderRow(row);
    });
  }
}

function receivedLocations(receipts: PurchaseOrderWithItems['receipts']): PurchaseOrderRow['receivedLocations'] {
  const byName = new Map<string, number>();
  for (const r of receipts) byName.set(r.locationName ?? 'Unassigned', (byName.get(r.locationName ?? 'Unassigned') ?? 0) + r.quantity);
  return [...byName].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => a.name.localeCompare(b.name));
}

function toPurchaseOrderRow(row: PurchaseOrderWithItems): PurchaseOrderRow {
  return {
    id: row.id,
    number: row.number,
    referenceNumber: row.referenceNumber,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    poEmail: row.poEmail,
    supplierProductId: row.supplierProductId,
    productTitle: row.productTitle,
    status: row.status,
    deliveryDate: row.deliveryDate?.toISOString() ?? null,
    poRemark: row.poRemark,
    shippingRemark: row.shippingRemark,
    createdById: row.createdById,
    createdByName: row.createdByName,
    statusUpdatedById: row.statusUpdatedById,
    statusUpdatedByName: row.statusUpdatedByName,
    statusUpdatedAt: row.statusUpdatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    itemNo: row.supplierProduct.itemNo,
    payment: row.payment ? toPoPaymentRow(row.payment) : null,
    productPricing: row.pricingCurrencyCode
      ? {
          currencyCode: row.pricingCurrencyCode,
          exchangeRate: Number(row.pricingExchangeRate ?? 1),
          buyingPrice: Number(row.pricingBuyingPrice ?? 0),
          freight: Number(row.pricingFreight ?? 0),
          misc: Number(row.pricingMisc ?? 0),
        }
      : row.supplierProduct.pricing
      ? {
          currencyCode: row.supplierProduct.pricing.currencyCode,
          exchangeRate: Number(row.supplierProduct.pricing.exchangeRate),
          buyingPrice: Number(row.supplierProduct.pricing.buyingPrice),
          freight: Number(row.supplierProduct.pricing.freight),
          misc: Number(row.supplierProduct.pricing.misc),
        }
      : null,
    receivedLocations: receivedLocations(row.receipts),
    items: row.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      variantTitle: item.variantTitle,
      colour: item.variant?.colour ?? null,
      size: item.variant?.size ?? null,
      sku: item.sku,
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
      unitCost: item.unitCost !== null ? Number(item.unitCost) : null,
      locations: (item.variant?.locations ?? []).map((l) => l.location).sort((a, b) => a.name.localeCompare(b.name)),
    })),
  };
}
