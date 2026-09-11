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
              className={`-mb-px whitespace-nowrap border-b-2 px-[7px] py-[5px] text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] transition-colors duration-150 cursor-pointer ${
                isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
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
