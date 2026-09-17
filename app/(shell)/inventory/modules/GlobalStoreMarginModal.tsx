'use client';

import { useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import type { GlobalStoreMarginsState } from './hooks/useGlobalStoreMargins';
import { Close, Plus } from './icons';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

type GlobalStoreMarginModalProps = {
  state: GlobalStoreMarginsState;
  onClose: () => void;
};

/**
 * "Per store margin" global-defaults modal, opened from the toolbar's chevron button. Starts
 * empty except for stores that already have a saved margin (`state.openModal()` seeds this before
 * the modal mounts) — add/remove stage local edits, and nothing reaches the server until Save.
 */
export default function GlobalStoreMarginModal({ state, onClose }: GlobalStoreMarginModalProps) {
  const [adding, setAdding] = useState(false);
  const added = state.stores.filter((s) => s.storeId in state.draft);

  const handleSave = async () => {
    await state.save();
    onClose();
  };

  const handleCancel = () => {
    state.discard();
    onClose();
  };

  return (
    <ModalShell disableBackdropClose
      title="Per store margin defaults"
      compact
      onClose={handleCancel}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className={`flex-1 ${WIZARD_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={state.saving}
            className={`flex-1 ${WIZARD_BTN_PRIMARY}`}
          >
            {state.saving && SPINNER}
            {state.saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-2`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] leading-snug text-inventory-text-subtle">Fallback margin used when a product has no store-specific override of its own.</p>
          {state.available.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              aria-label="Add a store"
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-inventory-border-strong text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          )}
        </div>

        {adding && (
          <div className="flex items-center gap-[4px]">
            <select
              autoFocus
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) state.addStore(e.target.value);
                setAdding(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAdding(false);
              }}
              aria-label="Select a store to add"
              className="h-[22px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[10.5px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
            >
              <option value="" disabled>
                Select a store…
              </option>
              {state.available.map((s) => (
                <option key={s.storeId} value={s.storeId}>
                  {s.storeName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Cancel adding a store"
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
            >
              <Close className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {added.length === 0 && !adding ? (
          <p className="py-3 text-center text-[11px] text-inventory-text-subtle">No store margins set. Use + to add one.</p>
        ) : (
          <div className="space-y-1.5">
            {added.map((s) => (
              <div key={s.storeId} className="flex items-center gap-[4px]">
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-none text-inventory-text-muted" title={s.storeName}>
                  {s.storeName}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={state.draft[s.storeId] ?? 0}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isFinite(value) && value >= 0) state.setValue(s.storeId, value);
                    }}
                    aria-label={`Margin for ${s.storeName}`}
                    className="h-[22px] w-[62px] rounded-[7px] border border-inventory-border-strong pl-[6px] pr-[18px] text-right text-[10.5px] leading-none tabular-nums outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                  />
                  <span className="pointer-events-none absolute right-[5px] top-1/2 -translate-y-1/2 text-[9px] leading-none text-inventory-text-subtle">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => state.removeStore(s.storeId)}
                  aria-label={`Remove margin for ${s.storeName}`}
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
                >
                  <Close className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
