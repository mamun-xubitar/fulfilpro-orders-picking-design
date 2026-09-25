'use client';

/** Read and edit cells for one variants / stock matrix row. Sizing matches the prototype's
 * `.t-sm` table density literally: 4px cell padding, 10px cell text, 15px-tall cell inputs. */

import { formatPoNumber } from '@/lib/inventory/po-number';
import { formatIncomingLot } from './utils';
import type { IncomingLot } from './types';

const CELL_CLASS = 'px-[4px] py-0';

/** Cycled by position so several open POs on one row stay visually distinct from each other —
 * not tied to a specific PO's identity, just "a different colour per badge in this cell". */
const INCOMING_BADGE_COLORS = [
  'border-inventory-warning/30 bg-inventory-warning/10 text-inventory-warning-ink',
  'border-inventory-primary/30 bg-inventory-primary/10 text-inventory-primary',
  'border-inventory-sec-stocktake/30 bg-inventory-sec-stocktake/10 text-inventory-sec-stocktake',
  'border-inventory-sec-details/30 bg-inventory-sec-details/10 text-inventory-sec-details',
];
const INPUT_BASE =
  'h-[15px] rounded-[5px] border border-inventory-border-strong bg-inventory-surface px-[3px] text-[9.5px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

export function Num({ value, bold, muted, className, title }: { value: string; bold?: boolean; muted?: boolean; className?: string; title?: string }) {
  return (
    <td
      title={title}
      className={`${CELL_CLASS} text-right text-[10px] leading-none tabular-nums ${className ?? ''} ${
        className ? '' : bold ? 'font-bold text-inventory-text' : muted ? 'text-inventory-text-subtle' : 'text-inventory-text-muted'
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
    return <td className={`${CELL_CLASS} text-right text-[10px] leading-none text-inventory-text-subtle`}>—</td>;
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

/** Read-only Shopify-style variant title ("Colour / Size") — a convenience column so a row's
 * full identity is scannable without mentally joining the Colour and Size cells. */
export function VariantTitleCell({ colour, size }: { colour: string; size: string }) {
  const title = [colour, size].filter(Boolean).join(' / ') || 'Default';
  return (
    <td className={CELL_CLASS}>
      <span className="truncate text-[10px] font-medium leading-none text-inventory-text" title={title}>
        {title}
      </span>
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
          ? 'border-inventory-primary bg-inventory-primary text-white hover:bg-inventory-primary-hover'
          : danger
            ? 'border-inventory-border-strong bg-inventory-surface text-inventory-text-subtle hover:border-inventory-danger/40 hover:bg-inventory-danger/10 hover:text-inventory-danger-hover'
            : 'border-inventory-border-strong bg-inventory-surface text-inventory-text-subtle hover:bg-inventory-surface-hover hover:text-inventory-text'
      }`}
    >
      {children}
    </button>
  );
}
