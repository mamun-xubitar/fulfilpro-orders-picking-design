'use client';

import { ModalShell } from '@/components/ModalShell';
import BulkPayPoRow, { BULK_PAY_GRID_COLS } from './BulkPayPoRow';
import ColumnFillInput from './ColumnFillInput';
import type { BulkPayField, BulkPoPaymentState } from './hooks/useBulkPoPayment';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_FINISH, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import type { InventoryGlobals } from './types';

const TH = 'flex flex-col justify-end gap-[2px]';

/** Pay several purchase orders at once: one editable row per unpaid order, every column header can
 * fill its whole column (confirm on blur, same as Receive qty), and Bulk pay marks them all paid. */
export default function BulkPayPoModal({ bulk, globals }: { bulk: BulkPoPaymentState; globals: InventoryGlobals }) {
  const { targets } = bulk;
  if (!targets) return null;
  const errors = Object.entries(bulk.errors);

  const fill = (label: string, field: BulkPayField, type: 'number' | 'text' | 'date' = 'number', step?: string) => (
    <span className={`${TH} ${type === 'number' ? 'items-end text-right' : ''}`}>
      <span>{label}</span>
      <ColumnFillInput label={label} type={type} step={step} min={type === 'number' ? 0 : undefined} rowCount={targets.length} onApply={(v) => bulk.setAll(field, String(v))} onApplyText={(v) => bulk.setAll(field, v)} />
    </span>
  );

  return (
    <ModalShell
      disableBackdropClose
      elevated
      compact
      title={`Bulk pay — ${targets.length} purchase order${targets.length === 1 ? '' : 's'}`}
      onClose={bulk.close}
      maxWidthClass="max-w-7xl"
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={bulk.close} disabled={bulk.saving} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button type="button" onClick={bulk.submit} disabled={bulk.saving} className={`flex-1 ${WIZARD_BTN_FINISH}`}>
            {bulk.saving && SPINNER}
            {bulk.saving ? 'Paying...' : `Bulk pay (${targets.length})`}
          </button>
        </div>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-2`}>
        <p className="text-[12px] text-inventory-text-muted">
          Each order is marked <span className="font-bold">paid</span> with the figures below. Type in a column header and tab out to fill that column for every order.
          {bulk.skipped > 0 && ` ${bulk.skipped} already-paid order${bulk.skipped === 1 ? ' is' : 's are'} left out.`}
        </p>
        {errors.length > 0 && (
          <ul className="space-y-[2px] rounded-[7px] border border-inventory-danger/30 bg-inventory-danger/10 px-2 py-1.5 text-[11px] text-inventory-danger-hover">
            {errors.map(([field, message]) => (
              <li key={field}>
                {field}: {message}
              </li>
            ))}
          </ul>
        )}
        <div className="thin-scroll max-h-[calc(60dvh/var(--page-zoom,1))] overflow-auto rounded-lg border border-inventory-border">
          <div className="min-w-[68rem]">
            <div className={`sticky top-0 z-10 grid ${BULK_PAY_GRID_COLS} items-end gap-2 border-b border-inventory-border bg-inventory-surface-muted px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle`}>
              <span className="flex min-h-[16px] items-end">Purchase order</span>
              <span className={TH}>
                <span>Currency</span>
                <select
                  value=""
                  onChange={(e) => e.target.value && bulk.setAll('currencyCode', e.target.value)}
                  aria-label="Set currency for every row"
                  className="h-[16px] w-full min-w-0 cursor-pointer rounded-[4px] border border-inventory-border-strong bg-inventory-surface px-[2px] text-[9px] font-normal normal-case leading-none tracking-normal text-inventory-text-muted outline-none"
                >
                  <option value="">Set all</option>
                  {globals.currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </span>
              {fill('Rate', 'exchangeRate', 'number', '0.01')}
              {fill('Buying price', 'buyingPrice', 'number', '0.01')}
              {fill('Freight', 'freight', 'number', '0.01')}
              {fill('Misc', 'misc', 'number', '0.01')}
              {fill('Paid on', 'paidAt', 'date')}
              {fill('Reference', 'reference', 'text')}
              {fill('Remark', 'remark', 'text')}
              <span className="flex min-h-[16px] items-end justify-end text-right">Total ({globals.baseCurrency})</span>
            </div>
            <div className="divide-y divide-inventory-border">
              {targets.map((po) => (
                <BulkPayPoRow key={po.id} po={po} form={bulk.forms[po.id]} globals={globals} disabled={bulk.saving} onChange={(field, value) => bulk.setField(po.id, field, value)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
