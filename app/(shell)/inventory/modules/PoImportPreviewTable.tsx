'use client';

import type { ImportPreview } from './hooks/useImportExport';
import { formatDate } from './utils';

type PoPreview = Extract<ImportPreview, { type: 'po' }>;

export default function PoImportPreviewTable({ preview }: { preview: PoPreview }) {
  return (
    <div className="max-h-80 space-y-2 overflow-y-auto">
      {preview.groups.map((group) => (
        <div key={group.poNumber} className="rounded-lg border border-inventory-border">
          <div className="flex items-center justify-between gap-2 border-b border-inventory-border bg-inventory-surface-muted px-2 py-1">
            <span className="text-[11px] font-semibold text-inventory-text">
              {group.poNumber}{' '}
              {group.isNew && (
                <span className="ml-1 rounded-full bg-inventory-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-inventory-success-hover">New</span>
              )}
            </span>
            <span className="text-[10px] text-inventory-text-subtle">
              {group.status ?? '—'}
              {group.deliveryDate ? ` · due ${formatDate(group.deliveryDate)}` : ''}
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] leading-none">
            <thead>
              <tr className="border-b border-inventory-border text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                <th className="px-2 py-1">Variant</th>
                <th className="px-2 py-1">SKU</th>
                <th className="px-2 py-1 text-right">Qty</th>
                <th className="px-2 py-1 text-right">Received</th>
                <th className="px-2 py-1 text-right">Unit cost</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item, i) => (
                <tr key={i} className="border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover">
                  <td className="px-2 py-1">{item.variantTitle}</td>
                  <td className="px-2 py-1 text-inventory-text-subtle">{item.sku || '—'}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{item.receivedQuantity}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{item.unitCost !== null ? item.unitCost.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
