'use client';

import { ModalShell } from '@/components/ModalShell';
import type { LocationsState } from './hooks/useLocations';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

const LABEL = 'mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle';

/** Create / edit a location — name (unique, upper-cased server-side) and an optional note. */
export default function LocationModal({ locations: l }: { locations: LocationsState }) {
  if (!l.modalOpen) return null;

  return (
    <ModalShell
      disableBackdropClose
      title={l.editingId ? 'Edit location' : 'Add location'}
      compact
      elevated
      onClose={l.closeModal}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={l.closeModal} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button type="button" onClick={l.save} disabled={l.form.name.trim() === '' || l.saving} className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
            {l.saving && SPINNER}
            {l.saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-2`}>
        <div>
          <label className={LABEL} htmlFor="location-name">
            Name
          </label>
          <input
            id="location-name"
            type="text"
            autoFocus
            value={l.form.name}
            onChange={l.set('name')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && l.form.name.trim() && !l.saving) l.save();
            }}
            placeholder="A1-03"
            className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] uppercase leading-none outline-none placeholder:normal-case placeholder:text-inventory-text-subtle focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
          {l.saveErrors.name && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{l.saveErrors.name}</p>}
        </div>
        <div>
          <label className={LABEL} htmlFor="location-description">
            Description
          </label>
          <textarea
            id="location-description"
            rows={3}
            value={l.form.description}
            onChange={l.set('description')}
            placeholder="Optional — e.g. Back warehouse, second rack"
            className="w-full resize-none rounded-[7px] border border-inventory-border-strong px-[6px] py-[4px] text-[11px] leading-tight outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
        </div>
        {l.saveErrors.general && <p className="text-[10px] leading-tight text-inventory-danger">{l.saveErrors.general}</p>}
      </div>
    </ModalShell>
  );
}
