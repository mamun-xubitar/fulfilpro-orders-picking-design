'use client';

import { ModalShell } from '@/components/ModalShell';
import { NumberInput, Row } from './PricingMarginPanel';
import type { PoPaymentState } from './hooks/usePoPayment';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_FINISH, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import type { InventoryGlobals } from './types';
import { formatDate, formatPoNumber } from './utils';

const LABEL = 'mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle';
const FIELD =
  'h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

const ACTION_LABELS: Record<string, string> = { created: 'Created', updated: 'Edited', paid: 'Marked paid', unpaid: 'Marked unpaid' };

/** Pay (or edit the payment of) one purchase order. The cost rows mirror the product's
 * "Pricing & margin" panel — currency bought in, rate, buying price, freight / misc — and the total
 * is the whole order's landed cost in the base currency. */
export default function PayPoModal({ pay, globals }: { pay: PoPaymentState; globals: InventoryGlobals }) {
  const { target, form } = pay;
  if (!target || !form) return null;
  const base = globals.baseCurrency;
  const paid = form.status === 'PAID';

  return (
    <ModalShell
      disableBackdropClose
      elevated
      compact
      title={`${paid ? 'Edit pay' : 'Pay'} — ${formatPoNumber(target.number)}`}
      onClose={pay.close}
      maxWidthClass="max-w-[520px]"
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={pay.close} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button type="button" onClick={() => pay.save()} disabled={pay.saving} className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
            {pay.saving && SPINNER}
            {pay.isEdit ? 'Save changes' : 'Save'}
          </button>
          {!paid && (
            <button type="button" onClick={() => pay.save(true)} disabled={pay.saving} className={`flex-1 ${WIZARD_BTN_FINISH}`}>
              Pay
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-2">
        <div className={`${WIZARD_CARD_CLASS} space-y-[6px]`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-inventory-text">{target.productTitle}</p>
              <p className="text-[10.5px] text-inventory-text-subtle">
                {target.supplierName} · {pay.quantity} unit{pay.quantity === 1 ? '' : 's'}
              </p>
            </div>
            <span
              aria-label="Payment status"
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                paid ? 'border-inventory-success/30 bg-inventory-success/10 text-inventory-success-hover' : 'border-inventory-warning/30 bg-inventory-warning/10 text-inventory-warning-ink'
              }`}
            >
              {paid ? 'Paid' : 'Unpaid'}
            </span>
          </div>

          <Row label="Currency bought in">
            <div className="flex gap-[4px]">
              <select
                value={form.currencyCode}
                onChange={pay.set('currencyCode')}
                aria-label="Currency"
                className="h-[22px] w-[58px] rounded-[7px] border border-inventory-border-strong px-[4px] text-right text-[10.5px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
              >
                {[...new Set([form.currencyCode, ...globals.currencies.map((c) => c.code)])].map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <NumberInput value={form.exchangeRate} onChange={pay.set('exchangeRate')} step="0.01" suffix="rate" width="w-[78px]" />
            </div>
          </Row>
          {pay.errors.currencyCode && <p className="text-right text-[10px] text-inventory-danger">{pay.errors.currencyCode}</p>}
          {pay.errors.exchangeRate && <p className="text-right text-[10px] text-inventory-danger">{pay.errors.exchangeRate}</p>}

          <Row label="Buying price (per unit)">
            <NumberInput value={form.buyingPrice} onChange={pay.set('buyingPrice')} step="0.01" suffix={form.currencyCode} width="w-[88px]" />
          </Row>
          <Row label="Freight / Misc">
            <div className="flex gap-[4px]">
              <NumberInput value={form.freight} onChange={pay.set('freight')} step="0.01" suffix={base} width="w-[78px]" />
              <NumberInput value={form.misc} onChange={pay.set('misc')} step="0.01" suffix={base} width="w-[78px]" />
            </div>
          </Row>
        </div>

        <div className={`${WIZARD_CARD_CLASS} grid grid-cols-2 gap-x-3 gap-y-2`}>
          <div>
            <label className={LABEL} htmlFor="pay-date">
              Paid on
            </label>
            <input id="pay-date" type="date" value={form.paidAt} onChange={pay.set('paidAt')} disabled={paid} className={`${FIELD} disabled:cursor-not-allowed disabled:bg-inventory-surface-muted disabled:opacity-60`} />
          </div>
          <div>
            <label className={LABEL} htmlFor="pay-reference">
              Reference
            </label>
            <input id="pay-reference" type="text" value={form.reference} onChange={pay.set('reference')} placeholder="Invoice / transfer no." className={`${FIELD} uppercase placeholder:normal-case`} />
          </div>
          <div className="col-span-2">
            <label className={LABEL} htmlFor="pay-remark">
              Remark
            </label>
            <textarea
              id="pay-remark"
              rows={2}
              value={form.remark}
              onChange={pay.set('remark')}
              placeholder="Optional"
              className="w-full resize-none rounded-[7px] border border-inventory-border-strong px-[6px] py-[4px] text-[11px] leading-tight outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
            />
          </div>
          {pay.errors.general && <p className="col-span-2 text-[10px] text-inventory-danger">{pay.errors.general}</p>}
        </div>

        {pay.history.length > 0 && (
          <div className={WIZARD_CARD_CLASS}>
            <h4 className={LABEL}>History</h4>
            <ul className="max-h-28 space-y-[4px] overflow-y-auto thin-scroll text-[10.5px]">
              {pay.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-inventory-text-muted">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-inventory-text">{ACTION_LABELS[h.action] ?? h.action}</span> · {h.actorName} · {formatDate(h.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
