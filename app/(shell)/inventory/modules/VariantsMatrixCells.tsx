'use client';

/** Read and edit cells for one variants / stock matrix row. */

import { formatIncomingLot } from './utils';
import type { ColourOption, IncomingLot } from './types';

const INPUT_BASE =
  'rounded-lg border border-gray-300 bg-white px-2 py-1 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export function Num({ value, bold, muted, className, title }: { value: string; bold?: boolean; muted?: boolean; className?: string; title?: string }) {
  return (
    <td
      title={title}
      className={`px-2 py-2 text-right text-[13px] tabular-nums ${className ?? ''} ${
        className ? '' : bold ? 'font-bold text-gray-900' : muted ? 'text-gray-500' : 'text-gray-700'
      }`}
    >
      {value}
    </td>
  );
}

export function NumCell({
  value,
  label,
  step,
  title,
  onChange,
}: {
  value: number;
  label: string;
  step?: string;
  title?: string;
  onChange: (value: number) => void;
}) {
  return (
    <td className="px-2 py-2 text-right" title={title}>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        aria-label={label}
        className={`w-20 text-right tabular-nums ${INPUT_BASE}`}
      />
    </td>
  );
}

/** Incoming: one "qty · date" line per open PO, read-only. */
export function IncomingCell({ lots }: { lots: IncomingLot[] }) {
  if (lots.length === 0) {
    return <td className="px-2 py-2 text-right text-[13px] text-gray-400">—</td>;
  }
  return (
    <td className="px-2 py-2 text-right text-[13px] text-gray-500">
      {lots.map((lot, i) => (
        <div key={i} className="tabular-nums whitespace-nowrap">
          {formatIncomingLot(lot)}
        </div>
      ))}
    </td>
  );
}

export function ColourCell({
  value,
  colours,
  swatch,
  label,
  onChange,
}: {
  value: string;
  colours: ColourOption[];
  swatch: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: swatch }} />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`w-28 cursor-pointer ${INPUT_BASE}`}>
        {colours.every((c) => c.name !== value) && <option value={value}>{value}</option>}
        {colours.map((colour) => (
          <option key={colour.name} value={colour.name}>
            {colour.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SizeCell({
  value,
  sizes,
  label,
  onChange,
}: {
  value: string;
  sizes: string[];
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <td className="px-2 py-2">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`w-20 cursor-pointer ${INPUT_BASE}`}>
        {!sizes.includes(value) && <option value={value}>{value}</option>}
        {sizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </td>
  );
}

export function SkuCell({
  sku,
  barcode,
  onChangeSku,
  onChangeBarcode,
}: {
  sku: string | null;
  barcode: string | null;
  onChangeSku: (value: string) => void;
  onChangeBarcode: (value: string) => void;
}) {
  return (
    <td className="px-2 py-2">
      <input
        type="text"
        value={sku ?? ''}
        onChange={(e) => onChangeSku(e.target.value)}
        aria-label="SKU"
        className={`mb-1 block w-32 font-medium ${INPUT_BASE}`}
      />
      <input
        type="text"
        value={barcode ?? ''}
        onChange={(e) => onChangeBarcode(e.target.value)}
        aria-label="Barcode"
        className={`block w-32 tabular-nums ${INPUT_BASE}`}
      />
    </td>
  );
}

export function RowAction({ label, onClick, danger, primary, children }: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg border p-1.5 transition-colors duration-150 cursor-pointer ${
        primary
          ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
          : danger
            ? 'border-gray-300 bg-white text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600'
            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}
