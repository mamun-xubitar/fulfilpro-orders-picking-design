'use client';

import { PRODUCT_TABS } from './constants';
import type { ProductTabId } from './types';

type ProductSubTabsProps = {
  active: ProductTabId;
  onChange: (id: ProductTabId) => void;
};

export default function ProductSubTabs({ active, onChange }: ProductSubTabsProps) {
  return (
    <div className="thin-scroll overflow-x-auto py-px">
      <nav className="flex w-max min-w-full items-center gap-1" aria-label="Product sections">
        {PRODUCT_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`-mb-px whitespace-nowrap rounded-t-[6px] border-b-2 px-[7px] py-[5px] text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] transition-[color,background-color,border-color] duration-200 ease-out cursor-pointer ${
                isActive
                  ? 'border-inventory-primary bg-inventory-primary/[8%] text-inventory-primary'
                  : 'border-transparent text-inventory-text-subtle hover:border-inventory-border-strong hover:bg-inventory-surface-muted hover:text-inventory-text'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
