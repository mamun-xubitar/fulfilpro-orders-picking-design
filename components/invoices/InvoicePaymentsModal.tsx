'use client';

import { ModalShell } from '@/components/ModalShell';
import { formatMoney } from './fieldStyles';
import PaymentsEditor from './PaymentsEditor';
import type { useInvoicePayments } from './useInvoicePayments';

type InvoicePaymentsModalProps = { p: ReturnType<typeof useInvoicePayments> };

const BTN = 'flex-1 rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

/** Records what has been paid on a manual invoice: each payment's type, date, amount, person and note. */
export default function InvoicePaymentsModal({ p }: InvoicePaymentsModalProps) {
  const target = p.paymentsTarget;
  if (!target) return null;
  const money = (value: number) => formatMoney(value, target.currencyCode);

  const footer = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={p.closePayments} className={`${BTN} border border-gray-300 bg-white text-gray-600 hover:bg-gray-50`}>Cancel</button>
      <button type="button" onClick={p.savePayments} disabled={p.paymentsSaving} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}>
        {p.paymentsSaving ? 'Saving...' : 'Save payments'}
      </button>
    </div>
  );

  return (
    <ModalShell title={`Payments — ${target.invoiceNumber}`} onClose={p.closePayments} extraWide disableBackdropClose footer={footer}>
      <div className="space-y-4">
        {p.paymentsErrors.general && <p className="text-sm text-red-600">{p.paymentsErrors.general}</p>}
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Total', money(target.total), 'text-gray-900'],
            ['Paid', money(p.amountPaid), 'text-gray-900'],
            ['Balance', money(p.balance), p.balance > 0 ? 'text-red-600' : 'text-green-700'],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-lg border border-gray-200 px-3 py-2">
              <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
              <div className={`mt-0.5 text-base font-semibold tabular-nums ${tone}`}>{value}</div>
            </div>
          ))}
        </div>
        <PaymentsEditor
          payments={p.payments}
          currencyCode={target.currencyCode}
          total={target.total}
          amountPaid={p.amountPaid}
          balance={p.balance}
          error={p.paymentsErrors.payments}
          onUpdate={p.updatePayment}
          onAdd={p.addPayment}
          onRemove={p.removePayment}
        />
      </div>
    </ModalShell>
  );
}
