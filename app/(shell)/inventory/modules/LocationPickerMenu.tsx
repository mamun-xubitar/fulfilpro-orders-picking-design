'use client';

import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';
import type { LocationOption } from './hooks/useLocations';
import { Plus } from './icons';

/** Cycled by a hash of the location id so a location keeps the same colour in every row it appears
 * in — the stacked chips in the variants table read as "this shelf", not "the 2nd chip". The class
 * strings are spelled out in full so Tailwind sees them. */
const LOCATION_CHIP_COLORS = [
  'border-inventory-sec-stock/30 bg-inventory-sec-stock/10 text-inventory-sec-stock',
  'border-inventory-sec-pricing/30 bg-inventory-sec-pricing/10 text-inventory-sec-pricing',
  'border-inventory-sec-po/30 bg-inventory-sec-po/10 text-inventory-sec-po',
  'border-inventory-sec-variants/30 bg-inventory-sec-variants/10 text-inventory-sec-variants',
  'border-inventory-sec-stocktake/30 bg-inventory-sec-stocktake/10 text-inventory-sec-stocktake',
  'border-inventory-sec-adjust/30 bg-inventory-sec-adjust/10 text-inventory-sec-adjust',
  'border-inventory-sec-import/30 bg-inventory-sec-import/10 text-inventory-sec-import',
  'border-inventory-sec-details/30 bg-inventory-sec-details/10 text-inventory-sec-details',
];

export function locationChipClass(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return LOCATION_CHIP_COLORS[hash % LOCATION_CHIP_COLORS.length];
}

type LocationPickerMenuProps = {
  anchorRef: { readonly current: Element | null };
  open: boolean;
  onClose: () => void;
  options: LocationOption[];
  selectedIds: string[];
  /** `created` is set when the change came from the "Create" row, so the caller can name a location its own option list doesn't hold yet. */
  onChange: (ids: string[], created?: LocationOption) => void;
  /** Creates a location named `name` and resolves to it; omit to hide the create row. */
  onCreate?: (name: string) => Promise<LocationOption | null>;
};

/** The searchable multi-select dropdown behind every location control — same mechanics and classes
 * as SupplierMultiSelect's menu (portalled, anchored, checkbox rows, "Create ‘X’" when the search
 * matches nothing). Selected-at-open locations are pinned to the top so a long list stays reviewable. */
export default function LocationPickerMenu({ anchorRef, open, onClose, options, selectedIds, onChange, onCreate }: LocationPickerMenuProps) {
  const [query, setQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [wasOpen, setWasOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose, width: 260, maxHeight: 240 });

  // Snapshot the selection each time the menu opens (adjusted during render, not in an effect).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPinnedIds(selectedIds);
      setQuery('');
    }
  }

  const term = query.trim().toLowerCase();
  const results = useMemo(() => {
    const base = term ? options.filter((o) => o.name.toLowerCase().includes(term)) : options;
    if (term || pinnedIds.length === 0) return base;
    const pinned = new Set(pinnedIds);
    return [...base.filter((o) => pinned.has(o.id)), ...base.filter((o) => !pinned.has(o.id))];
  }, [options, term, pinnedIds]);

  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  const canCreate = Boolean(onCreate) && term !== '' && !options.some((o) => o.name.toLowerCase() === term);

  const create = async () => {
    if (!onCreate) return;
    setCreating(true);
    const created = await onCreate(query.trim());
    setCreating(false);
    if (!created) return;
    onChange([...selectedIds, created.id], created);
    setQuery('');
  };

  if (!open || !position || typeof document === 'undefined') return null;
  return createPortal(
    <div className="inventory-theme">
      <div
        ref={dropdownRef}
        style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
        className="inventory-dropdown-in z-[70] flex max-h-60 flex-col overflow-hidden rounded-lg border border-inventory-border bg-inventory-surface py-1 shadow-lg"
      >
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && canCreate) {
              e.preventDefault();
              void create();
            }
          }}
          placeholder="Search locations…"
          aria-label="Search locations"
          className="mx-1 mb-1 h-[24px] shrink-0 rounded-[6px] border border-inventory-border px-[6px] text-[11px] leading-none outline-none placeholder:text-inventory-text-subtle focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
        />
        <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
          {options.length === 0 && !term && <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">No locations yet — type a name to create one.</div>}
          {results.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px] leading-none hover:bg-inventory-surface-hover">
              <input type="checkbox" checked={selectedIds.includes(o.id)} onChange={() => toggle(o.id)} className="h-3 w-3 shrink-0 cursor-pointer accent-inventory-primary" />
              <span className="truncate text-inventory-text">{o.name}</span>
            </label>
          ))}
          {results.length === 0 && term && !canCreate && <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">No locations match “{query.trim()}”.</div>}
          {canCreate && (
            <button
              type="button"
              onClick={create}
              disabled={creating}
              className="flex w-full items-center gap-1.5 border-t border-inventory-divider px-2 py-1 text-left text-[11px] font-semibold text-inventory-secondary hover:bg-inventory-secondary/10 disabled:opacity-60 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Create location “{query.trim()}”
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
