'use client';

import { STATUS_OPTIONS } from './constants';
import type { ProductStatusValue } from './types';

type ProductStatusSelectProps = {
  value: ProductStatusValue;
  onChange: (status: ProductStatusValue) => void;
  id?: string;
  className?: string;
};

/** Shopify-style status select — Active / Draft / Unlisted, each with Shopify's own
 * explanatory copy shown underneath. Single source of truth for every status dropdown in the
 * hub (Product Details, the store publish/bulk-update drafts) — see `STATUS_OPTIONS`. */
export default function ProductStatusSelect({ value, onChange, id, className }: ProductStatusSelectProps) {
  const hint = STATUS_OPTIONS.find((o) => o.value === value)?.hint;

  return (
    <div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as ProductStatusValue)}
        aria-label="Status"
        className={
          className ??
          'rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer'
        }
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
