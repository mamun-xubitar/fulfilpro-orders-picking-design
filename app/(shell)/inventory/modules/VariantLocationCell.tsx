'use client';

import { useRef, useState } from 'react';
import LocationPickerMenu, { locationChipClass } from './LocationPickerMenu';
import { useInventoryAccess } from './InventoryAccess';
import { CellSave } from './VariantsMatrixCells';
import type { LocationOption } from './hooks/useLocations';
import { Plus } from './icons';
import type { VariantRow } from './types';

type VariantLocationCellProps = {
  locations: VariantRow['locations'];
  /** The row's unassigned stock on hand — carried into the first location picked for a variant
   * that had none, so tagging a location never changes the total. */
  unassignedStock: number;
  options: LocationOption[];
  dirty: boolean;
  saving: boolean;
  label: string;
  onChange: (locations: VariantRow['locations']) => void;
  onSave: () => void;
  onCreate: (name: string) => Promise<LocationOption | null>;
};

/** A variant's locations: one colour-coded chip per location, stacked like the Incoming column, with
 * a "Total" line under several (beside the Stock on hand cell's total). Clicking the stack (or "+")
 * opens the searchable multi-select; edits are a draft until the cell's own save button (or the
 * row's Save) writes them. A kept location keeps its stock; a newly picked one starts at 0. */
export default function VariantLocationCell({ locations, unassignedStock, options, dirty, saving, label, onChange, onSave, onCreate }: VariantLocationCellProps) {
  const [open, setOpen] = useState(false);
  const { canEdit } = useInventoryAccess();
  const anchorRef = useRef<HTMLButtonElement>(null);
  // Names come from the live option list so a rename shows without a reload; a draft may hold a
  // location the option list hasn't re-fetched yet, so fall back to the draft's own copy.
  const byId = new Map([...locations, ...options].map((o) => [o.id, o]));

  return (
    <td className="px-[4px] py-[2px]">
      <div className="flex items-center gap-[2px]">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={!canEdit}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          className="flex min-h-[15px] min-w-[84px] flex-col items-start gap-[2px] rounded-[5px] border border-transparent px-[2px] py-[1px] text-left transition-colors duration-150 hover:border-inventory-border-strong hover:bg-inventory-surface-hover cursor-pointer disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-transparent"
        >
          {locations.length === 0 ? (
            <span className="inline-flex items-center gap-[2px] text-[9px] font-semibold leading-[13px] text-inventory-text-subtle">
              <Plus className="h-2.5 w-2.5" />
              Location
            </span>
          ) : (
            locations.map((l) => (
              <span
                key={l.id}
                title={byId.get(l.id)?.name ?? l.name}
                className={`inline-flex max-w-[110px] items-center truncate whitespace-nowrap rounded-[4px] border px-[3px] text-[9px] font-semibold leading-[13px] ${locationChipClass(l.id)}`}
              >
                <span className="truncate">{byId.get(l.id)?.name ?? l.name}</span>
              </span>
            ))
          )}
          {locations.length > 1 && <span className="text-[9px] font-semibold leading-[15px] text-inventory-text-subtle">Total</span>}
        </button>
        <CellSave show={dirty} saving={saving} label={`Save ${label}`} onSave={onSave} />
      </div>
      <LocationPickerMenu
        anchorRef={anchorRef}
        open={open}
        onClose={() => setOpen(false)}
        options={options}
        selectedIds={locations.map((l) => l.id)}
        onChange={(ids, created) => {
          const lookup = created ? new Map(byId).set(created.id, created) : byId;
          const next = ids
            .map((id) => {
              const kept = locations.find((l) => l.id === id);
              const option = lookup.get(id);
              return kept ?? (option ? { id, name: option.name, quantity: 0 } : null);
            })
            .filter((l): l is VariantRow['locations'][number] => Boolean(l))
            .sort((a, b) => a.name.localeCompare(b.name));
          if (locations.length === 0 && next.length > 0) next[0] = { ...next[0], quantity: unassignedStock };
          onChange(next);
        }}
        onCreate={onCreate}
      />
    </td>
  );
}
