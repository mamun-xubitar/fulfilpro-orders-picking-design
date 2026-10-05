'use client';

import { useState } from 'react';
import { ICONBTN_XS } from './MainImagePanel';
import GlobalStoreMarginModal from './GlobalStoreMarginModal';
import { useGlobalStoreMargins } from './hooks/useGlobalStoreMargins';
import type { InventoryPage } from './hooks/useInventoryPage';
import { ChevronDown } from './icons';

type InventoryGlobalsProps = {
  p: InventoryPage;
};

/** Store-wide pricing defaults — exchange rate, system-wide margin, and the per-store margin
 * defaults modal trigger. Rendered in the module-tabs row (design 6) rather than its own toolbar
 * card, but keeps exactly the same state/handlers `ProductsToolbar` used to own. */
export default function InventoryGlobals({ p }: InventoryGlobalsProps) {
  const storeMargins = useGlobalStoreMargins();
  const [storeMarginsOpen, setStoreMarginsOpen] = useState(false);

  const openStoreMargins = () => {
    storeMargins.openModal();
    setStoreMarginsOpen(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      <GlobalField label="Exch." value={p.rateInput} onChange={p.setRateInput} onApply={p.applyGlobalRate} step="0.01" suffix={p.globals.baseCurrency} />
      <GlobalField label="Margin" value={p.marginInput} onChange={p.setMarginInput} onApply={p.applyGlobalMargin} step="1" suffix="%" />
      <button type="button" onClick={openStoreMargins} aria-haspopup="dialog" title="Per store margin" className={ICONBTN_XS}>
        <ChevronDown className="h-3 w-3" />
      </button>
      {storeMarginsOpen && <GlobalStoreMarginModal state={storeMargins} onClose={() => setStoreMarginsOpen(false)} />}
    </div>
  );
}

function GlobalField({
  label,
  value,
  onChange,
  onApply,
  step,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  step: string;
  suffix: string;
}) {
  return (
    <span className="flex items-center gap-[4px]">
      <b className="whitespace-nowrap text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-text-subtle">{label}</b>
      <span
        className={`flex h-[22px] ${suffix.length <= 1 ? 'w-[62px]' : 'w-[78px]'} items-center rounded-[7px] border border-inventory-border-strong bg-inventory-surface focus-within:border-inventory-primary focus-within:ring-2 focus-within:ring-inventory-primary-ring`}
      >
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-full min-w-0 flex-1 rounded-[7px] bg-transparent pl-[6px] pr-[4px] text-right text-[10.5px] font-bold leading-none text-inventory-text tabular-nums outline-none"
        />
        <span className="pointer-events-none shrink-0 pr-[6px] text-[9px] leading-none text-inventory-text-subtle">{suffix}</span>
      </span>
      <button
        type="button"
        onClick={onApply}
        className="h-[22px] rounded-[6px] bg-inventory-primary px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-primary-hover cursor-pointer"
      >
        Apply
      </button>
    </span>
  );
}
