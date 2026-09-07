'use client';

import { formatColourName, isValidCssColor, parseColoursInput, resolveSwatch } from '@/lib/inventory/colour';
import { FieldLabel } from './ProductFieldRows';
import type { ColourOption } from './types';

type ProductColoursFieldProps = {
  /** Comma-separated while editing, e.g. "Red, Blue, Hot Pink". */
  value: string;
  colours: ColourOption[];
  editing: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  error?: string;
};

export default function ProductColoursField({ value, colours, editing, onChange, error }: ProductColoursFieldProps) {
  return (
    <div>
      <FieldLabel>Colours</FieldLabel>
      {editing ? (
        <div className="space-y-1.5">
          <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder="Red, Blue, Hot Pink"
            aria-label="Colours"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-1.5">
            <ColourChips colours={parseColoursInput(value)} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
          {colours.length === 0 ? <span className="text-[13px] text-gray-400">—</span> : <ColourChips colours={colours} />}
        </div>
      )}
    </div>
  );
}

function ColourChips({ colours }: { colours: ColourOption[] }) {
  return (
    <>
      {colours.map((colour, index) => {
        const recognized = isValidCssColor(colour.color);
        return (
          <span
            key={`${colour.name}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700"
          >
            <span
              className={`h-2 w-2 rounded-full ${recognized ? 'ring-1 ring-black/10' : 'border border-dashed border-amber-400'}`}
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
