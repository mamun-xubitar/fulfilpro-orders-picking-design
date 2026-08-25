'use client';

import { FieldLabel } from './ProductFieldRows';

type ProductSizesFieldProps = {
  /** Space-separated while editing, e.g. "50 52 54 56 58 60". */
  value: string;
  sizes: string[];
  editing: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};

export default function ProductSizesField({ value, sizes, editing, onChange }: ProductSizesFieldProps) {
  return (
    <div>
      <FieldLabel>Sizes</FieldLabel>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="50 52 54 56 58 60"
          aria-label="Sizes"
          className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
          {sizes.length === 0 ? (
            <span className="text-[13px] text-gray-400">—</span>
          ) : (
            sizes.map((size) => (
              <span key={size} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                {size}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}
