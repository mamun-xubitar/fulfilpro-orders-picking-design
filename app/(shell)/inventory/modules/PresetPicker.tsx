'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { deriveColorFromName, resolveSwatch } from '@/lib/inventory/colour';
import { Check, Close, Pencil, Plus } from './icons';
import { findCaseInsensitiveDuplicate, keyOf, splitCommaList } from './utils';

type PresetOption = { id: string; name: string; key: string };

type PresetPickerProps = {
  kind: 'colour' | 'size';
  options: PresetOption[];
  /** Lowercased, whitespace-stripped names currently in the field's comma-separated value. */
  selectedKeys: Set<string>;
  onToggle: (name: string) => void;
  onCreate: (name: string) => Promise<string | null>;
  onDelete: (ids: string[]) => Promise<boolean>;
  saving: boolean;
};

/** The dropdown-style preset panel shared by ProductColoursField and ProductSizesField (via
 * PresetComboField) and by the Variants matrix toolbar's Add colour / Add size modals — opens on
 * focus/click of the paired input (the parent owns the container ref + outside-click/escape
 * handling), and lets the admin toggle presets onto the product, add new ones (comma-separated,
 * one DB insert per name), or — via the header's "Update presets" mode — permanently delete one.
 * Colours and sizes are name-only and behave identically here; a colour badge additionally shows
 * a swatch dot, derived from the name at render time (nothing is stored). */
export default function PresetPicker({ kind, options, selectedKeys, onToggle, onCreate, onDelete, saving }: PresetPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [openUp, setOpenUp] = useState(false);

  // Flips the panel above the input when there isn't room below — measured against the anchor
  // (this picker's own positioned parent, per the `relative` wrapper every caller uses) rather
  // than the picker's own rect, so the height read stays stable regardless of which side it's
  // currently drawn on (no flip-flop). Runs before paint so there's no visible jump.
  useLayoutEffect(() => {
    const el = pickerRef.current;
    const anchor = el?.parentElement;
    if (!el || !anchor) return;
    const recalc = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const pickerHeight = el.offsetHeight;
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      setOpenUp(spaceBelow < pickerHeight && anchorRect.top > spaceBelow);
    };
    recalc();
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, []);

  // Off by default — badges only toggle selection. "Update presets" reveals each badge's ×;
  // clicking it (now "OK") leaves the mode again. Left automatically once the last preset here
  // is deleted, so the header never strands the admin in update mode with nothing left to manage.
  const [updating, setUpdating] = useState(false);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const requestDelete = async (option: PresetOption) => {
    setDeletingIds((prev) => new Set(prev).add(option.id));
    const ok = await onDelete([option.id]);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(option.id);
      return next;
    });
    if (ok && options.length <= 1) setUpdating(false);
  };

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetAddForm = () => {
    setAdding(false);
    setNewName('');
    setCreateError(null);
  };

  const parsedNames = splitCommaList(newName);
  const inputDuplicate = findCaseInsensitiveDuplicate(parsedNames);
  const collision = parsedNames.find((name) => options.some((o) => keyOf(o.name) === keyOf(name)));
  const validationError = inputDuplicate
    ? `"${inputDuplicate}" is listed more than once`
    : collision
      ? `"${collision}" already exists`
      : null;
  const displayError = createError ?? validationError;

  const submitCreate = async () => {
    if (parsedNames.length === 0 || validationError) return;
    setSubmitting(true);
    for (const name of parsedNames) {
      const err = await onCreate(name);
      if (err) {
        setCreateError(err);
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(false);
    resetAddForm();
  };

  return (
    <div
      ref={pickerRef}
      className={`absolute z-30 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 w-[min(30rem,90vw)] max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-2 shadow-lg`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{kind === 'colour' ? 'Colour presets' : 'Size presets'}</span>
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => setUpdating((v) => !v)}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-50 cursor-pointer"
          >
            {updating ? (
              <>
                <Check className="h-3 w-3" /> OK
              </>
            ) : (
              <>
                <Pencil className="h-3 w-3" /> Update presets
              </>
            )}
          </button>
        )}
      </div>

      {options.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-400">No presets yet.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {options.map((option) => {
            const selected = selectedKeys.has(keyOf(option.name));
            const deleting = deletingIds.has(option.id);
            return (
              <span
                key={option.id}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px] font-semibold transition-colors duration-150 ${
                  selected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'
                } ${deleting ? 'opacity-40' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!updating) onToggle(option.name);
                  }}
                  disabled={deleting}
                  className={`flex items-center gap-1 disabled:cursor-not-allowed ${updating ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {kind === 'colour' && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: resolveSwatch(deriveColorFromName(option.name)) }}
                    />
                  )}
                  {option.name}
                </button>
                {updating && (
                  <button
                    type="button"
                    onClick={() => void requestDelete(option)}
                    disabled={deleting}
                    aria-label={`Delete ${option.name} preset`}
                    title="Delete preset"
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Close className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="border-t border-gray-100 px-3 pt-1.5">
        {adding ? (
          <div className="space-y-1.5">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setCreateError(null);
              }}
              placeholder={kind === 'colour' ? 'e.g. Hot Pink, Navy' : 'e.g. S, M, L'}
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {displayError && <p className="text-xs text-red-600">{displayError}</p>}
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={resetAddForm}
                className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={parsedNames.length === 0 || !!validationError || saving || submitting}
                className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {saving || submitting ? 'Adding…' : `Add ${parsedNames.length > 1 ? `${parsedNames.length} presets` : 'preset'}`}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add preset
          </button>
        )}
      </div>
    </div>
  );
}
