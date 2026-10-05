'use client';

import { useState } from 'react';
import BuyingHistoryModal from './BuyingHistoryModal';
import { BTN_XS, BTN_XS_PRIMARY, PANEL_MAX_H, PanelHeading, panelBorderClass } from './MainImagePanel';
import StoreMarginEditModal from './StoreMarginEditModal';
import StoreMarginViewModal from './StoreMarginViewModal';
import type { useProductPricing } from './hooks/useProductPricing';
import type { StoreListingsState } from './hooks/useStoreListings';
import { Check, Clipboard, Plus, Tag } from './icons';
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
  // 'view' — the read-only list opened from the store-count pill. 'edit' — the add/edit list,
  // opened from "+".
  const [marginModal, setMarginModal] = useState<'view' | 'edit' | null>(null);

  const overrideCount = Object.values(p.storeMargins).filter((v) => v !== null).length;
  const hasStoreListings = storeListings.listings.length > 0;
  const hasAvailableStore = storeListings.listings.some((l) => p.storeMargins[l.storeId] == null);

  const footer = (
    <>
      <div className="flex items-center justify-between rounded-[9px] border border-inventory-secondary/20 bg-inventory-secondary/10 px-[9px] py-[6px]">
        <span className="text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-secondary">Sell price (inc tax)</span>
        <span className="text-[14px] font-bold leading-none text-inventory-secondary tabular-nums">
          {formatMoney(p.computed.sellingIncTax)} <Unit className="text-inventory-secondary">{base}</Unit>
        </span>
      </div>

      <PricingActions p={p} embedded={embedded} onOpenHistory={() => setHistoryOpen(true)} />
    </>
  );

  return (
    <section className={embedded ? 'flex min-w-0 flex-col' : `flex min-w-0 flex-col rounded-[10px] border ${panelBorderClass('pricing')} bg-inventory-surface shadow-inventory ${PANEL_MAX_H}`}>
      {!embedded && <PanelHeading tone="pricing" icon={<Tag className="h-3 w-3" />} title={`Pricing & margin (${base})`} meta={foreign} />}

      <div className={embedded ? 'flex flex-col gap-[3px]' : 'flex flex-1 min-h-0 flex-col'}>
        <div className={embedded ? 'contents' : 'flex flex-1 min-h-0 flex-col gap-[3px] overflow-y-auto thin-scroll p-[6px]'}>
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

          <Row label="Sell price (ex tax)" className='py-1'>
            <Value>
              {formatMoney(p.computed.sellingPrice)} <Unit>{base}</Unit>
            </Value>
          </Row>

          {/* Per-store margin — kept visually separate from the product-level calculation above,
             since it never feeds computePricing. Collapsed to a count + "+" here; the rows
             themselves live in the view/edit modals below, so this panel never grows past what
             fits, and a margin edit saves immediately rather than waiting on this panel's Save. */}
          {hasStoreListings && (
            <Row label="Per store margin">
              <div className="flex items-center gap-[4px]">
                {overrideCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setMarginModal('view')}
                    title={storeListings.listings
                      .filter((l) => p.storeMargins[l.storeId] != null)
                      .map((l) => l.storeName)
                      .join(', ')}
                    className="rounded-full border border-inventory-border-strong bg-inventory-surface-muted px-[7px] py-[2px] text-[9.5px] font-bold leading-none text-inventory-text-muted hover:bg-inventory-surface-hover cursor-pointer"
                  >
                    {overrideCount} {overrideCount === 1 ? 'store' : 'stores'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMarginModal('edit')}
                  aria-label="Add or edit per-store margin"
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-inventory-border-strong text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            </Row>
          )}

          {embedded && footer}
        </div>

        {!embedded && <div className="shrink-0 space-y-[3px] border-t border-inventory-divider p-[6px]">{footer}</div>}
      </div>

      {historyOpen && <BuyingHistoryModal purchaseOrders={purchaseOrders} onClose={() => setHistoryOpen(false)} onReceive={onReceive} />}

      {marginModal === 'view' && (
        <StoreMarginViewModal
          listings={storeListings.listings}
          savedForm={p.savedForm}
          values={p.storeMargins}
          onEditPrice={(listing) => {
            setMarginModal(null);
            onEditStorePrice(listing);
          }}
          onClose={() => setMarginModal(null)}
        />
      )}

      {marginModal === 'edit' && (
        <StoreMarginEditModal
          listings={storeListings.listings}
          savedForm={p.savedForm}
          values={p.storeMargins}
          startAdding={hasAvailableStore}
          saving={p.savingMargin}
          onSave={(storeId, marginPercent) => p.saveStoreMargin(storeId, marginPercent)}
          onClose={() => setMarginModal(null)}
        />
      )}
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

/** `.btn.xs` — 22px-tall action button built on the shared BTN_XS skins, so its hover and
 * transition match every other panel's footer buttons. Shared by this panel's footer and the
 * Product details heading's Save action. `compact` shrinks it for tight header slots (no
 * stretch, less padding) while keeping the same hover treatment. */
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
  const skin = primary ? BTN_XS_PRIMARY : BTN_XS;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        compact
          ? `flex h-[16px] flex-none items-center justify-center gap-1 rounded-[6px] px-2 text-[10px] font-bold leading-none transition-[color,background-color,border-color,box-shadow] duration-200 ease-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              primary
                ? 'bg-inventory-primary text-white hover:bg-inventory-primary-hover hover:shadow-inventory-md'
                : 'border border-inventory-border-strong text-inventory-text-muted hover:border-inventory-primary/40 hover:bg-inventory-surface-hover hover:text-inventory-primary'
            }`
          : `flex-1 ${skin}`
      }
    >
      {icon}
      {label}
    </button>
  );
}

export function Row({ label, children, className }: { label: string; children: React.ReactNode, className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className ?? ''}`}>
      <span className="text-[11.5px] font-medium leading-none text-inventory-text-muted">{label}</span>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="text-[11.5px] font-bold leading-none text-inventory-text tabular-nums">{children}</span>;
}

export function Unit({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-[10px] font-medium leading-none ${className ?? 'text-inventory-text-subtle'}`}>{children}</span>;
}

export function NumberInput({
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
  // The suffix is part of the flex layout (not an overlay on a fixed gutter), so the value always
  // stops short of it whatever its length ("%" / "AUD" / "rate").
  return (
    <div
      className={`flex h-[22px] ${width ?? 'w-[62px]'} items-center rounded-[7px] border border-inventory-border-strong bg-inventory-surface focus-within:border-inventory-primary focus-within:ring-2 focus-within:ring-inventory-primary-ring`}
    >
      <input
        type="number"
        step={step}
        value={value}
        onChange={onChange}
        aria-label={suffix}
        className="h-full min-w-0 flex-1 rounded-[7px] bg-transparent pl-[6px] pr-[4px] text-right text-[10.5px] leading-none tabular-nums outline-none"
      />
      <span className="pointer-events-none shrink-0 pr-[6px] text-[9px] leading-none text-inventory-text-subtle">{suffix}</span>
    </div>
  );
}
