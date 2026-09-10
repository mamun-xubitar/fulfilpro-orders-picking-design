'use client';

import { useEffect, useRef, useState } from 'react';
import { FieldLabel } from './ProductFieldRows';
import PresetPicker from './PresetPicker';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { findCaseInsensitiveDuplicate, groupKeyOf, groupLabel, keyOf } from './utils';
import type { InventoryPresetsState } from './hooks/useInventoryPresets';

export type PresetEntry = { name: string; color?: string };

type PresetComboFieldProps = {
  label: string;
  kind: 'colour' | 'size';
  /** Comma-separated while editing, e.g. "Red, Blue, Hot Pink" or "50, 52, 54". */
  value: string;
  editing: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  /** Sets the comma-separated value directly — used when a preset group is applied from the picker. */
  onValueChange: (next: string) => void;
  /** Save-time server error (e.g. a duplicate caught on submit) — shown alongside, but not
   * instead of, this field's own instant duplicate check. */
  error?: string;
  presets: InventoryPresetsState;
  placeholder: string;
  parse: (value: string) => PresetEntry[];
  format: (entries: PresetEntry[]) => string;
  /** Read-mode chip row (product not being edited). */
  renderReadOnly: () => React.ReactNode;
  /** Edit-mode chip row, rendered below the input — receives the live parsed entries. */
  renderChips: (entries: PresetEntry[]) => React.ReactNode;
};

/**
 * Shared interactive shell for ProductColoursField and ProductSizesField (and the Variants matrix
 * toolbar's Add colour / Add size modals): owns the dropdown open state, outside-click/Escape
 * handling, and instant case-insensitive duplicate validation on the typed list. Visual chip
 * rendering stays with each caller — only the interaction logic is shared.
 *
 * Persisting a brand-new preset *group* is no longer this field's job — it used to write back on
 * blur, but a group now needs an explicit save moment (Save / Next / Add colour / Add sizes), so
 * that's handled by whichever of those the caller wires up (see useProductDetails' `ensureGroup`
 * argument and its call sites). This field only shows a non-blocking hint when the typed list
 * would create a new group on that save.
 */
export default function PresetComboField({
  label,
  kind,
  value,
  editing,
  onChange,
  onValueChange,
  error,
  presets,
  placeholder,
  parse,
  format,
  renderReadOnly,
  renderChips,
}: PresetComboFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const entries = parse(value);
  const names = entries.map((e) => e.name);
  const selectedKeys = new Set(names.map(keyOf));
  const duplicate = findCaseInsensitiveDuplicate(names);
  const barred = names.find((n) => n.includes('|'));
  const instantError = duplicate ? `"${duplicate}" is listed more than once` : barred ? `A name can't contain the "|" character` : null;
  const displayError = instantError ?? error;

  const groups = kind === 'colour' ? presets.colours : presets.sizes;
  const willCreateGroup = names.length > 0 && !instantError && !groups.some((g) => g.key === groupKeyOf(names));

  /** Clicking a group replaces the whole input with that group's members (in the group's
   * own order), discarding whatever was typed or previously selected. */
  const applyGroup = (items: string[]) => {
    onValueChange(
      format(items.map((name) => (kind === 'colour' ? { name, color: deriveColorFromName(name) } : { name }))),
    );
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {editing ? (
        <div className="space-y-1.5">
          <div className="relative" ref={containerRef}>
            <input
              type="text"
              value={value}
              onChange={onChange}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              placeholder={placeholder}
              aria-label={label}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {open && (
              <PresetPicker
                kind={kind}
                groups={groups}
                selectedKeys={selectedKeys}
                onApplyGroup={applyGroup}
                onCreateGroup={(items) => presets.createGroup(kind, items)}
                onDelete={(ids) => presets.deletePresets(kind, ids)}
                saving={presets.savingPreset}
              />
            )}
          </div>
          {displayError && <p className="mt-1 text-xs text-red-600">{displayError}</p>}
          {!displayError && willCreateGroup && (
            <p className="mt-1 text-xs text-gray-500">A new preset group ({groupLabel(names)}) will be saved on Save.</p>
          )}
          <div className="flex flex-wrap gap-1.5">{renderChips(entries)}</div>
        </div>
      ) : (
        renderReadOnly()
      )}
    </div>
  );
}
