'use client';

import { Plus, Trash2 } from '@/components/icons';
import { lineAmount } from '@/lib/invoice-totals';
import { CELL_INPUT, formatMoney } from './fieldStyles';
import type { LineForm } from './invoiceForm';
import ProductSearch, { type VariantResult } from './ProductSearch';

type LineItemsEditorProps = {
  storeId: string;
  currencyCode: string;
  lines: LineForm[];
  error?: string;
  disabled?: boolean;
  onUpdate: (key: string, values: Partial<LineForm>) => void;
  onAdd: (values?: Partial<LineForm>) => void;
  onRemove: (key: string) => void;
};

const num = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const isBlank = (line: LineForm) => !line.title.trim() && !line.unitPrice.trim();

export default function LineItemsEditor({ storeId, currencyCode, lines, error, disabled, onUpdate, onAdd, onRemove }: LineItemsEditorProps) {
  const pick = (variant: VariantResult) => {
    const size = variant.variantTitle && variant.variantTitle.toLowerCase() !== 'default title' ? variant.variantTitle : '';
    const values = { variantId: variant.variantShopifyId, title: variant.productTitle, size, sku: variant.sku ?? '', unitPrice: String(variant.price) };
    const last = lines[lines.length - 1];
    if (last && isBlank(last)) onUpdate(last.key, values);
    else onAdd(values);
  };

  return (
    <div className="space-y-2">
      {!disabled && (
        <div className="flex items-center gap-2">
          <ProductSearch storeId={storeId} onPick={pick} />
          <button
            type="button"
            onClick={() => onAdd()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Blank line
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="py-1 pr-2">Item</th>
              <th className="w-24 px-1">Size</th>
              <th className="w-28 px-1">SKU</th>
              <th className="w-16 px-1">Qty</th>
              <th className="w-24 px-1">Price</th>
              <th className="w-16 px-1">Dis %</th>
              <th className="w-24 px-1 text-right">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.key} className="align-top">
                <td className="py-1 pr-2">
                  <input className={`${CELL_INPUT} uppercase`} value={line.title} disabled={disabled} onChange={(e) => onUpdate(line.key, { title: e.target.value })} placeholder="Description" />
                </td>
                <td className="px-1 py-1"><input className={`${CELL_INPUT} uppercase`} value={line.size} disabled={disabled} onChange={(e) => onUpdate(line.key, { size: e.target.value })} /></td>
                <td className="px-1 py-1"><input className={`${CELL_INPUT} uppercase`} value={line.sku} disabled={disabled} onChange={(e) => onUpdate(line.key, { sku: e.target.value })} /></td>
                <td className="px-1 py-1"><input type="number" min={1} step={1} className={CELL_INPUT} value={line.qty} disabled={disabled} onChange={(e) => onUpdate(line.key, { qty: e.target.value })} /></td>
                <td className="px-1 py-1"><input type="number" min={0} step="0.01" className={CELL_INPUT} value={line.unitPrice} disabled={disabled} onChange={(e) => onUpdate(line.key, { unitPrice: e.target.value })} /></td>
                <td className="px-1 py-1"><input type="number" min={0} max={100} step="0.01" className={CELL_INPUT} value={line.discountPercent} disabled={disabled} onChange={(e) => onUpdate(line.key, { discountPercent: e.target.value })} /></td>
                <td className="px-1 py-2 text-right text-sm tabular-nums text-gray-900">
                  {formatMoney(lineAmount({ qty: num(line.qty), unitPrice: num(line.unitPrice), discountPercent: num(line.discountPercent) }), currencyCode)}
                </td>
                <td className="py-1 text-right">
                  {!disabled && (
                    <button type="button" aria-label="Remove item" onClick={() => onRemove(line.key)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
