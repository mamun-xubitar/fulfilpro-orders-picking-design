import prisma from '@/lib/prisma.server';
import { PurchaseOrderModel } from '@/models/purchase-order.model.server';
import { PurchaseOrderStatus } from '@prisma/client';

const model = new PurchaseOrderModel();
const STATUS_VALUES = new Set<string>(Object.values(PurchaseOrderStatus));

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

export class PurchaseOrderController {
  async list(searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const productId = searchParams.get('productId')?.trim() ?? '';
    if (!productId) return { error: { message: 'productId is required', status: 400 } };

    const statusRaw = searchParams.get('status') ?? '';
    const status = STATUS_VALUES.has(statusRaw) ? (statusRaw as PurchaseOrderStatus) : undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

    const result = await model.list({ productId, status, dateFrom, dateTo, page, pageSize });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    return {
      data: {
        purchaseOrders: result.purchaseOrders,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      },
    };
  }

  async create(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const supplierId = typeof value.supplierId === 'string' ? value.supplierId.trim() : '';
    const productId = typeof value.productId === 'string' ? value.productId.trim() : '';
    const remarkRaw = typeof value.remark === 'string' ? value.remark.trim() : '';
    const deliveryDateRaw = typeof value.deliveryDate === 'string' ? value.deliveryDate.trim() : '';
    const rawItems = Array.isArray(value.items) ? value.items : [];

    const errors: string[] = [];
    if (!supplierId) errors.push('supplierId: Supplier is required');
    if (!productId) errors.push('productId: Product is required');

    let deliveryDate: Date | null = null;
    if (deliveryDateRaw) {
      const parsed = new Date(deliveryDateRaw);
      if (Number.isNaN(parsed.getTime())) errors.push('deliveryDate: Enter a valid date');
      else deliveryDate = parsed;
    }

    const items: Array<{ variantId: string; quantity: number }> = [];
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
      items.push({ variantId, quantity: Math.trunc(quantity) });
    }
    if (items.length === 0 && !errors.some((e) => e.startsWith('items:'))) errors.push('items: Select at least one variant');

    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const [supplier, product, variants] = await Promise.all([
      prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true, poEmail: true } }),
      prisma.product.findUnique({ where: { id: productId }, select: { id: true, title: true } }),
      prisma.productVariant.findMany({
        where: { id: { in: items.map((i) => i.variantId) }, productId },
        select: { id: true, title: true, sku: true },
      }),
    ]);

    if (!supplier) return { error: { message: 'Supplier not found', status: 404 } };
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const missing = items.find((i) => !variantMap.has(i.variantId));
    if (missing) return { error: { message: 'One or more variants do not belong to this product', status: 400 } };

    const actor = actorFromSession(session);
    const purchaseOrder = await model.create({
      supplierId: supplier.id,
      supplierName: supplier.name,
      poEmail: supplier.poEmail,
      productId: product.id,
      productTitle: product.title,
      deliveryDate,
      remark: remarkRaw || null,
      createdById: actor.id,
      createdByName: actor.name,
      items: items.map((i) => {
        const variant = variantMap.get(i.variantId)!;
        return { variantId: variant.id, variantTitle: variant.title ?? '', sku: variant.sku, quantity: i.quantity };
      }),
    });

    return { data: purchaseOrder, message: 'Purchase order created' };
  }

  async updateStatus(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Purchase order not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const status = typeof value.status === 'string' ? value.status : '';
    if (!STATUS_VALUES.has(status)) return { error: { message: 'status: Invalid status', status: 400 } };

    const purchaseOrder = await model.updateStatus(id, status as PurchaseOrderStatus, actorFromSession(session));
    return { data: purchaseOrder, message: 'Purchase order updated' };
  }
}
