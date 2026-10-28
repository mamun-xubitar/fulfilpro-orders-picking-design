export const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600';
export const CELL_INPUT = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600';
export const LABEL = 'mb-1 block text-xs font-medium uppercase text-gray-500';

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="border-b border-gray-100 pb-1 text-sm font-semibold text-gray-900">{children}</h4>;
}

export const formatMoney = (value: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: currencyCode || 'AUD' }).format(value);
  } catch {
    return value.toFixed(2);
  }
};
