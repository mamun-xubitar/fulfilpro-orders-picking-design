import prisma from '@/lib/prisma.server';
import { PurchaseOrderModel, PO_SORT_KEYS, type PoSortKey } from '@/models/purchase-order.model.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { LocationModel } from '@/models/location.model.server';
import { upperTrim } from '@/lib/utils/common';
import { PoPaymentStatus, PurchaseOrderStatus } from '@prisma/client';
import { canReadInventory } from '@/lib/roles';

const model = new PurchaseOrderModel();
const productModel = new SupplierProductModel();
const locationModel = new LocationModel();
const STATUS_VALUES = new Set<string>(Object.values(PurchaseOrderStatus));

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

/** "Black / M", "Black" (colour-only), "M" (size-only), or "—" (neither axis). */
function variantTitle(colour: string, size: string): string {
  return [colour, size].filter(Boolean).join(' / ') || '—';
}

export class PurchaseOrderController {
  async list(searchParams: URLSearchParams, session: Session) {
    if (!canReadInventory(session?.user?.role)) return { error: { message: 'Forbidden', status: 403 } };

    // Scoped to one product when `supplierProductId` is given (the product view's PO panel), across
    // every product otherwise (the Purchase Orders tab).
    const supplierProductId = searchParams.get('supplierProductId')?.trim() || undefined;
    const supplierId = searchParams.get('supplierId')?.trim() || undefined;
    const statusRaw = searchParams.get('status') ?? '';
    const status = STATUS_VALUES.has(statusRaw) ? (statusRaw as PurchaseOrderStatus) : undefined;
    const payRaw = searchParams.get('payStatus') ?? '';
    const payStatus = (Object.values(PoPaymentStatus) as string[]).includes(payRaw) ? (payRaw as PoPaymentStatus) : undefined;
    const search = searchParams.get('search')?.trim() || undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    const sortRaw = searchParams.get('sort') ?? '';
    const sort = (PO_SORT_KEYS as readonly string[]).includes(sortRaw) ? (sortRaw as PoSortKey) : undefined;
    const dir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

    const result = await model.list({ supplierProductId, supplierId, status, payStatus, search, dateFrom, dateTo, sort, dir, page, pageSize });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    return {
      data: {
        purchaseOrders: result.purchaseOrders,
        pagination: { page, pageSize, total: result.total, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
      },
    };
  }

  async get(id: string, session: Session) {
    if (!canReadInventory(session?.user?.role)) return { error: { message: 'Forbidden', status: 403 } };
    const po = await model.findById(id);
    if (!po) return { error: { message: 'Purchase order not found', status: 404 } };
    return { data: po };
  }

  async create(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const supplierId = typeof value.supplierId === 'string' ? value.supplierId.trim() : '';
    const supplierProductId = typeof value.supplierProductId === 'string' ? value.supplierProductId.trim() : '';
    const referenceNumberRaw = typeof value.referenceNumber === 'string' ? upperTrim(value.referenceNumber) : '';
    const poRemarkRaw = typeof value.poRemark === 'string' ? upperTrim(value.poRemark) : '';
    const shippingRemarkRaw = typeof value.shippingRemark === 'string' ? upperTrim(value.shippingRemark) : '';
    const deliveryDateRaw = typeof value.deliveryDate === 'string' ? value.deliveryDate.trim() : '';
    const rawItems = Array.isArray(value.items) ? value.items : [];

    const errors: string[] = [];
    if (!supplierId) errors.push('supplierId: Supplier is required');
    if (!supplierProductId) errors.push('supplierProductId: Product is required');

    let deliveryDate: Date | null = null;
    if (deliveryDateRaw) {
      const parsed = new Date(deliveryDateRaw);
      if (Number.isNaN(parsed.getTime())) errors.push('deliveryDate: Enter a valid date');
      else deliveryDate = parsed;
    }

    const items: Array<{ variantId: string; quantity: number; unitCost?: number; sku?: string }> = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const v = raw as Record<string, unknown>;
      const variantId = typeof v.variantId === 'string' ? v.variantId.trim() : '';
      const quantity = Number(v.quantity);
      if (!variantId) continue;
      if (!Number.isFinite(quantity) || quantity < 1) {
        errors.push('items: Quantity must be at least 1 for every selected variant');
        continue;
      }
      let unitCost: number | undefined;
      if (v.unitCost !== undefined && v.unitCost !== null) {
        const parsed = Number(v.unitCost);
        if (!Number.isFinite(parsed) || parsed < 0) {
          errors.push('items: Cost must be a non-negative number');
          continue;
        }
        unitCost = parsed;
      }
      const sku = typeof v.sku === 'string' ? upperTrim(v.sku) : undefined;
      items.push({ variantId, quantity: Math.trunc(quantity), unitCost, sku: sku || undefined });
    }
    if (items.length === 0 && !errors.some((e) => e.startsWith('items:'))) errors.push('items: Select at least one variant');

    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const [supplier, product, variants] = await Promise.all([
      prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true, poEmail: true } }),
      prisma.supplierProduct.findUnique({ where: { id: supplierProductId }, select: { id: true, name: true } }),
      prisma.supplierProductVariant.findMany({
        where: { id: { in: items.map((i) => i.variantId) }, supplierProductId },
        select: { id: true, colour: true, size: true, sku: true, buyPrice: true },
      }),
    ]);

    if (!supplier) return { error: { message: 'Supplier not found', status: 404 } };
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const missing = items.find((i) => !variantMap.has(i.variantId));
    if (missing) return { error: { message: 'One or more variants do not belong to this product', status: 400 } };

    const actor = actorFromSession(session);
    const pricing = await model.findProductPricing(product.id);
    const purchaseOrder = await model.create({
      supplierId: supplier.id,
      supplierName: supplier.name,
      poEmail: supplier.poEmail,
      supplierProductId: product.id,
      productTitle: product.name,
      referenceNumber: referenceNumberRaw || null,
      deliveryDate,
      poRemark: poRemarkRaw || null,
      shippingRemark: shippingRemarkRaw || null,
      createdById: actor.id,
      createdByName: actor.name,
      pricing,
      items: items.map((i) => {
        const variant = variantMap.get(i.variantId)!;
        return {
          variantId: variant.id,
          variantTitle: variantTitle(variant.colour, variant.size),
          sku: i.sku ?? variant.sku,
          quantity: i.quantity,
          unitCost: i.unitCost ?? Number(variant.buyPrice),
        };
      }),
    });

    const updatedProduct = await productModel.findById(product.id);
    return { data: { purchaseOrder, product: updatedProduct }, message: 'Purchase order created' };
  }

  async updateStatus(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Purchase order not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    // An inline remark edit from the Purchase Orders tab.
    if ('poRemark' in value && !('status' in value)) {
      const remark = typeof value.poRemark === 'string' ? upperTrim(value.poRemark) : '';
      return { data: await model.updateRemark(id, remark || null), message: 'Remark saved' };
    }
    const status = typeof value.status === 'string' ? value.status : '';
    if (!STATUS_VALUES.has(status)) return { error: { message: 'status: Invalid status', status: 400 } };

    const purchaseOrder = await model.updateStatus(id, status as PurchaseOrderStatus, actorFromSession(session));
    return { data: purchaseOrder, message: 'Purchase order updated' };
  }

  async receive(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const po = await model.findById(id);
    if (!po) return { error: { message: 'Purchase order not found', status: 404 } };
    if (po.status === 'CANCELLED') return { error: { message: 'This purchase order is cancelled', status: 400 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rawReceipts = Array.isArray(value.receipts) ? value.receipts : [];

    const errors: string[] = [];
    const itemById = new Map(po.items.map((item) => [item.id, item]));
    const receipts: Array<{ itemId?: string; colour?: string; size?: string; sku?: string | null; locationId?: string | null; quantity: number; unitCost?: number | null }> = [];

    for (const raw of rawReceipts) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as Record<string, unknown>;
      const itemId = typeof r.itemId === 'string' ? r.itemId.trim() : '';
      const colour = typeof r.colour === 'string' ? r.colour.trim() : '';
      const size = typeof r.size === 'string' ? r.size.trim() : '';
      const locationId = typeof r.locationId === 'string' && r.locationId.trim() ? r.locationId.trim() : null;
      const quantity = Number(r.quantity);
      let unitCost: number | null | undefined;
      if (r.unitCost !== undefined && r.unitCost !== null && r.unitCost !== '') {
        const parsed = Number(r.unitCost);
        if (!Number.isFinite(parsed) || parsed < 0) {
          errors.push('unitCost: Enter a valid unit cost');
          continue;
        }
        unitCost = parsed;
      }

      if (!Number.isFinite(quantity) || quantity < 1) {
        errors.push('quantity: Quantity must be at least 1');
        continue;
      }
      if (itemId) {
        const item = itemById.get(itemId);
        if (!item) {
          errors.push('itemId: One or more items do not belong to this purchase order');
          continue;
        }
        const remaining = item.quantity - item.receivedQuantity;
        if (quantity > remaining) {
          errors.push(`quantity: Cannot receive more than the ${remaining} unit(s) outstanding for this item`);
          continue;
        }
        receipts.push({ itemId, colour: colour || undefined, size: size || undefined, sku: typeof r.sku === 'string' ? r.sku : null, locationId, quantity: Math.trunc(quantity), unitCost });
      } else if (colour && size) {
        receipts.push({ colour, size, sku: typeof r.sku === 'string' ? r.sku : null, quantity: Math.trunc(quantity), unitCost });
      } else {
        errors.push('itemId: Provide either an existing item or a colour and size');
      }
    }
    if (receipts.length === 0 && !errors.length) errors.push('receipts: Enter at least one quantity to receive');
    const locationIds = [...new Set(receipts.map((r) => r.locationId).filter((l): l is string => !!l))];
    if (locationIds.length && (await locationModel.countExisting(locationIds)) !== locationIds.length) {
      errors.push('locationId: One or more locations no longer exist');
    }
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const purchaseOrder = await model.receive(id, receipts, actorFromSession(session));
    const product = await productModel.findById(po.supplierProductId);
    return { data: { purchaseOrder, product }, message: 'Inventory received' };
  }

  /** Receives every outstanding line, in full and at its own unit cost, of each selected PO.
   * Each PO's lines are put away at its `locationIds[poId]` when the variant is kept there, else at
   * the variant's own first location. POs that are cancelled or already fully received are skipped, not failed. */
  async bulkReceive(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const value = (body ?? {}) as Record<string, unknown>;
    const ids = Array.isArray(value.ids) ? [...new Set((value.ids as unknown[]).filter((v): v is string => typeof v === 'string'))].slice(0, 100) : [];
    if (ids.length === 0) return { error: { message: 'Validation failed', errors: ['ids: Select at least one purchase order'], status: 400 } };
    const locationIds = value.locationIds && typeof value.locationIds === 'object' ? (value.locationIds as Record<string, unknown>) : {};

    const orders = await model.findManyByIds(ids);
    let received = 0;
    let skipped = 0;
    const failed: string[] = [];
    for (const po of orders) {
      const chosen = locationIds[po.id];
      const locationId = typeof chosen === 'string' && chosen.trim() ? chosen.trim() : null;
      const receipts = po.items
        .filter((i) => i.quantity > i.receivedQuantity)
        .map((i) => ({ itemId: i.id, quantity: i.quantity - i.receivedQuantity, locationId: i.locations.some((l) => l.id === locationId) ? locationId : i.locations[0]?.id }));
      if (po.status === 'CANCELLED' || receipts.length === 0) {
        skipped++;
        continue;
      }
      try {
        await model.receive(po.id, receipts, actorFromSession(session));
        received++;
      } catch {
        failed.push(String(po.number));
      }
    }
    if (received === 0 && failed.length > 0) return { error: { message: 'Could not receive the selected purchase orders', status: 500 } };
    const parts = [`${received} purchase order${received === 1 ? '' : 's'} received`];
    if (skipped > 0) parts.push(`${skipped} skipped (nothing outstanding or cancelled)`);
    if (failed.length > 0) parts.push(`${failed.length} failed`);
    return { data: { received, skipped, failed }, message: parts.join(' · ') };
  }
}
