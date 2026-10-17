import { PoPaymentModel, PAYMENT_SORT_KEYS, type PaymentSortKey } from '@/models/po-payment.model.server';
import { PurchaseOrderModel } from '@/models/purchase-order.model.server';
import { upperTrim } from '@/lib/utils/common';
import { PoPaymentStatus } from '@prisma/client';
import { canReadInventory } from '@/lib/roles';
import { formatPoNumber } from '@/lib/inventory/po-number';

const model = new PoPaymentModel();
const poModel = new PurchaseOrderModel();
const STATUS_VALUES = Object.values(PoPaymentStatus) as string[];

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

const forbidden = { error: { message: 'Forbidden', status: 403 } };
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Validates the cost fields shared by a single save and a bulk pay. Errors are `field: message` strings. */
function parsePayment(value: Record<string, unknown>) {
  const errors: string[] = [];
  const currencyCode = typeof value.currencyCode === 'string' ? value.currencyCode.trim().toUpperCase() : '';
  if (!/^[A-Z]{3}$/.test(currencyCode)) errors.push('currencyCode: Choose a currency');
  const exchangeRate = Number(value.exchangeRate);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) errors.push('exchangeRate: Enter a rate above 0');
  const amount = (field: 'buyingPrice' | 'freight' | 'misc') => {
    const n = Number(value[field] ?? 0);
    if (!Number.isFinite(n) || n < 0 || n > 99999999) {
      errors.push(`${field}: Enter an amount of 0 or more`);
      return 0;
    }
    return n;
  };
  const buyingPrice = amount('buyingPrice');
  const freight = amount('freight');
  const misc = amount('misc');

  let paidAt: Date | null = null;
  if (typeof value.paidAt === 'string' && value.paidAt.trim()) {
    const parsed = new Date(value.paidAt);
    if (Number.isNaN(parsed.getTime())) errors.push('paidAt: Enter a valid date');
    else paidAt = parsed;
  }
  const reference = typeof value.reference === 'string' ? upperTrim(value.reference) : '';
  const remark = typeof value.remark === 'string' ? upperTrim(value.remark) : '';
  return { errors, fields: { currencyCode, exchangeRate, buyingPrice, freight, misc, paidAt, reference, remark } };
}

export class PoPaymentController {
  async get(purchaseOrderId: string, session: Session) {
    if (!canReadInventory(session?.user?.role)) return forbidden;
    if (!(await poModel.findById(purchaseOrderId))) return { error: { message: 'Purchase order not found', status: 404 } };
    const found = await model.findByPurchaseOrderId(purchaseOrderId);
    return { data: found ?? { payment: null, history: [] } };
  }

