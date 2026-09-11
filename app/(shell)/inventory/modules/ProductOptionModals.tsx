'use client';

import { useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { formatColoursInput, parseColoursInput } from '@/lib/inventory/colour';
import PresetComboField from './PresetComboField';
import { ColourChips } from './ProductColoursField';
import { SizeChips } from './ProductSizesField';
import type { InventoryPresetsState } from './hooks/useInventoryPresets';
import { formatSizesInput, parseSizesInput } from './utils';

type EditSizesModalProps = {
  initialValue: string;
  presets: InventoryPresetsState;
  onClose: () => void;
  onSave: (next: string) => void;
};

/**
 * Sizes editor opened from Product details' "+" button — the same input + dropdown
 * as the inline field used to be (PresetComboField with preset groups, add/delete
 * group, instant duplicate validation, chip preview), prefilled with the draft's
 * current comma-separated value. Writes back via onSave (draft only — the panel's
 * own Save still persists, so dirty/validation/ensureGroup behaviour is unchanged).
 */
export function EditSizesModal({ initialValue, presets, onClose, onSave }: EditSizesModalProps) {
  const [value, setValue] = useState(initialValue);
  const sizes = parseSizesInput(value);

  const handleSave = () => {
    if (sizes.length === 0) return;
    onSave(value);
    onClose();
  };

  return (
    <ModalShell
      title="Sizes"
      onClose={onClose}
      wide
      allowOverflow
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[22px] flex-1 rounded-[6px] border border-gray-300 bg-white px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={sizes.length === 0}
            className="h-[22px] flex-1 rounded-[6px] bg-blue-600 px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Save
          </button>
        </div>
      }
    >
      <PresetComboField
        label="Sizes"
        kind="size"
        value={value}
        editing
        onChange={(e) => setValue(e.target.value)}
        onValueChange={setValue}
        presets={presets}
        placeholder="50, 52, 54, 56, 58, 60"
        parse={(v) => parseSizesInput(v).map((name) => ({ name }))}
        format={(entries) => formatSizesInput(entries.map((e) => e.name))}
        renderReadOnly={() => null}
        renderChips={(entries) => <SizeChips sizes={entries.map((e) => e.name)} />}
      />
    </ModalShell>
  );
}

type EditColoursModalProps = {
  initialValue: string;
  presets: InventoryPresetsState;
  onClose: () => void;
  onSave: (next: string) => void;
};

/**
 * Colours editor — same contract as EditSizesModal: prefilled input + preset
 * dropdown, draft-only save via onSave.
 */
export function EditColoursModal({ initialValue, presets, onClose, onSave }: EditColoursModalProps) {
  const [value, setValue] = useState(initialValue);
  const names = parseColoursInput(value);

  const handleSave = () => {
    if (names.length === 0) return;
    onSave(value);
    onClose();
  };

  return (
    <ModalShell
      title="Colours"
      onClose={onClose}
      wide
      allowOverflow
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[22px] flex-1 rounded-[6px] border border-gray-300 bg-white px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={names.length === 0}
            className="h-[22px] flex-1 rounded-[6px] bg-blue-600 px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Save
          </button>
        </div>
      }
    >
      <PresetComboField
        label="Colours"
        kind="colour"
        value={value}
        editing
        onChange={(e) => setValue(e.target.value)}
        onValueChange={setValue}
        presets={presets}
        placeholder="Red, Blue, Hot Pink"
        parse={parseColoursInput}
        format={formatColoursInput}
        renderReadOnly={() => null}
        renderChips={(entries) => <ColourChips colours={entries.map((e) => ({ name: e.name, color: e.color ?? '' }))} />}
      />
    </ModalShell>
  );
}
