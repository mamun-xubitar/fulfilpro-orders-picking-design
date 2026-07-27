'use client';

import type { ColorGroup } from './types';

type ColorListProps = {
  colorGroups: ColorGroup[];
  selectedColorKeys: Set<string>;
  onToggleColor: (key: string) => void;
};

export default function ColorList({ colorGroups, selectedColorKeys, onToggleColor }: ColorListProps) {
  return (
    <div className="border-r border-gray-100 pr-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Colors</h3>
      <ul className="space-y-1">
        {colorGroups.map((group) => (
          <li key={group.key}>
            <button
              type="button"
              onClick={() => onToggleColor(group.key)}
              className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50 cursor-pointer ${
                selectedColorKeys.has(group.key) ? 'bg-blue-50' : ''
              }`}
            >
              <span
                className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                  selectedColorKeys.has(group.key) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}
              >
                {selectedColorKeys.has(group.key) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="flex-1 truncate text-gray-700">{group.label}</span>
              <span className="text-xs text-gray-400">{group.totalStock}</span>
            </button>
            <div className="pl-8 text-xs text-gray-400">{group.totalSold} sold</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
