'use client';

import { formatAud, formatForeign, toAud } from './utils';
import type { useProductPricing } from './hooks/useProductPricing';

type PricingPanelProps = ReturnType<typeof useProductPricing>;

const MONEY_FIELDS: { key: 'buyingPrice' | 'freight' | 'misc'; label: string }[] = [
  { key: 'buyingPrice', label: 'Buying price' },
  { key: 'freight', label: 'Freight' },
  { key: 'misc', label: 'Misc' },
];

export default function PricingPanel(p: PricingPanelProps) {
  if (p.loading) return <PricingSkeleton />;

  const foreign = p.form.currencyCode;
  // const rate = Number(p.form.exchangeRate) || 0;
  // const isForeign = foreign !== 'AUD';

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5.586a1 1 0 01.707.293l6.414 6.414a1 1 0 010 1.414l-8.586 8.586a1 1 0 01-1.414 0l-6.414-6.414A1 1 0 013 12.586V7a4 4 0 014-4z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Pricing</h3>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{p.form.currencyCode}</span>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="divide-y divide-gray-100">
            <PricingRow label="Currency" error={p.errors?.currencyCode} editing={p.editing}>
              {p.editing ? (
                <select
                  value={p.form.currencyCode}
                  onChange={p.set('currencyCode')}
                  className={`w-28 text-xs rounded-lg border px-2.5 py-1 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                    p.errors?.currencyCode ? 'border-red-400' : 'border-gray-300'
                  }`}
                >
                  {p.currencyOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{p.form.currencyCode}</span>
              )}
            </PricingRow>

            <PricingRow label="Exchange rate" error={p.errors?.exchangeRate} editing={p.editing}>
              {p.editing ? (
                <PricingInput
                  value={p.form.exchangeRate}
                  onChange={p.set('exchangeRate')}
                  step="0.0001"
                  suffix="rate"
                  invalid={!!p.errors?.exchangeRate}
                />
              ) : (
                <span>{Number(p.form.exchangeRate).toFixed(4)}</span>
              )}
            </PricingRow>

            {MONEY_FIELDS.map(({ key, label }) => {
              const raw = Number(p.form[key]) || 0;
              return (
                <PricingRow
                  key={key}
                  label={label}
                  error={p.errors?.[key]}
                  // sub={isForeign ? `≈ ${formatAud(toAud(raw, rate))}` : undefined}
                  editing={p.editing}
                >
                  {p.editing ? (
                    <PricingInput value={p.form[key]} onChange={p.set(key)} suffix={foreign} invalid={!!p.errors?.[key]} />
                  ) : (
                    <span>{formatForeign(raw, foreign)}</span>
                  )}
                </PricingRow>
              );
            })}
          </div>
        </div>

        <TotalRow label="Total buying price" value={formatAud(p.computed.totalBuying)} />

        <div>
          <div className="divide-y divide-gray-100">
            <PricingRow label="Margin" error={p.errors?.marginPercent} editing={p.editing}>
              {p.editing ? (
                <PricingInput value={p.form.marginPercent} onChange={p.set('marginPercent')} suffix="%" invalid={!!p.errors?.marginPercent} />
              ) : (
                <span>{Number(p.form.marginPercent).toFixed(1)}%</span>
              )}
            </PricingRow>

            <PricingRow label="Selling price">
              <span>{formatAud(p.computed.sellingPrice)}</span>
            </PricingRow>

            <PricingRow label="Tax" error={p.errors?.tax} editing={p.editing}>
              {p.editing ? (
                <PricingInput value={p.form.tax} onChange={p.set('tax')} suffix="AU$" invalid={!!p.errors?.tax} />
              ) : (
                <span>{formatAud(Number(p.form.tax) || 0)}</span>
              )}
            </PricingRow>
          </div>
        </div>

        <HeroTotal label="Selling inc tax" value={formatAud(p.computed.sellingIncTax)} />

        <PricingActions p={p} />
      </div>
    </div>
  );
}

function PricingRow({
  label,
  children,
  error,
  sub,
  editing = false
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  sub?: string;
  editing?: boolean;
}) {
  return (
    <div className={`${editing ? 'py-1.25' : 'py-2.5'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-gray-600">{label}</span>
        <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{children}</span>
      </div>
      {sub && <p className="text-right text-[11px] text-gray-400">{sub}</p>}
      {error && <p className="text-right text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function PricingInput({
  value,
  onChange,
  step = '0.01',
  suffix,
  invalid,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  step?: string;
  suffix: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        step={step}
        value={value}
        onChange={onChange}
        className={`w-28 rounded-lg border px-1 py-1 pr-9 text-right text-[13px] tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
          invalid ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{suffix}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-200 px-3 py-2.5">
      <span className="text-[13px] font-semibold text-red-500">{label}</span>
      <span className="text-[13px] font-bold text-red-900 tabular-nums">{value}</span>
    </div>
  );
}

function HeroTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 flex items-center justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">{label}</p>
      <p className="text-md font-bold tabular-nums text-blue-900">{value}</p>
    </div>
  );
}

function PricingActions({ p }: { p: PricingPanelProps }) {
  if (p.editing) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={p.cancelEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-1.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
        <button
          type="button"
          onClick={p.savePricing}
          disabled={p.saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {p.saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={p.startEdit}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-1.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Edit price
      </button>
      <button
        type="button"
        onClick={p.requestUsePrice}
        disabled={p.applying}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5.586a1 1 0 01.707.293l6.414 6.414a1 1 0 010 1.414l-8.586 8.586a1 1 0 01-1.414 0l-6.414-6.414A1 1 0 013 12.586V7a4 4 0 014-4z"
          />
        </svg>
        Use price
      </button>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        <div className="flex gap-2">
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
