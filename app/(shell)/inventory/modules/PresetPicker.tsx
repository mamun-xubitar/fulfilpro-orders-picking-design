'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { deriveColorFromName, formatColourName, resolveSwatch } from '@/lib/inventory/colour';
import { Check, Close, Pencil, Plus } from './icons';
import { capitaliseFirst, findCaseInsensitiveDuplicate, groupKeyOf, keyOf, splitCommaList } from './utils';

export type PresetGroupOption = { id: string; items: string[]; key: string };

type PresetPickerProps = {
  kind: 'colour' | 'size';
  groups: PresetGroupOption[];
  /** Lowercased, whitespace-stripped names currently in the field's comma-separated value. */
  selectedKeys: Set<string>;
  /** Clicking a group replaces the field's whole value with that group's members. */
  onApplyGroup: (items: string[]) => void;
  onCreateGroup: (items: string[]) => Promise<string | null>;
  onDelete: (ids: string[]) => Promise<boolean>;
  saving: boolean;
};

/** The dropdown-style preset panel shared by ProductColoursField and ProductSizesField (via
 * PresetComboField) and by the Variants matrix toolbar's Add colour / Add size modals — opens on
 * focus/click of the paired input (the parent owns the container ref + outside-click/escape
 * handling), and lets the admin replace the field's value with a preset *group* (every member
 * at once), add a new group (comma-separated members, one DB insert), or — via the header's
 * "Update presets" mode — permanently delete one. Colours and sizes behave identically here; a
 * colour group additionally shows one swatch dot per member, derived from each name at render
 * time (nothing is stored). */
