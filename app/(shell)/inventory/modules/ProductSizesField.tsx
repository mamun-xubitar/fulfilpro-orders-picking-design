'use client';

import PresetComboField from './PresetComboField';
import { capitaliseFirst, parseSizesInput, formatSizesInput } from './utils';
import type { InventoryPresetsState } from './hooks/useInventoryPresets';

type ProductSizesFieldProps = {
  /** Comma-separated while editing, e.g. "50, 52, 54, 56, 58, 60". */
  value: string;
  sizes: string[];
  editing: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  /** Sets the comma-separated value directly — used when a preset is toggled from the picker. */
  onValueChange: (next: string) => void;
  error?: string;
  presets: InventoryPresetsState;
};

export default function ProductSizesField({ value, sizes, editing, onChange, onValueChange, error, presets }: ProductSizesFieldProps) {
  return (
    <PresetComboField
      label="Sizes"
      kind="size"
      value={value}
      editing={editing}
      onChange={onChange}
      onValueChange={onValueChange}
      error={error}
      presets={presets}
      placeholder="50, 52, 54, 56, 58, 60"
      parse={(v) => parseSizesInput(v).map((name) => ({ name }))}
      format={(entries) => formatSizesInput(entries.map((e) => e.name))}
      renderReadOnly={() => (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
          {sizes.length === 0 ? <span className="text-[13px] text-gray-400">—</span> : <SizeChips sizes={sizes} />}
        </div>
      )}
      renderChips={(entries) => <SizeChips sizes={entries.map((e) => e.name)} />}
    />
  );
}

export function SizeChips({ sizes }: { sizes: string[] }) {
  const sorted = [...sizes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return (
    <>
      {sorted.map((size, index) => (
        <span key={`${size}-${index}`} className="rounded-full border border-gray-200 bg-white px-[5px] py-[1px] text-[9px] font-semibold leading-none text-gray-700">
          {capitaliseFirst(size)}
        </span>
      ))}
    </>
  );
}
