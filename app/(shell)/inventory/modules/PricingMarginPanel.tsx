'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import BuyingHistoryModal from './BuyingHistoryModal';
import { PanelHeading, panelBorderClass } from './MainImagePanel';
import PerStoreMarginRows from './PerStoreMarginRows';
import StoreMarginPriceChips from './StoreMarginPriceChips';
// Re-enable: StorePriceChips showed each store's *live* Shopify price — swap back in for
// StoreMarginPriceChips (below) to restore that instead of the margin-derived price badge.
// import StorePriceChips from './StorePriceChips';
import type { useProductPricing } from './hooks/useProductPricing';
import type { StoreListingsState } from './hooks/useStoreListings';
import { Check, Clipboard, Tag } from './icons';
import type { PurchaseOrderRecord, StoreListingResult } from './types';
import { formatMoney } from './utils';

type PricingMarginPanelInner = ReturnType<typeof useProductPricing>;

type PricingMarginPanelProps = {
  pricing: PricingMarginPanelInner;
  storeListings: StoreListingsState;
  onEditStorePrice: (listing: StoreListingResult) => void;
  /** For the "Buying history" button — reuses whatever `usePurchaseOrder` already has loaded
   * (empty in the New Product wizard, where there's no PO history to show yet). */
  purchaseOrders: PurchaseOrderRecord[];
  /** Wired to `p.po.openReceive` — Buying history's "Receive" action opens the Receive PO
   * modal on top while the history stays open behind it. */
  onReceive: (po: PurchaseOrderRecord) => void;
  /** For the New Product wizard's Pricing step — hides the panel heading and the Edit/Cancel/Save
   * row (the wizard's own footer drives saving and advancing; the panel is expected to already be
   * in edit mode when embedded), but keeps "Use price" — applying the computed price to every
   * variant is a one-off action independent of Save/Next. */
  embedded?: boolean;
};

