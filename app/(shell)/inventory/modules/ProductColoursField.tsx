'use client';

import { formatColourName, isValidCssColor, parseColoursInput, formatColoursInput, resolveSwatch } from '@/lib/inventory/colour';
import PresetComboField from './PresetComboField';
import type { ColourOption } from './types';
import type { InventoryPresetsState } from './hooks/useInventoryPresets';

type ProductColoursFieldProps = {
  /** Comma-separated while editing, e.g. "Red, Blue, Hot Pink". */
  value: string;
  colours: ColourOption[];
  editing: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  /** Sets the comma-separated value directly — used when a preset is toggled from the picker. */
  onValueChange: (next: string) => void;
  error?: string;
  presets: InventoryPresetsState;
};

export default function ProductColoursField({ value, colours, editing, onChange, onValueChange, error, presets }: ProductColoursFieldProps) {
  return (
    <PresetComboField
      label="Colours"
      kind="colour"
      value={value}
      editing={editing}
      onChange={onChange}
      onValueChange={onValueChange}
      error={error}
      presets={presets}
      placeholder="Red, Blue, Hot Pink"
      parse={parseColoursInput}
      format={formatColoursInput}
      renderReadOnly={() => (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
          {colours.length === 0 ? <span className="text-[13px] text-gray-400">—</span> : <ColourChips colours={colours} />}
        </div>
      )}
      renderChips={(entries) => <ColourChips colours={entries.map((e) => ({ name: e.name, color: e.color ?? '' }))} />}
    />
  );
}

export function ColourChips({ colours }: { colours: ColourOption[] }) {
  const sorted = [...colours].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return (
    <>
      {sorted.map((colour, index) => {
        const recognized = isValidCssColor(colour.color);
        return (
          <span
            key={`${colour.name}-${index}`}
            className="inline-flex items-center gap-[3px] rounded-full border border-gray-200 bg-white px-[5px] py-[1px] text-[9px] font-semibold leading-none text-gray-700"
          >
            <span
              className={`h-[6px] w-[6px] rounded-full ${recognized ? 'ring-1 ring-black/10' : 'border border-dashed border-amber-400'}`}
              style={{ backgroundColor: resolveSwatch(colour.color) }}
              title={recognized ? undefined : `"${colour.color}" isn't a recognized colour — showing a placeholder swatch`}
            />
            {formatColourName(colour.name)}
          </span>
        );
      })}
    </>
  );
}
