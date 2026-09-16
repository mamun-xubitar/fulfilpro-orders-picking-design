'use client';

/** Read and edit cells for one variants / stock matrix row. Sizing matches the prototype's
 * `.t-sm` table density literally: 4px cell padding, 10px cell text, 15px-tall cell inputs. */

import { formatColourName } from '@/lib/inventory/colour';
import { formatPoNumber } from '@/lib/inventory/po-number';
import { formatIncomingLot } from './utils';
import type { IncomingLot } from './types';

const CELL_CLASS = 'px-[4px] py-0';

/** Cycled by position so several open POs on one row stay visually distinct from each other —
 * not tied to a specific PO's identity, just "a different colour per badge in this cell". */
const INCOMING_BADGE_COLORS = [
  'border-amber-200 bg-amber-50 text-amber-800',
  'border-indigo-200 bg-indigo-50 text-indigo-700',
  'border-sky-200 bg-sky-50 text-sky-700',
  'border-violet-200 bg-violet-50 text-violet-700',
];
const INPUT_BASE =
  'h-[15px] rounded-[5px] border border-gray-300 bg-white px-[3px] text-[9.5px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export function Num({ value, bold, muted, className, title }: { value: string; bold?: boolean; muted?: boolean; className?: string; title?: string }) {
  return (
    <td
      title={title}
      className={`${CELL_CLASS} text-right text-[10px] leading-none tabular-nums ${className ?? ''} ${
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
    <td className={`${CELL_CLASS} text-right`} title={title}>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        aria-label={label}
        className={`w-14 text-right tabular-nums ${INPUT_BASE}`}
      />
    </td>
  );
}

/** Incoming: one "qty (date)" line per open PO — the original layout, with each line now a
 * colour-coded badge (cycled per position) so several open POs on one row stay visually
 * distinct, and a title tooltip carrying the PO number and status. */
export function IncomingCell({ lots }: { lots: IncomingLot[] }) {
  if (lots.length === 0) {
    return <td className={`${CELL_CLASS} text-right text-[10px] leading-none text-gray-400`}>—</td>;
  }
  return (
    <td className={`${CELL_CLASS} text-right`}>
      <div className="flex flex-col items-end gap-[2px]">
        {lots.map((lot, i) => (
          <span
            key={i}
            title={`${formatPoNumber(lot.poNumber)} · ${lot.status.replace('_', ' ')}`}
            className={`inline-flex items-center whitespace-nowrap rounded-[4px] border px-[3px] text-[9px] font-semibold leading-[13px] tabular-nums ${
              INCOMING_BADGE_COLORS[i % INCOMING_BADGE_COLORS.length]
            }`}
          >
            {formatIncomingLot(lot)}
          </span>
        ))}
      </div>
    </td>
  );
}

/** Colour/size are text, not editable selects — the colour and size axes are owned by Product
 * details (they drive variant reconciliation there), so the matrix only ever displays them. */
export function ColourCell({ value, swatch }: { value: string; swatch: string }) {
  return (
    <div className="flex items-center gap-[4px]">
      <span className="h-[7px] w-[7px] shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: swatch }} />
      <span className="truncate text-[10px] leading-none text-gray-700">{value ? formatColourName(value) : '—'}</span>
    </div>
  );
}

export function SizeCell({ value }: { value: string }) {
  return (
    <td className={CELL_CLASS}>
      <span className="truncate text-[10px] leading-none text-gray-700">{value || '—'}</span>
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
    <td className={CELL_CLASS}>
      <input type="text" value={sku ?? ''} onChange={(e) => onChangeSku(e.target.value)} aria-label="SKU" className={`mb-[2px] block w-24 font-medium ${INPUT_BASE}`} />
      <input type="text" value={barcode ?? ''} onChange={(e) => onChangeBarcode(e.target.value)} aria-label="Barcode" className={`block w-24 tabular-nums ${INPUT_BASE}`} />
    </td>
  );
}

export function RowAction({ label, onClick, danger, primary, disabled, children }: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  primary?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
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