export default function PricingMarginPanel({ pricing: p, storeListings, onEditStorePrice, purchaseOrders, onReceive, embedded }: PricingMarginPanelProps) {
  const foreign = p.form.currencyCode;
  const base = p.baseCurrency;
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <section className={embedded ? 'flex min-w-0 flex-col' : `flex min-w-0 flex-col rounded-[10px] border ${panelBorderClass('pricing')} bg-inventory-surface shadow-inventory xl:min-h-0`}>
      {!embedded && <PanelHeading tone="pricing" icon={<Tag className="h-3 w-3" />} title={`Pricing & margin (${base})`} meta={foreign} />}

      <div className={embedded ? 'flex flex-col gap-[3px]' : 'flex flex-col gap-[3px] p-[6px] xl:min-h-0 xl:overflow-y-auto'}>
        <Row label="Currency">
          <div className="flex gap-[4px]">
            <select
              value={p.form.currencyCode}
              onChange={p.set('currencyCode')}
              aria-label="Currency"
              className="h-[22px] w-[58px] rounded-[7px] border border-inventory-border-strong px-[4px] text-right text-[10.5px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
            >
              {p.currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <NumberInput value={p.form.exchangeRate} onChange={p.set('exchangeRate')} step="0.01" suffix="rate" width="w-[68px]" />
          </div>
        </Row>

        <Row label="Buying price">
          <NumberInput value={p.form.buyingPrice} onChange={p.set('buyingPrice')} step="0.01" suffix={foreign} width="w-[74px]" />
        </Row>

        <Row label="Freight / Misc">
          <div className="flex gap-[4px]">
            <NumberInput value={p.form.freight} onChange={p.set('freight')} step="0.01" suffix={base} width="w-[68px]" />
            <NumberInput value={p.form.misc} onChange={p.set('misc')} step="0.01" suffix={base} width="w-[68px]" />
          </div>
        </Row>

        <div className="flex items-center justify-between rounded-[9px] bg-inventory-surface-muted px-[9px] py-[6px]">
          <span className="text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-danger">Total buying (landed)</span>
          <span className="text-[11.5px] font-bold leading-none text-inventory-danger-hover tabular-nums">
            {formatMoney(p.computed.totalBuying)} <Unit>{base}</Unit>
          </span>
        </div>

        <Row label="Margin / Tax">
          <div className="flex gap-[4px]">
            <NumberInput value={p.form.marginPercent} onChange={p.set('marginPercent')} step="0.1" suffix="%" width="w-[62px]" />
            <NumberInput value={p.form.tax} onChange={p.set('tax')} step="0.1" suffix="%" width="w-[62px]" />
          </div>
        </Row>

        <Row label="Sell price (ex tax)">
          <Value>
            {formatMoney(p.computed.sellingPrice)} <Unit>{base}</Unit>
          </Value>
        </Row>

        {/* Per-store overrides — kept visually separate from the product-level calculation
           above, since neither of these ever feeds computePricing. */}
        {storeListings.listings.length > 0 && (
          <div className="space-y-[6px] border-t border-inventory-divider pt-[6px]">
            <PerStoreMarginRows listings={storeListings.listings} values={p.marginDraft} onChange={p.setPendingMargin} />
            {/* Re-enable: uncomment to restore the live-Shopify-price chips (see the parked import above).
            <StorePriceChips listings={storeListings.listings} onEditPrice={onEditStorePrice} />
            */}
            <StoreMarginPriceChips
              listings={storeListings.listings}
              form={p.form}
              marginDraft={p.resolvedMarginDraft}
              onEditPrice={onEditStorePrice}
              onUnpublished={(storeName) => toast.info(`Publish this product to ${storeName} before editing its price`)}
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-[9px] border border-inventory-secondary/20 bg-inventory-secondary/10 px-[9px] py-[6px]">
          <span className="text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-secondary">Sell price (inc tax)</span>
          <span className="text-[14px] font-bold leading-none text-inventory-secondary tabular-nums">
            {formatMoney(p.computed.sellingIncTax)} <Unit>{base}</Unit>
          </span>
        </div>

        <PricingActions p={p} embedded={embedded} onOpenHistory={() => setHistoryOpen(true)} />
      </div>

      {historyOpen && <BuyingHistoryModal purchaseOrders={purchaseOrders} onClose={() => setHistoryOpen(false)} onReceive={onReceive} />}
    </section>
  );
}

function PricingActions({ p, embedded, onOpenHistory }: { p: PricingMarginPanelInner; embedded?: boolean; onOpenHistory: () => void }) {
  // Embedded (the New Product wizard's Pricing step): the wizard's own footer already drives
  // Save/Next, so only "Use price" belongs here — applying the computed price to every variant
  // is a distinct, one-off action neither Save nor Next performs.
  if (embedded) {
    return (
      <div className="flex gap-[6px]">
        <ActionButton onClick={p.requestUsePrice} icon={<Tag className="h-3 w-3" />} label="Use price" primary />
      </div>
    );
  }
  return (
    <div className="flex gap-[6px]">
      <ActionButton onClick={() => p.savePricing()} icon={<Check className="h-3 w-3" />} label="Save" primary disabled={!p.dirty} />
      <ActionButton onClick={p.requestUsePrice} icon={<Tag className="h-3 w-3" />} label="Use price" />
      <ActionButton onClick={onOpenHistory} icon={<Clipboard className="h-3 w-3" />} label="PO history" />
    </div>
  );
}

/** `.btn.xs` — 22px-tall action button, shared by this panel's footer and the Product details
 * heading's Save action. `compact` shrinks it for tight header slots (no stretch, less padding). */
export function ActionButton({
  onClick,
  icon,
  label,
  primary,
  disabled,
  compact,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1 rounded-[6px] text-[10px] font-bold leading-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? 'h-[20px] flex-none px-2' : 'h-[22px] flex-1 px-[6px]'
      } ${
        primary ? 'bg-inventory-primary text-white hover:bg-inventory-primary-hover' : 'border border-inventory-border-strong text-inventory-text-muted hover:bg-inventory-surface-hover'
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
      <span className="text-[11.5px] font-medium leading-none text-inventory-text-muted">{label}</span>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="text-[11.5px] font-bold leading-none text-inventory-text tabular-nums">{children}</span>;
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-medium leading-none text-inventory-text-subtle">{children}</span>;
}

function NumberInput({
  value,
  onChange,
  step,
  suffix,
  width,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  step: string;
  suffix: string;
  width?: string;
}) {
  // A 1-char suffix ("%") needs far less reserved gutter than a 3-4 letter currency code
  // ("AUD"/"USD"/"rate") — a uniform gutter clipped 3-digit values (e.g. a 150% margin) against
  // a short suffix, so it's sized per suffix instead of one fixed value for every field.
  const gutter = suffix.length <= 1 ? 'pr-[16px]' : 'pr-[22px]';
  return (
    <div className="relative">
      <input
        type="number"
        step={step}
        value={value}
        onChange={onChange}
        aria-label={suffix}
        className={`h-[22px] ${width ?? 'w-[62px]'} rounded-[7px] border border-inventory-border-strong pl-[6px] ${gutter} text-right text-[10.5px] leading-none tabular-nums outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring`}
      />
      <span className="pointer-events-none absolute right-[6px] top-1/2 -translate-y-1/2 text-[9px] leading-none text-inventory-text-subtle">{suffix}</span>
    </div>
  );
}
