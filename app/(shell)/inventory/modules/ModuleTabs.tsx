'use client';

import { MODULE_TABS } from './constants';
import type { ModuleTabId } from './types';

type ModuleTabsProps = {
  active: ModuleTabId;
  onChange: (id: ModuleTabId) => void;
  /** An optional trailing control (e.g. the store-wide pricing defaults) rendered on the right
   * of the tab bar — shown on every tab. */
  right?: React.ReactNode;
};

export default function ModuleTabs({ active, onChange, right }: ModuleTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-inventory-primary/25 bg-inventory-primary/[6%] px-1 py-0.5 shadow-inventory">
      {/* `thin-scroll` (app/globals.css) makes this a visibly scrollable strip instead of
          hard-clipping tab labels when the shared shell's sidebar is expanded and there isn't
          enough width for every tab — the prototype assumes a collapsed ~56px sidebar, which
          this page doesn't control. */}
      <nav className="min-h-5.5 thin-scroll flex min-w-0 flex-[1_1_12rem] items-center gap-[2px] overflow-x-auto" aria-label="Inventory modules">
        {MODULE_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-md px-1.5 py-1.5 text-[9px] font-bold uppercase leading-none tracking-[0.3px] transition-[color,background-color,box-shadow] duration-200 ease-out cursor-pointer ${
                isActive
                  ? 'bg-inventory-primary text-white shadow-inventory'
                  : 'text-inventory-primary hover:bg-inventory-surface hover:text-inventory-primary-hover hover:shadow-inventory'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      {right && <div className="ml-auto flex max-w-full shrink-0 items-center">{right}</div>}
    </div>
  );
}
