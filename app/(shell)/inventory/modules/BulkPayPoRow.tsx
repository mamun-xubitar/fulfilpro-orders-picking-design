'use client';

import type { PayForm } from './hooks/usePoPayment';
import type { BulkPayField } from './hooks/useBulkPoPayment';
import type { InventoryGlobals, PurchaseOrderRecord } from './types';
import { formatCurrencyValue, formatPoNumber } from './utils';

export const BULK_PAY_GRID_COLS = 'grid-cols-[minmax(0,1.4fr)_4.5rem_4.5rem_5.5rem_5rem_5rem_7.5rem_7rem_minmax(0,1fr)_6rem]';

const INPUT =
  'h-[22px] w-full min-w-0 rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';
const NUMBER_INPUT = `${INPUT} text-right tabular-nums`;

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

type BulkPayPoRowProps = {
  po: PurchaseOrderRecord;
  form: PayForm;
  globals: InventoryGlobals;
  disabled: boolean;
  onChange: (field: BulkPayField, value: string) => void;
};

/** One purchase order's Pay form as a table row — the same fields as the single Pay modal. */
export default function BulkPayPoRow({ po, form, globals, disabled, onChange }: BulkPayPoRowProps) {
  const units = po.items.reduce((sum, i) => sum + i.quantity, 0);
  const total = units * num(form.buyingPrice) * num(form.exchangeRate) + num(form.freight) + num(form.misc);
  const bind = (field: BulkPayField) => ({ value: form[field], disabled, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(field, e.target.value) });
  const label = (field: string) => `${field} for ${formatPoNumber(po.number)}`;

  return (
    <div className={`grid ${BULK_PAY_GRID_COLS} items-center gap-2 px-2 py-1 text-[11px] leading-none transition-colors duration-150 hover:bg-inventory-surface-hover`}>
      <div className="min-w-0">
        <p className="truncate font-semibold text-inventory-text">
          {formatPoNumber(po.number)} <span className="font-normal text-inventory-text-subtle">· {units} unit{units === 1 ? '' : 's'}</span>
        </p>
        <p title={`${po.productTitle} · ${po.supplierName}`} className="mt-[3px] truncate text-[10px] text-inventory-text-subtle">
          {po.productTitle} · {po.supplierName}
        </p>
      </div>
      <select value={form.currencyCode} disabled={disabled} onChange={(e) => onChange('currencyCode', e.target.value)} aria-label={label('Currency')} className={`${INPUT} cursor-pointer`}>
        {[...new Set([form.currencyCode, ...globals.currencies.map((c) => c.code)])].map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      <input type="number" min={0} step="0.01" aria-label={label('Exchange rate')} className={NUMBER_INPUT} {...bind('exchangeRate')} />
      <input type="number" min={0} step="0.01" aria-label={label('Buying price')} className={NUMBER_INPUT} {...bind('buyingPrice')} />
      <input type="number" min={0} step="0.01" aria-label={label('Freight')} className={NUMBER_INPUT} {...bind('freight')} />
      <input type="number" min={0} step="0.01" aria-label={label('Misc')} className={NUMBER_INPUT} {...bind('misc')} />
      <input type="date" aria-label={label('Paid on')} className={INPUT} {...bind('paidAt')} />
      <input type="text" placeholder="Invoice / transfer no." aria-label={label('Reference')} className={`${INPUT} uppercase placeholder:normal-case`} {...bind('reference')} />
      <input type="text" placeholder="Optional" aria-label={label('Remark')} className={`${INPUT} uppercase placeholder:normal-case`} {...bind('remark')} />
      <span className="text-right font-semibold tabular-nums text-inventory-text">{formatCurrencyValue(total)}</span>
    </div>
  );
}
