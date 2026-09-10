'use client';

import { toast } from 'react-toastify';
import { PanelHeading } from './MainImagePanel';
import PerStoreMarginRows from './PerStoreMarginRows';
import StoreMarginPriceChips from './StoreMarginPriceChips';
// Re-enable: StorePriceChips showed each store's *live* Shopify price — swap back in for
// StoreMarginPriceChips (below) to restore that instead of the margin-derived price badge.
// import StorePriceChips from './StorePriceChips';
import { Check, Tag } from './icons';
import { formatMoney } from './utils';
import type { useProductPricing } from './hooks/useProductPricing';
import type { StoreListingsState } from './hooks/useStoreListings';
import type { PricingForm, StoreListingResult } from './types';

type PricingMarginPanelInner = ReturnType<typeof useProductPricing>;

type PricingMarginPanelProps = {
  pricing: PricingMarginPanelInner;
  storeListings: StoreListingsState;
  onEditStorePrice: (listing: StoreListingResult) => void;
  /** For the New Product wizard's Pricing step — hides the panel heading and the Edit/Cancel/Save
   * row (the wizard's own footer drives saving and advancing; the panel is expected to already be
   * in edit mode when embedded), but keeps "Use price" — applying the computed price to every
   * variant is a one-off action independent of Save/Next. */
  embedded?: boolean;
};

/** Buying price is in the foreign currency and gets converted by the exchange rate;
 * freight and misc are always AUD, so their unit never follows the currency picker. */
const COST_FIELDS: { key: Extract<keyof PricingForm, 'buyingPrice' | 'freight' | 'misc'>; label: string; unit: 'foreign' | 'base' }[] = [
  { key: 'buyingPrice', label: 'Buying price', unit: 'foreign' },
  { key: 'freight', label: 'Freight', unit: 'base' },
  { key: 'misc', label: 'Misc', unit: 'base' },
];

export default function PricingMarginPanel({ pricing: p, storeListings, onEditStorePrice, embedded }: PricingMarginPanelProps) {
  const foreign = p.form.currencyCode;
  const base = p.baseCurrency;

  return (
    <section className={embedded ? 'flex min-w-0 flex-col' : 'flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm'}>
      {!embedded && <PanelHeading icon={<Tag className="h-4 w-4" />} title={`Pricing & margin (${base})`} meta={foreign} />}

      <div className={embedded ? 'flex flex-1 flex-col gap-3' : 'flex flex-1 flex-col gap-3 p-4'}>
        <Row label="Currency">
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
        </Row>

        <Row label="Exchange rate">
          <NumberInput value={p.form.exchangeRate} onChange={p.set('exchangeRate')} step="0.01" suffix="rate" />
        </Row>

        {COST_FIELDS.map(({ key, label, unit }) => {
          const currency = unit === 'foreign' ? foreign : base;
          return (
            <Row key={key} label={label}>
              <NumberInput value={p.form[key]} onChange={p.set(key)} step="0.01" suffix={currency} />
            </Row>
          );
        })}

        <div className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-red-600">Total buying (landed)</span>
          <span className="text-[13px] font-bold text-red-700 tabular-nums">
            {formatMoney(p.computed.totalBuying)} <Unit>{base}</Unit>
          </span>
        </div>

        <Row label="Margin %">
          <NumberInput value={p.form.marginPercent} onChange={p.set('marginPercent')} step="0.1" suffix="%" />
        </Row>

        <Row label="Sell price (ex tax)">
          <Value>
            {formatMoney(p.computed.sellingPrice)} <Unit>{base}</Unit>
          </Value>
        </Row>

        <Row label="Tax">
          <NumberInput value={p.form.tax} onChange={p.set('tax')} step="0.1" suffix="%" />
        </Row>

        {/* Per-store overrides — kept visually separate from the product-level calculation
           above, since neither of these ever feeds computePricing. */}
        {storeListings.listings.length > 0 && (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            <PerStoreMarginRows listings={storeListings.listings} values={p.marginDraft} onChange={p.setPendingMargin} />
            {/* Re-enable: uncomment to restore the live-Shopify-price chips (see the parked import above).
            <StorePriceChips listings={storeListings.listings} onEditPrice={onEditStorePrice} />
            */}
            <StoreMarginPriceChips
              listings={storeListings.listings}
              form={p.form}
              marginDraft={p.marginDraft}
              onEditPrice={onEditStorePrice}
              onUnpublished={(storeName) => toast.info(`Publish this product to ${storeName} before editing its price`)}
            />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Sell price (inc tax)</span>
          <span className="text-base font-bold text-blue-900 tabular-nums">
            {formatMoney(p.computed.sellingIncTax)} <Unit>{base}</Unit>
          </span>
        </div>

        <PricingActions p={p} embedded={embedded} />
      </div>
    </section>
  );
}

function PricingActions({ p, embedded }: { p: PricingMarginPanelInner; embedded?: boolean }) {
  // Embedded (the New Product wizard's Pricing step): the wizard's own footer already drives
  // Save/Next, so only "Use price" belongs here — applying the computed price to every variant
  // is a distinct, one-off action neither Save nor Next performs.
  if (embedded) {
    return (
      <div className="flex gap-2">
        <ActionButton onClick={p.requestUsePrice} icon={<Tag />} label="Use price" primary />
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <ActionButton onClick={() => p.savePricing()} icon={<Check />} label="Save" primary disabled={!p.dirty} />
      <ActionButton onClick={p.requestUsePrice} icon={<Tag />} label="Use price" />
    </div>
  );
}

export function ActionButton({
  onClick,
  icon,
  label,
  primary,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
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
