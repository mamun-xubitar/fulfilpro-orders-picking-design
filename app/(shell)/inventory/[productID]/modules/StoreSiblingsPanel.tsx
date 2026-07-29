'use client';

import type { SiblingProduct } from './types';

type StoreSiblingsPanelProps = {
  siblings: SiblingProduct[];
  expanded: boolean;
  onNavigate: (sibling: SiblingProduct) => void;
  onRemove: (sibling: SiblingProduct) => void;
};

export default function StoreSiblingsPanel({ siblings, expanded, onNavigate, onRemove }: StoreSiblingsPanelProps) {
  return (
    <div className="relative min-w-0">
      {expanded && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-full overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Other stores</h3>
          {siblings.length === 0 && <p className="text-xs text-gray-400">No other stores carry this product.</p>}
          <ul className="space-y-2">
            {siblings.map((sibling) => (
              <li key={sibling.id} className="border border-gray-200 rounded-lg p-2.5">
                <p className="text-xs font-medium text-gray-900 truncate">{sibling.store.name}</p>
                <p className="text-xs text-gray-500 truncate mb-2">{sibling.title}</p>
                <div className="flex items-center gap-2 text-xs">
                  {sibling.onlineStoreUrl && (
                    <a
                      href={sibling.onlineStoreUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-blue-600 hover:bg-blue-50 cursor-pointer"
                    >
                      View
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate(sibling)}
                    className="rounded-md border border-gray-200 px-2 py-1 text-blue-600 hover:bg-blue-50 cursor-pointer"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(sibling)}
                    className="rounded-md border border-gray-200 px-2 py-1 text-red-500 hover:bg-red-50 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
