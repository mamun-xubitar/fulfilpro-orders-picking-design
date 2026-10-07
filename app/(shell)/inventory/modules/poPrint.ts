import { printDocumentInHiddenFrame } from '@/lib/print';
import { formatDate, formatMoney, formatPoNumber } from './utils';
import type { PurchaseOrderRecord } from './types';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The currency block of a PO's printout: the saved payment's figures, else the product's own pricing
 * (what a Pay would start from), else nothing. */
function costBlock(po: PurchaseOrderRecord): string {
  const quantity = po.items.reduce((sum, i) => sum + i.quantity, 0);
  const source = po.payment ?? po.productPricing;
  if (!source) return '';
  const total = po.payment ? po.payment.totalAud : quantity * source.buyingPrice * source.exchangeRate + source.freight + source.misc;
  const rows = [
    ['Currency', `${source.currencyCode} @ ${source.exchangeRate}`],
    ['Buying price', `${formatMoney(source.buyingPrice)} ${source.currencyCode} / unit`],
    ['Freight / Misc', `$${formatMoney(source.freight)} / $${formatMoney(source.misc)} AUD`],
    ['Total landed', `$${formatMoney(total)} AUD`],
  ];
  return `<table class="kv">${rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table>`;
}

export function receivedLabel(po: PurchaseOrderRecord): string {
  if (po.status === 'CANCELLED') return 'Cancelled';
  if (po.status === 'RECEIVED') return 'Yes';
  if (po.status === 'REQUESTED') return 'No';
  const received = po.items.reduce((sum, i) => sum + i.receivedQuantity, 0);
  const ordered = po.items.reduce((sum, i) => sum + i.quantity, 0);
  return `Partially (${received} of ${ordered} units)`;
}

export function paidLabel(po: PurchaseOrderRecord): string {
  return po.payment?.status === 'PAID' ? `Paid${po.payment.paidAt ? ` ${formatDate(po.payment.paidAt)}` : ''}` : 'Not paid';
}

function poSection(po: PurchaseOrderRecord): string {
  const lines = po.items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.variantTitle)}</td><td>${escapeHtml(i.sku ?? '-')}</td><td class="n">${i.quantity}</td><td class="n">${i.receivedQuantity}</td><td class="n">${i.unitCost === null ? '-' : `$${formatMoney(i.unitCost)}`}</td></tr>`
    )
    .join('');
  const meta = [
    ['Supplier', po.supplierName],
    ['PO email', po.poEmail],
    ['Reference', po.referenceNumber || '-'],
    ['Delivery date', formatDate(po.deliveryDate)],
    ['Received', receivedLabel(po)],
    ...(po.receivedLocations.length > 0 ? [['Received at', po.receivedLocations.map((l) => `${l.name} (${l.quantity})`).join(', ')]] : []),
    ['Paid', paidLabel(po)],
    ['Created', formatDate(po.createdAt)],
  ];
  return `
    <section>
      <h1>${escapeHtml(formatPoNumber(po.number))} — ${escapeHtml(po.productTitle)}</h1>
      <p class="sub">${escapeHtml(po.itemNo)}</p>
      <table class="kv">${meta.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table>
      <table class="lines">
        <thead><tr><th>Variant</th><th>Supplier SKU</th><th class="n">Ordered</th><th class="n">Received</th><th class="n">Unit cost (AUD)</th></tr></thead>
        <tbody>${lines}</tbody>
      </table>
      ${costBlock(po)}
      ${po.poRemark ? `<p class="remark"><strong>PO remark:</strong> ${escapeHtml(po.poRemark)}</p>` : ''}
      ${po.shippingRemark ? `<p class="remark"><strong>Shipping remark:</strong> ${escapeHtml(po.shippingRemark)}</p>` : ''}
    </section>`;
}

export function buildPurchaseOrdersDocument(pos: PurchaseOrderRecord[]): string {
  return `<!doctype html>
<html>
  <head>
    <title>${pos.length === 1 ? escapeHtml(formatPoNumber(pos[0].number)) : `${pos.length} purchase orders`}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
      section { page-break-after: always; margin-bottom: 32px; }
      section:last-child { page-break-after: auto; }
      h1 { font-size: 16px; margin: 0 0 2px; }
      .sub { margin: 0 0 12px; color: #555; }
      table { border-collapse: collapse; }
      .kv { margin-bottom: 12px; }
      .kv th { text-align: left; font-weight: 600; color: #555; padding: 2px 16px 2px 0; }
      .kv td { padding: 2px 0; }
      .lines { width: 100%; margin-bottom: 12px; }
      .lines th, .lines td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; }
      .lines th { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #555; border-bottom: 2px solid #111; }
      .n { text-align: right !important; font-variant-numeric: tabular-nums; }
      .remark { margin: 4px 0; }
      @media print { @page { margin: 14mm; } }
    </style>
  </head>
  <body>${pos.map(poSection).join('')}</body>
</html>`;
}

export function printPurchaseOrders(pos: PurchaseOrderRecord[]): Promise<void> {
  return printDocumentInHiddenFrame(buildPurchaseOrdersDocument(pos));
}
