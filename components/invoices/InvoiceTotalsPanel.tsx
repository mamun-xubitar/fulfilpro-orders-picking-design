import { formatMoney } from './fieldStyles';

type Totals = { sub: number; discount: number; shipping: number; tax: number; total: number; amountPaid: number; balance: number };

type InvoiceTotalsPanelProps = { totals: Totals; currencyCode: string; taxLabel: string; warning?: string | null };

/** Sub total to balance as a summary card; the balance row is red while money is owed, green once settled. */
export default function InvoiceTotalsPanel({ totals, currencyCode, taxLabel, warning }: InvoiceTotalsPanelProps) {
  const money = (value: number) => formatMoney(value, currencyCode);
  const row = (label: string, value: number) => (
    <div className="flex justify-between gap-6 text-sm text-gray-600">
      <span>{label}</span>
      <span className="tabular-nums text-gray-900">{money(value)}</span>
    </div>
  );
  const owing = totals.balance > 0;

  return (
    <div className="ml-auto w-full max-w-xs overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="space-y-1 px-4 py-3">
        {row('Sub total', totals.sub)}
        {row('Discount', totals.discount)}
        {row('Shipping', totals.shipping)}
      </div>
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-baseline justify-between gap-6 font-semibold text-gray-900">
          <span>Total</span>
          <span className="text-base tabular-nums">{money(totals.total)}</span>
        </div>
        <div className="mt-0.5 flex justify-between gap-6 text-xs text-gray-500">
          <span>{taxLabel}</span>
          <span className="tabular-nums">{money(totals.tax)}</span>
        </div>
      </div>
      <div className="space-y-1 px-4 py-3">{row('Paid', totals.amountPaid)}</div>
      <div className={`flex items-baseline justify-between gap-6 border-t px-4 py-3 font-semibold ${owing ? 'border-red-100 bg-red-50 text-red-700' : 'border-green-100 bg-green-50 text-green-700'}`}>
        <span>Balance</span>
        <span className="text-base tabular-nums">{money(totals.balance)}</span>
      </div>
      {warning && <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">{warning}</p>}
    </div>
  );
}
