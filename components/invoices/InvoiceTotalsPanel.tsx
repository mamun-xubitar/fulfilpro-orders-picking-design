import { formatMoney } from './fieldStyles';

type Totals = { sub: number; discount: number; shipping: number; tax: number; total: number; amountPaid: number; balance: number };

type InvoiceTotalsPanelProps = { totals: Totals; currencyCode: string; taxLabel: string; warning?: string | null };

export default function InvoiceTotalsPanel({ totals, currencyCode, taxLabel, warning }: InvoiceTotalsPanelProps) {
  const row = (label: string, value: number, className = '') => (
    <div className={`flex justify-between gap-6 py-0.5 text-sm ${className}`}>
      <span className="text-gray-600">{label}</span>
      <span className="tabular-nums">{formatMoney(value, currencyCode)}</span>
    </div>
  );

  return (
    <div className="ml-auto w-full max-w-xs rounded-lg bg-gray-50 p-3">
      {row('Sub total', totals.sub)}
      {row('Discount', totals.discount)}
      {row('Shipping', totals.shipping)}
      {row('Total', totals.total, 'border-t border-gray-200 mt-1 pt-1 font-semibold text-gray-900')}
      {row(taxLabel, totals.tax, 'text-xs text-gray-500')}
      {row('Paid', totals.amountPaid)}
      {row('Balance', totals.balance, `font-semibold ${totals.balance > 0 ? 'text-red-600' : 'text-green-700'}`)}
      {warning && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">{warning}</p>}
    </div>
  );
}
