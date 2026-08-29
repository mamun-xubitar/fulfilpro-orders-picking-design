'use client';

import { FieldLabel } from './ProductFieldRows';
import { parseSizesInput } from './utils';

type ProductSizesFieldProps = {
  /** Comma-separated while editing, e.g. "50, 52, 54, 56, 58, 60". */
  value: string;
  sizes: string[];
  editing: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  error?: string;
};

export default function ProductSizesField({ value, sizes, editing, onChange, error }: ProductSizesFieldProps) {
  return (
    <div>
      <FieldLabel>Sizes</FieldLabel>
      {editing ? (
        <div className="space-y-1.5">
          <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder="50, 52, 54, 56, 58, 60"
            aria-label="Sizes"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-1.5">
            <SizeChips sizes={parseSizesInput(value)} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
          {sizes.length === 0 ? <span className="text-[13px] text-gray-400">—</span> : <SizeChips sizes={sizes} />}
        </div>
      )}
    </div>
  );
}

function SizeChips({ sizes }: { sizes: string[] }) {
  return (
    <>
      {sizes.map((size, index) => (
        <span key={`${size}-${index}`} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
          {size}
        </span>
      ))}
    </>
  );
}
