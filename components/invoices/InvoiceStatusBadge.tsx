export type InvoicePaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

const STYLES: Record<InvoicePaymentStatus, { label: string; className: string }> = {
  PAID: { label: 'Paid', className: 'bg-green-100 text-green-700' },
  PARTIAL: { label: 'Partially paid', className: 'bg-amber-100 text-amber-700' },
  UNPAID: { label: 'Unpaid', className: 'bg-red-100 text-red-700' },
};

export function InvoiceStatusBadge({ status }: { status: InvoicePaymentStatus }) {
  const { label, className } = STYLES[status] ?? STYLES.UNPAID;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>;
}
