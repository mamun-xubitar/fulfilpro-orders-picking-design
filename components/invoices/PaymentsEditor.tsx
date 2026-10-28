'use client';

import { Plus, Trash2 } from '@/components/icons';
import { CELL_INPUT, formatMoney } from './fieldStyles';
import { PAYMENT_TYPES, type PaymentForm } from './invoiceForm';

type PaymentsEditorProps = {
  payments: PaymentForm[];
  currencyCode: string;
  total: number;
  amountPaid: number;
  balance: number;
  error?: string;
  disabled?: boolean;
  onUpdate: (key: string, values: Partial<PaymentForm>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
};

export default function PaymentsEditor({ payments, currencyCode, total, amountPaid, balance, error, disabled, onUpdate, onAdd, onRemove }: PaymentsEditorProps) {
  const money = (value: number) => formatMoney(value, currencyCode);

  return (
    <div className="space-y-2">
      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">No payments recorded — this invoice is unpaid.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="w-32 py-1 pr-2">Type</th>
                <th className="w-36 px-1">Date</th>
                <th className="w-28 px-1">Amount</th>
                <th className="w-32 px-1">Person</th>
                <th className="px-1">Description</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.key}>
                  <td className="py-1 pr-2">
                    <select className={CELL_INPUT} value={payment.type} disabled={disabled} onChange={(e) => onUpdate(payment.key, { type: e.target.value })}>
                      {PAYMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1"><input type="date" className={CELL_INPUT} value={payment.paidOn} disabled={disabled} onChange={(e) => onUpdate(payment.key, { paidOn: e.target.value })} /></td>
                  <td className="px-1 py-1"><input type="number" min={0} step="0.01" className={CELL_INPUT} value={payment.amount} disabled={disabled} onChange={(e) => onUpdate(payment.key, { amount: e.target.value })} /></td>
                  <td className="px-1 py-1"><input className={CELL_INPUT} value={payment.person} disabled={disabled} onChange={(e) => onUpdate(payment.key, { person: e.target.value })} /></td>
                  <td className="px-1 py-1"><input className={CELL_INPUT} value={payment.description} disabled={disabled} onChange={(e) => onUpdate(payment.key, { description: e.target.value })} /></td>
                  <td className="py-1 text-right">
                    {!disabled && (
                      <button type="button" aria-label="Remove payment" onClick={() => onRemove(payment.key)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!disabled ? (
          <button type="button" onClick={onAdd} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
            <Plus className="h-4 w-4" /> Add payment
          </button>
        ) : <span />}
        <p className="text-sm text-gray-600">
          Total <span className="font-semibold tabular-nums">{money(total)}</span> · Paid <span className="font-semibold tabular-nums">{money(amountPaid)}</span> · Balance{' '}
          <span className={`font-semibold tabular-nums ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{money(balance)}</span>
        </p>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
