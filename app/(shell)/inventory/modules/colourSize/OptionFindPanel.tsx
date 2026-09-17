'use client';

import { useState } from 'react';
import { deriveColorFromName, resolveSwatch } from '@/lib/inventory/colour';
import { ModalActions, ModalShell } from '@/components/ModalShell';
import { Search, Trash } from '../icons';
import type { OptionItem } from './useColourSizeModal';

type OptionFindPanelProps = {
  kind: 'colour' | 'size';
  items: OptionItem[];
  onClose: () => void;
  /** Checks the matching row in the column (a name not yet checked) and closes the panel. */
  onSelect: (name: string) => void;
  /** Permanently removes a name from the global library — only offered for library-backed rows
   * (an `id`); a NEW, not-yet-saved name has nothing in the library to delete. */
  onDelete: (id: string) => void;
};

/** A small search popover over the column's own list (which already mirrors the whole global
 * library plus anything new) — lets you jump to and check a name without scrolling, and delete a
 * saved name from the library outright. */
export default function OptionFindPanel({ kind, items, onClose, onSelect, onDelete }: OptionFindPanelProps) {
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<OptionItem | null>(null);

  const matches = items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <div
        className="absolute right-0 top-[24px] z-20 w-[220px] rounded-[8px] border border-inventory-border bg-inventory-surface shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-[4px] border-b border-inventory-border p-[6px]">
          <Search className="h-3 w-3 shrink-0 text-inventory-text-subtle" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search"
            className="h-[20px] flex-1 min-w-0 border-none bg-transparent text-[11px] outline-none"
          />
          <button type="button" onClick={onClose} className="text-[10px] font-bold text-inventory-text-subtle hover:text-inventory-text-muted cursor-pointer">
            Close
          </button>
        </div>
        <div className="max-h-[220px] overflow-y-auto thin-scroll p-[4px]">
          {matches.length === 0 && <p className="px-[6px] py-[6px] text-[11px] text-inventory-text-subtle">No matches</p>}
          {matches.map((item) => (
            <div key={item.name} className="flex items-center gap-[6px] rounded-[6px] px-[6px] py-[4px] hover:bg-inventory-surface-hover">
              <button
                type="button"
                onClick={() => onSelect(item.name)}
                className="flex flex-1 items-center gap-[6px] text-left text-[11px] text-inventory-text cursor-pointer"
              >
                {kind === 'colour' && (
                  <span
                    className="h-[7px] w-[7px] shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: resolveSwatch(deriveColorFromName(item.name)) }}
                  />
                )}
                <span className="uppercase">{item.name}</span>
              </button>
              {item.checked && <span className="text-[9px] font-bold uppercase text-inventory-primary">✓</span>}
              {item.id && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(item)}
                  aria-label={`Delete ${item.name} from library`}
                  title="Delete from library"
                  className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-danger/10 hover:text-inventory-danger cursor-pointer"
                >
                  <Trash className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {pendingDelete && (
        <ModalShell
          disableBackdropClose
          elevated
          compact
          title="Delete from library?"
          onClose={() => setPendingDelete(null)}
          footer={
            <ModalActions
              onCancel={() => setPendingDelete(null)}
              onConfirm={() => {
                if (pendingDelete.id) onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
              confirmLabel="Delete"
              disabled={false}
              danger
              compact
            />
          }
        >
          <p className="text-[12px] text-inventory-text-muted">
            Remove <span className="font-semibold text-inventory-text">{pendingDelete.name}</span> from the shared library? Other products keep any variants
            using it — this only removes it from future lists.
          </p>
        </ModalShell>
      )}
    </>
  );
}
