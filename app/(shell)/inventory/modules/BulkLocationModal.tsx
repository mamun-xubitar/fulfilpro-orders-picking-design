'use client';

import { useRef, useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import LocationPickerMenu, { locationChipClass } from './LocationPickerMenu';
import LocationRemapFields from './LocationRemapFields';
import type { BulkLocationsState } from './hooks/useBulkLocations';
import type { LocationsState } from './hooks/useLocations';
import { Close, Plus } from './icons';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

const LABEL = 'mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle';

const MODES = [
  { value: 'add', title: 'Add to existing', hint: 'Keep each variant’s current locations and add these.' },
  { value: 'replace', title: 'Replace', hint: 'Make these exactly each variant’s locations. Choose none to clear them.' },
] as const;

/** Bulk "Set locations" for the variants selected in the Variants / stock table. */
export default function BulkLocationModal({ bulk, locations }: { bulk: BulkLocationsState; locations: LocationsState }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  if (!bulk.open) return null;

  const byId = new Map(locations.options.map((o) => [o.id, o]));
  const showRemap = bulk.mode === 'replace' && bulk.remapNeeds.length > 0 && bulk.locationIds.length > 0;
  // Clearing every location leaves nowhere to move the stock — say so instead of letting Apply fail.
  const clearingStock = bulk.mode === 'replace' && bulk.remapNeeds.length > 0 && bulk.locationIds.length === 0;
  const destinations = bulk.locationIds.map((id) => ({ id, name: byId.get(id)?.name ?? id }));
  const disabled = bulk.saving || (bulk.mode === 'add' && bulk.locationIds.length === 0) || (showRemap && !bulk.remapComplete) || clearingStock;

  return (
    <ModalShell
      disableBackdropClose
      title={`Set locations — ${bulk.count} variant${bulk.count === 1 ? '' : 's'}`}
      compact
      elevated
      onClose={bulk.close}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={bulk.close} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button type="button" onClick={bulk.save} disabled={disabled} className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
            {bulk.saving && SPINNER}
            {bulk.saving ? 'Saving...' : 'Apply'}
          </button>
        </div>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-3`}>
        <div role="radiogroup" aria-label="How to apply" className="grid grid-cols-2 gap-[6px]">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={bulk.mode === m.value}
              onClick={() => bulk.setMode(m.value)}
              className={`rounded-[8px] border p-[6px] text-left transition-colors duration-150 cursor-pointer ${
                bulk.mode === m.value ? 'border-inventory-primary bg-inventory-primary/[6%] ring-1 ring-inventory-primary-ring' : 'border-inventory-border-strong hover:bg-inventory-surface-hover'
              }`}
            >
              <span className="block text-[11px] font-bold text-inventory-text">{m.title}</span>
              <span className="mt-[2px] block text-[10px] leading-snug text-inventory-text-subtle">{m.hint}</span>
            </button>
          ))}
        </div>

        <div>
          <span className={LABEL}>Locations</span>
          <div className="flex flex-wrap items-center gap-[4px]">
            {bulk.locationIds.map((id) => (
              <span key={id} className={`inline-flex items-center gap-[3px] rounded-full border px-[6px] py-[1px] text-[10px] font-semibold leading-[14px] ${locationChipClass(id)}`}>
                {byId.get(id)?.name ?? id}
                <button type="button" aria-label={`Remove ${byId.get(id)?.name ?? 'location'}`} onClick={() => bulk.setLocationIds(bulk.locationIds.filter((l) => l !== id))} className="cursor-pointer opacity-70 hover:opacity-100">
                  <Close className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <button
              ref={anchorRef}
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              className="flex h-[20px] items-center gap-[3px] rounded-full border border-dashed border-inventory-border-strong px-[7px] text-[10px] font-semibold text-inventory-text-subtle transition-colors duration-150 hover:border-inventory-primary hover:text-inventory-primary cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5" />
              Pick locations
            </button>
          </div>
          {bulk.errors.locationIds && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{bulk.errors.locationIds}</p>}
          {bulk.errors.general && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{bulk.errors.general}</p>}
          {clearingStock && (
            <p className="mt-1 text-[10px] leading-tight text-inventory-text-subtle">
              {bulk.remapNeeds.map((n) => n.name).join(', ')} still {bulk.remapNeeds.length === 1 ? 'holds' : 'hold'} stock — pick at least one location to move it into.
            </p>
          )}
        </div>
        {showRemap && (
          <LocationRemapFields needs={bulk.remapNeeds.map((n) => ({ id: n.id, name: n.name, detail: n.detail }))} destinations={destinations} remap={bulk.remap} onChange={bulk.setRemapTarget} />
        )}
      </div>
      <LocationPickerMenu
        anchorRef={anchorRef}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        options={locations.options}
        selectedIds={bulk.locationIds}
        onChange={bulk.setLocationIds}
        onCreate={locations.createInline}
      />
    </ModalShell>
  );
}
