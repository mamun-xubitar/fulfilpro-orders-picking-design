'use client';

import { PanelHeading } from './MainImagePanel';
import { Check, Close, Pencil, Tag } from './icons';
import { formatMoney } from './utils';
import type { useProductPricing } from './hooks/useProductPricing';
import type { PricingForm } from './types';

type PricingMarginPanelProps = ReturnType<typeof useProductPricing>;

const COST_FIELDS: { key: Extract<keyof PricingForm, 'buyingPrice' | 'freight' | 'misc'>; label: string }[] = [
  { key: 'buyingPrice', label: 'Buying price' },
  { key: 'freight', label: 'Freight' },
  { key: 'misc', label: 'Misc' },
];

export default function PricingMarginPanel(p: PricingMarginPanelProps) {
  const foreign = p.form.currencyCode;
  const base = p.baseCurrency;

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<Tag className="h-4 w-4" />} title={`Pricing & margin (${base})`} meta={foreign} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Row label="Currency">
          {p.editing ? (
            <select
              value={p.form.currencyCode}
              onChange={p.set('currencyCode')}
              aria-label="Currency"
              className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              {p.currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          ) : (
            <Value>{foreign}</Value>
          )}
        </Row>

        <Row label="Exchange rate">
          {p.editing ? (
            <NumberInput value={p.form.exchangeRate} onChange={p.set('exchangeRate')} step="0.0001" suffix="rate" />
          ) : (
            <Value>{Number(p.form.exchangeRate).toFixed(4)}</Value>
          )}
        </Row>

        {COST_FIELDS.map(({ key, label }) => (
          <Row key={key} label={label}>
            {p.editing ? (
              <NumberInput value={p.form[key]} onChange={p.set(key)} step="0.01" suffix={foreign} />
            ) : (
              <Value>
                {formatMoney(Number(p.form[key]) || 0)} <Unit>{foreign}</Unit>
              </Value>
            )}
          </Row>
        ))}

        <div className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-red-600">Total buying (landed)</span>
          <span className="text-[13px] font-bold text-red-700 tabular-nums">
            {formatMoney(p.computed.totalBuying)} <Unit>{base}</Unit>
          </span>
        </div>

        <Row label="Margin %">
          {p.editing ? (
            <NumberInput value={p.form.marginPercent} onChange={p.set('marginPercent')} step="0.1" suffix="%" />
          ) : (
            <span className="text-[13px] font-bold text-blue-700 tabular-nums">{Number(p.form.marginPercent).toFixed(1)} %</span>
          )}
        </Row>

        <Row label="Sell price (ex tax)">
          <Value>
            {formatMoney(p.computed.sellingPrice)} <Unit>{base}</Unit>
          </Value>
        </Row>

        <Row label="Tax">
          {p.editing ? (
            <NumberInput value={p.form.tax} onChange={p.set('tax')} step="0.01" suffix={base} />
          ) : (
            <Value>
              {formatMoney(p.taxAmount)} <Unit>{base}</Unit>
              <span className="ml-1.5 text-[11px] font-normal text-gray-400">({p.taxPercentOfSell.toFixed(1)}%)</span>
            </Value>
          )}
        </Row>

        <div className="mt-auto flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Sell price (inc tax)</span>
          <span className="text-base font-bold text-blue-900 tabular-nums">
            {formatMoney(p.computed.sellingIncTax)} <Unit>{base}</Unit>
          </span>
        </div>

        <PricingActions p={p} />
      </div>
    </section>
  );
}

function PricingActions({ p }: { p: PricingMarginPanelProps }) {
  if (p.editing) {
    return (
      <div className="flex gap-2">
        <ActionButton onClick={p.cancelEdit} icon={<Close />} label="Cancel" />
        <ActionButton onClick={p.savePricing} icon={<Check />} label="Save" primary />
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <ActionButton onClick={p.startEdit} icon={<Pencil />} label="Edit price" />
      <ActionButton onClick={p.requestUsePrice} icon={<Tag />} label="Use price" primary />
    </div>
  );
}

export function ActionButton({ onClick, icon, label, primary }: { onClick: () => void; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold transition-colors duration-150 cursor-pointer ${
        primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] font-medium text-gray-600">{label}</span>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{children}</span>;
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-medium text-gray-400">{children}</span>;
}

function NumberInput({
  value,
  onChange,
  step,
  suffix,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  step: string;
  suffix: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        step={step}
        value={value}
        onChange={onChange}
        aria-label={suffix}
        className="w-28 rounded-lg border border-gray-300 py-1 pl-2 pr-9 text-right text-[13px] tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{suffix}</span>
    </div>
  );
}
