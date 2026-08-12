'use client';

import { MODULE_TABS } from './constants';
import type { ModuleTabId } from './types';

type ModuleTabsProps = {
  active: ModuleTabId;
  onChange: (id: ModuleTabId) => void;
};

export default function ModuleTabs({ active, onChange }: ModuleTabsProps) {
  return (
    <div className="overflow-x-auto">
      <nav className="flex w-max min-w-full items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm" aria-label="Inventory modules">
        {MODULE_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 cursor-pointer ${
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
