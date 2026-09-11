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
    <div className="flex items-center gap-[6px]">
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
      <b className="whitespace-nowrap text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-gray-500">{label}</b>
      <span className="relative">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          // A 1-char suffix ("%") needs far less reserved gutter than a 3-letter currency code
          // ("AUD") — sized per suffix so a 3-digit value (e.g. a 150% margin) isn't clipped
          // against a gutter sized for the longer currency-code case.
          className={`h-[22px] ${suffix.length <= 1 ? 'w-[58px]' : 'w-[66px]'} rounded-[7px] border border-gray-300 pl-[6px] ${suffix.length <= 1 ? 'pr-[16px]' : 'pr-[22px]'} text-right text-[10.5px] font-bold leading-none text-gray-900 tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
        />
        <span className="pointer-events-none absolute right-[6px] top-1/2 -translate-y-1/2 text-[9px] leading-none text-gray-400">{suffix}</span>
      </span>
      <button
        type="button"
        onClick={onApply}
        className="h-[22px] rounded-[6px] bg-blue-600 px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 cursor-pointer"
      >
        Apply
      </button>
    </span>
  );
}
