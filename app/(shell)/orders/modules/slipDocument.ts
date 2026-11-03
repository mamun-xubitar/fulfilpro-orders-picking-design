import type { OrderItem, OrderRow } from './types';

export type LocationRemark = { id: string; location: string; remark: string };
export type PrintItem = OrderItem & { printQuantity: number; removed: boolean; locationRemarks: LocationRemark[]; printNote: string };
export type PrintOrder = OrderRow & { printItems: PrintItem[] };

export function createLocationRemark(): LocationRemark {
  return { id: crypto.randomUUID(), location: '', remark: '' };
}

/** Quantity of a line still to be picked (not yet packed). */
export function getRemainingToPack(item: Pick<OrderItem, 'qty' | 'packedQuantity'>) {
  return Math.max(0, item.qty - (item.packedQuantity ?? 0));
}

export function clampNumber(value: string, max: number, min = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export function getVariantText(item: Pick<OrderItem, 'variantTitle' | 'variantOptions'>) {
  const options = item.variantOptions ?? [];
  if (options.length > 0) return options.map((o) => `${o.name}: ${o.value}`).join(', ');
  return item.variantTitle || '';
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function buildPickingSlipDocument(orders: PrintOrder[]) {
  return `<!doctype html><html><head><title>Picking slips</title><style>
    * { box-sizing: border-box; } body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @page { size: A4; margin: 12mm; }
    .page { page-break-after: always; } .page:last-child { page-break-after: auto; }
    table.slip { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 12px; }
    thead { display: table-header-group; } tfoot { display: table-footer-group; }
    tbody.item { break-inside: avoid; page-break-inside: avoid; }
    .head-cell { padding: 0; border-bottom: 1px solid #d1d5db; }
    .header { display: flex; justify-content: space-between; gap: 16px; background: #f9fafb; padding: 12px 16px; }
    .store { font-size: 14px; font-weight: 700; color: #111827; } .order { margin-top: 4px; font-size: 12px; color: #6b7280; }
    .meta { font-size: 12px; color: #6b7280; line-height: 1.5; text-align: right; }
    th { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 8px 10px; color: #6b7280; font-weight: 600; }
    td { border-bottom: 1px solid #f3f4f6; padding: 10px; vertical-align: top; }
    tr.item-main td { border-bottom: 0; padding-bottom: 4px; } tr.item-note td { padding-top: 0; border-bottom: 0; }
    tr.item-space td { padding-top: 0; padding-bottom: 12px; }
    .title { font-size: 14px; font-weight: 700; color: #111827; } .sku { margin-top: 4px; color: #6b7280; }
    .sku code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .label { font-weight: 700; text-transform: uppercase; color: #4b5563; } .qty { text-align: center; font-size: 16px; font-weight: 800; }
    .note { white-space: pre-wrap; }
    table.space { width: 100%; border-collapse: collapse; }
    table.space td.space-col { width: 50%; height: 18mm; vertical-align: top; padding: 6px 6px 0; border: 0; }
    .space-label { display: inline-block; border-bottom: 1px solid #111827; padding-bottom: 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #4b5563; }
  </style></head><body>
  ${orders.map((o) => `<section class="page"><table class="slip">
    <thead>
      <tr><th colspan="2" class="head-cell"><div class="header">
        <div><div class="store">${escapeHtml(o.storeName)}</div><div class="order">Order ${escapeHtml(o.number)}</div></div>
        <div class="meta"><div>Print date: ${escapeHtml(new Date().toLocaleString())}</div><div>${escapeHtml(o.customer)}</div></div>
      </div></th></tr>
      <tr><th style="width:34%">Item</th><th>Others</th></tr>
    </thead>
    ${o.printItems.map((item) => `<tbody class="item">
      <tr class="item-main"><td><div class="title">${escapeHtml(item.title || item.name)}</div>
      <div class="sku"><span class="label">SKU:</span> <code>${escapeHtml(item.sku || '-')}</code></div></td>
      <td><div><span class="label">Variant:</span> ${escapeHtml(getVariantText(item) || '-')} <span class="label">Qty:</span> <span class="qty">${escapeHtml(item.printQuantity)}</span></div>
      ${item.locationRemarks.map((entry) => `<div><span class="label">Location:</span> ${escapeHtml(entry.location || '-')} <span class="label">Remark:</span> ${escapeHtml(entry.remark || '-')}</div>`).join('')}</td></tr>
      <tr class="item-note"><td colspan="2" class="note"><span class="label">Note:</span> ${escapeHtml(item.printNote || '-')}</td></tr>
      <tr class="item-space"><td colspan="2"><table class="space"><tbody><tr>
        <td class="space-col"><span class="space-label">Quantity Note</span></td>
        <td class="space-col"><span class="space-label">Location Note</span></td>
      </tr></tbody></table></td></tr>
    </tbody>`).join('')}
  </table></section>`).join('')}
  </body></html>`;
}
