'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Trash2 } from '@/components/icons';
import useRequest from '@/hooks/useRequest';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { lineAmount } from '@/lib/invoice-totals';
import { CELL_INPUT, INPUT, formatMoney } from './fieldStyles';
import type { LineForm } from './invoiceForm';

type VariantResult = {
  variantShopifyId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  price: number;
  inventoryQuantity: number;
};

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

function ProductSearch({ storeId, disabled, onPick }: { storeId: string; disabled?: boolean; onPick: (variant: VariantResult) => void }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<VariantResult[]>([]);
  const { searchInput, setSearchInput, search } = useDebouncedSearch('', 300);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { request, loading } = useRequest<VariantResult[]>();

  useEffect(() => {
    if (!open || !storeId || !search) return;
    void request({
      url: '/api/invoices/variant-search',
      method: 'GET',
      showToast: false,
      data: { storeId, q: search },
      onSuccess: ({ data }) => setResults(data),
    });
  }, [open, storeId, search, request]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        className={`${INPUT} pl-9`}
        disabled={disabled || !storeId}
        value={searchInput}
        placeholder={storeId ? 'Find a product by name or SKU…' : 'Choose a store to search its products'}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearchInput(event.target.value);
          setOpen(true);
        }}
      />
      {open && search && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {loading && results.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>}
          {!loading && results.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No products found — add a blank line to type it in.</li>}
          {results.map((variant) => (
            <li key={variant.variantShopifyId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onPick(variant);
                  setOpen(false);
                  setSearchInput('');
                  setResults([]);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{variant.productTitle}</span>
                  <span className="block truncate text-xs text-gray-500">{[variant.variantTitle, variant.sku].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-gray-700">{variant.price.toFixed(2)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
        <table className="w-full min-w-[640px] text-left">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="py-1 pr-2">Item</th>
              <th className="w-24 px-1">Size</th>
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
                  <input className={CELL_INPUT} value={line.title} disabled={disabled} onChange={(e) => onUpdate(line.key, { title: e.target.value })} placeholder="Description" />
                </td>
                <td className="px-1 py-1"><input className={CELL_INPUT} value={line.size} disabled={disabled} onChange={(e) => onUpdate(line.key, { size: e.target.value })} /></td>
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