export default function PresetPicker({ kind, groups, selectedKeys, onApplyGroup, onCreateGroup, onDelete, saving }: PresetPickerProps) {
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
  // clicking it (now "OK") leaves the mode again. Left automatically once the last group here
  // is deleted, so the header never strands the admin in update mode with nothing left to manage.
  const [updating, setUpdating] = useState(false);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const requestDelete = async (group: PresetGroupOption) => {
    setDeletingIds((prev) => new Set(prev).add(group.id));
    const ok = await onDelete([group.id]);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(group.id);
      return next;
    });
    if (ok && groups.length <= 1) setUpdating(false);
  };

  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetAddForm = () => {
    setAdding(false);
    setNewValue('');
    setCreateError(null);
  };

  const parsedNames = splitCommaList(newValue);
  const memberDuplicate = findCaseInsensitiveDuplicate(parsedNames);
  const barred = parsedNames.find((n) => n.includes('|'));
  const alreadyExists = parsedNames.length > 0 ? groups.some((g) => g.key === groupKeyOf(parsedNames)) : false;
  const validationError = memberDuplicate
    ? `"${memberDuplicate}" is listed more than once`
    : barred
      ? `A name can't contain the "|" character`
      : alreadyExists
        ? 'This group already exists'
        : null;
  const displayError = createError ?? validationError;

  const submitCreate = async () => {
    if (parsedNames.length === 0 || validationError) return;
    setSubmitting(true);
    const err = await onCreateGroup(parsedNames);
    setSubmitting(false);
    if (err) setCreateError(err);
    else resetAddForm();
  };

  return (
    <div
      ref={pickerRef}
      className={`absolute z-30 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 w-[min(30rem,90vw)] max-h-72 overflow-y-auto rounded-lg border border-inventory-border bg-inventory-surface py-2 shadow-lg`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-inventory-text-subtle">{kind === 'colour' ? 'Colour presets' : 'Size presets'}</span>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={() => setUpdating((v) => !v)}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-inventory-text-subtle hover:bg-inventory-surface-hover cursor-pointer"
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

      {groups.length === 0 ? (
        <div className="px-3 py-2 text-xs text-inventory-text-subtle">No presets yet.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {groups.map((group) => {
            const present = group.items.filter((n) => selectedKeys.has(keyOf(n))).length;
            const state = present === 0 ? 'none' : present === group.items.length ? 'all' : 'some';
            const deleting = deletingIds.has(group.id);
            return (
              <span
                key={group.id}
                className={`inline-flex items-center gap-1 whitespace-normal rounded-full border px-2 py-1 text-[12px] font-semibold transition-colors duration-150 ${
                  state === 'all'
                    ? 'border-inventory-primary bg-inventory-secondary/10 text-inventory-secondary'
                    : state === 'some'
                      ? 'border-inventory-secondary/35 bg-inventory-surface text-inventory-secondary'
                      : 'border-inventory-border bg-inventory-surface text-inventory-text-muted'
                } ${deleting ? 'opacity-40' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!updating) onApplyGroup(group.items);
                  }}
                  disabled={deleting}
                  className={`flex items-center gap-1 disabled:cursor-not-allowed ${updating ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <GroupBadgeContent kind={kind} items={group.items} />
                  {state === 'some' && (
                    <span className="text-[10px] text-inventory-secondary">
                      {present}/{group.items.length}
                    </span>
                  )}
                </button>
                {updating && (
                  <button
                    type="button"
                    onClick={() => void requestDelete(group)}
                    disabled={deleting}
                    aria-label={`Delete preset group ${group.items.join(', ')}`}
                    title="Delete preset group"
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-inventory-text-subtle hover:bg-inventory-danger/10 hover:text-inventory-danger-hover disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Close className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="border-t border-inventory-divider px-3 pt-1.5">
        {adding ? (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-inventory-text-subtle">New group members (comma separated)</label>
            <input
              autoFocus
              type="text"
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value);
                setCreateError(null);
              }}
              placeholder={kind === 'colour' ? 'e.g. Red, Green, Blue' : 'e.g. S, M, L, XL'}
              className="w-full rounded-md border border-inventory-border-strong px-2 py-1 text-[13px] outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
            />
            {parsedNames.length > 0 && !displayError && (
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-inventory-border bg-inventory-surface-muted px-2 py-1 text-[12px] font-semibold text-inventory-text-muted">
                  <GroupBadgeContent kind={kind} items={parsedNames} />
                </span>
              </div>
            )}
            {displayError && <p className="text-xs text-inventory-danger">{displayError}</p>}
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={resetAddForm}
                className="flex-1 rounded-md border border-inventory-border-strong bg-inventory-surface px-2 py-1 text-[12px] font-semibold text-inventory-text-muted hover:bg-inventory-surface-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={parsedNames.length === 0 || !!validationError || saving || submitting}
                className="flex-1 rounded-md bg-inventory-primary px-2 py-1 text-[12px] font-semibold text-white hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {saving || submitting ? 'Adding…' : `Add group${parsedNames.length > 1 ? ` (${parsedNames.length})` : ''}`}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-[13px] font-semibold text-inventory-secondary hover:bg-inventory-secondary/10 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add group
          </button>
        )}
      </div>
    </div>
  );
}

/** Shared badge content — a run of overlapping swatch dots (colours only, capped at 4 + "+N")
 * followed by the member list, formatted per-kind. Used both by the group list above and the
 * add-form's live preview, so what the admin previews matches what the badge will look like. */
function GroupBadgeContent({ kind, items }: { kind: 'colour' | 'size'; items: string[] }) {
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  const label = items.map((name) => (kind === 'colour' ? formatColourName(name) : capitaliseFirst(name))).join(', ');
  return (
    <>
      {kind === 'colour' && (
        <span className="flex items-center">
          {shown.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className={`h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 ${i > 0 ? '-ml-1' : ''}`}
              style={{ backgroundColor: resolveSwatch(deriveColorFromName(name)) }}
            />
          ))}
          {extra > 0 && <span className="ml-1 text-[10px] text-inventory-text-subtle">+{extra}</span>}
        </span>
      )}
      {label}
    </>
  );
}
