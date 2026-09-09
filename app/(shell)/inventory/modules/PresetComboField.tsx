'use client';

import { useEffect, useRef, useState } from 'react';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { FieldLabel } from './ProductFieldRows';
import PresetPicker from './PresetPicker';
import { findCaseInsensitiveDuplicate, keyOf } from './utils';
import type { InventoryPresetsState } from './hooks/useInventoryPresets';

export type PresetEntry = { name: string; color?: string };

type PresetComboFieldProps = {
  label: string;
  kind: 'colour' | 'size';
  /** Comma-separated while editing, e.g. "Red, Blue, Hot Pink" or "50, 52, 54". */
  value: string;
  editing: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  /** Sets the comma-separated value directly — used when a preset is toggled from the picker. */
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
 * handling, instant case-insensitive duplicate validation on the typed list, and writing any
 * brand-new names back to the global preset table on blur. Visual chip rendering stays with each
 * caller — only the interaction logic is shared.
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
  const selectedKeys = new Set(entries.map((e) => keyOf(e.name)));
  const duplicate = findCaseInsensitiveDuplicate(entries.map((e) => e.name));
  const instantError = duplicate ? `"${duplicate}" is listed more than once` : null;
  const displayError = instantError ?? error;

  const toggle = (name: string) => {
    const key = keyOf(name);
    const has = entries.some((e) => keyOf(e.name) === key);
    const next = has ? entries.filter((e) => keyOf(e.name) !== key) : [...entries, { name, color: deriveColorFromName(name) }];
    onValueChange(format(next));
  };

  /** Persists any typed name that isn't already a global preset — one create per missing name,
   * fired when the field loses focus. Skipped while the instant duplicate error is showing, so a
   * malformed in-progress list is never partially written back. */
  const writeBackNewPresets = async () => {
    if (instantError) return;
    const existingKeys = new Set((kind === 'colour' ? presets.colours : presets.sizes).map((o) => keyOf(o.name)));
    const missing = entries.filter((e) => e.name.trim() && !existingKeys.has(keyOf(e.name)));
    for (const entry of missing) {
      if (kind === 'colour') await presets.createColour(entry.name);
      else await presets.createSize(entry.name);
    }
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
              onBlur={() => void writeBackNewPresets()}
              placeholder={placeholder}
              aria-label={label}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {open && (
              <PresetPicker
                kind={kind}
                options={kind === 'colour' ? presets.colours : presets.sizes}
                selectedKeys={selectedKeys}
                onToggle={toggle}
                onCreate={kind === 'colour' ? presets.createColour : presets.createSize}
                onDelete={(ids) => presets.deletePresets(kind, ids)}
                saving={presets.savingPreset}
              />
            )}
          </div>
          {displayError && <p className="mt-1 text-xs text-red-600">{displayError}</p>}
          <div className="flex flex-wrap gap-1.5">{renderChips(entries)}</div>
        </div>
      ) : (
        renderReadOnly()
      )}
    </div>
  );
}