  /** Saves the PO's payment — created on first save, edited in place after — and appends a history snapshot. */
  async save(purchaseOrderId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return forbidden;
    const po = await poModel.findById(purchaseOrderId);
    if (!po) return { error: { message: 'Purchase order not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const { errors, fields } = parsePayment(value);
    const { currencyCode, exchangeRate, buyingPrice, freight, misc } = fields;
    let { paidAt } = fields;
    const status = typeof value.status === 'string' && STATUS_VALUES.includes(value.status) ? (value.status as PoPaymentStatus) : null;
    if (!status) errors.push('status: Choose a payment status');
    if (errors.length > 0 || !status) return { error: { message: 'Validation failed', errors, status: 400 } };
    // Paid with no date given means paid now; unpaid carries no paid date.
    if (status === 'PAID' && !paidAt) paidAt = new Date();
    if (status === 'UNPAID') paidAt = null;
    // Pay is one-time: once paid, the status and paid date are fixed — later saves only edit the amounts.
    const existing = (await model.findByPurchaseOrderId(purchaseOrderId))?.payment;
    const lockedPaid = existing?.status === 'PAID';
    if (lockedPaid) paidAt = existing.paidAt ? new Date(existing.paidAt) : paidAt;

    const quantity = po.items.reduce((sum, i) => sum + i.quantity, 0);
    const { reference, remark } = fields;

    const actor = { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
    await model.save(
      purchaseOrderId,
      {
        status: lockedPaid ? PoPaymentStatus.PAID : status,
        currencyCode,
        exchangeRate,
        buyingPrice,
        freight,
        misc,
        totalAud: round2(quantity * buyingPrice * exchangeRate + freight + misc),
        paidAt,
        reference: reference || null,
        remark: remark || null,
      },
      actor
    );
    const saved = await model.findByPurchaseOrderId(purchaseOrderId);
    return { data: saved, message: status === 'PAID' ? 'Payment saved — marked paid' : 'Payment saved' };
  }

  /** Marks several purchase orders paid in one go, each with its own cost fields. Every row is
   * validated before any is saved; orders that are missing or already paid are skipped, not failed. */
  async bulkPay(body: unknown, session: Session) {
    if (!isAdmin(session)) return forbidden;
    const raw = (body as { payments?: unknown } | null)?.payments;
    const payments = Array.isArray(raw) ? raw.slice(0, 100) : [];
    if (payments.length === 0) return { error: { message: 'Validation failed', errors: ['payments: Select at least one purchase order'], status: 400 } };

    const rows = payments.map((p) => (p && typeof p === 'object' ? (p as Record<string, unknown>) : {}));
    const ids = [...new Set(rows.map((r) => (typeof r.purchaseOrderId === 'string' ? r.purchaseOrderId : '')).filter(Boolean))];
    const orders = new Map((await poModel.findManyByIds(ids)).map((po) => [po.id, po]));

    const errors: string[] = [];
    const parsed = rows.map((row) => {
      const po = orders.get(String(row.purchaseOrderId));
      const result = parsePayment(row);
      for (const e of result.errors) errors.push(`${po ? formatPoNumber(po.number) : 'Purchase order'} · ${e}`);
      return { po, fields: result.fields };
    });
    if (errors.length > 0) return { error: { message: 'Validation failed', errors, status: 400 } };

    const actor = { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
    let paid = 0;
    let skipped = 0;
    for (const { po, fields } of parsed) {
      if (!po || po.payment?.status === 'PAID') {
        skipped++;
        continue;
      }
      const quantity = po.items.reduce((sum, i) => sum + i.quantity, 0);
      await model.save(
        po.id,
        {
          status: PoPaymentStatus.PAID,
          currencyCode: fields.currencyCode,
          exchangeRate: fields.exchangeRate,
          buyingPrice: fields.buyingPrice,
          freight: fields.freight,
          misc: fields.misc,
          totalAud: round2(quantity * fields.buyingPrice * fields.exchangeRate + fields.freight + fields.misc),
          paidAt: fields.paidAt ?? new Date(),
          reference: fields.reference || null,
          remark: fields.remark || null,
        },
        actor
      );
      paid++;
    }
    const message = `${paid} purchase order${paid === 1 ? '' : 's'} marked paid${skipped > 0 ? ` · ${skipped} skipped (already paid)` : ''}`;
    return { data: { paid, skipped }, message };
  }

  async list(searchParams: URLSearchParams, session: Session) {
    if (!canReadInventory(session?.user?.role)) return forbidden;
    const statusRaw = searchParams.get('status') ?? '';
    const sortRaw = searchParams.get('sort') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));
    const result = await model.list({
      search: searchParams.get('search')?.trim() || undefined,
      supplierId: searchParams.get('supplierId')?.trim() || undefined,
      status: STATUS_VALUES.includes(statusRaw) ? (statusRaw as PoPaymentStatus) : undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
      sort: (PAYMENT_SORT_KEYS as readonly string[]).includes(sortRaw) ? (sortRaw as PaymentSortKey) : 'updatedAt',
      dir: searchParams.get('dir') === 'asc' ? 'asc' : 'desc',
      page,
      pageSize,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    return { data: { payments: result.payments, pagination: { page, pageSize, total: result.total, totalPages, hasPrev: page > 1, hasNext: page < totalPages } } };
  }
}
