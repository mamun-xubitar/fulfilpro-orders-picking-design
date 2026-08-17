'use client';

import { Plus, Trash } from './icons';
import { FieldLabel } from './ProductFieldRows';
import type { ColourOption } from './types';

type ProductColoursFieldProps = {
  colours: ColourOption[];
  editing: boolean;
  swatchOf: (colour: string) => string;
  onChange: (index: number, patch: Partial<ColourOption>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export default function ProductColoursField({ colours, editing, swatchOf, onChange, onAdd, onRemove }: ProductColoursFieldProps) {
  return (
    <div>
      <FieldLabel>Colours</FieldLabel>
      {editing ? (
        <div className="space-y-1.5">
          {colours.map((colour, index) => (
            <ColourRow
              key={index}
              colour={colour}
              onChange={(patch) => onChange(index, patch)}
              onRemove={() => onRemove(index)}
            />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-1.5 text-[11px] font-semibold text-gray-500 transition-colors duration-150 hover:border-blue-400 hover:text-blue-600 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add colour
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
          {colours.length === 0 ? (
            <span className="text-[13px] text-gray-400">—</span>
          ) : (
            colours.map((colour, index) => (
              <span
                key={`${colour.name}-${index}`}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700"
              >
                <span className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: swatchOf(colour.name) }} />
                {colour.name}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ColourRow({
  colour,
  onChange,
  onRemove,
}: {
  colour: ColourOption;
  onChange: (patch: Partial<ColourOption>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={colour.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Black"
        aria-label="Colour name"
        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <input
        type="color"
        value={colour.hex}
        onChange={(e) => onChange({ hex: e.target.value })}
        aria-label={`Colour for ${colour.name || 'new colour'}`}
        className="h-7 w-9 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white p-0.5"
      />
      <span className="w-16 shrink-0 text-[11px] uppercase text-gray-400 tabular-nums">{colour.hex}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${colour.name || 'colour'}`}
        className="shrink-0 rounded-lg border border-gray-300 bg-white p-1.5 text-gray-400 transition-colors duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-600 cursor-pointer"
      >
        <Trash className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
