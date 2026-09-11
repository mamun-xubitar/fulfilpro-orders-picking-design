'use client';

import { MODULE_TABS } from './constants';
import type { ModuleTabId } from './types';

type ModuleTabsProps = {
  active: ModuleTabId;
  onChange: (id: ModuleTabId) => void;
  /** An optional trailing control (e.g. the store-wide pricing defaults) rendered on the right
   * of the tab bar — used only on the Products module. */
  right?: React.ReactNode;
};

export default function ModuleTabs({ active, onChange, right }: ModuleTabsProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-1 py-0.5 shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]">
      {/* `thin-scroll` (app/globals.css) makes this a visibly scrollable strip instead of
          hard-clipping tab labels when the shared shell's sidebar is expanded and there isn't
          enough width for every tab — the prototype assumes a collapsed ~56px sidebar, which
          this page doesn't control. */}
      <nav className="min-h-5.5 thin-scroll flex min-w-0 flex-1 items-center gap-[2px] overflow-x-auto" aria-label="Inventory modules">
        {MODULE_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-md px-[5px] py-[3px] text-[9px] font-bold uppercase leading-none tracking-[0.3px] transition-colors duration-150 cursor-pointer ${
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      {right && <div className="ml-auto flex shrink-0 items-center">{right}</div>}
    </div>
  );
}
