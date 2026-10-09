'use client';

/** Read and edit cells for one variants / stock matrix row. Sizing matches the prototype's
 * `.t-sm` table density literally: 4px cell padding, 10px cell text, 15px-tall cell inputs. */

import { formatPoNumber } from '@/lib/inventory/po-number';
import { Check } from './icons';
import { useInventoryAccess } from './InventoryAccess';
import { formatIncomingLot, formatNumber } from './utils';
import type { IncomingLot, VariantRow } from './types';

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

/** The per-input save: a 15px check button that appears right of an input once *that* input holds
 * something the server doesn't, and saves only that field. A same-width slot is always reserved so
 * the input never shifts when the button shows up. Enter inside the input triggers it too. */
export function CellSave({ show, saving, label, onSave }: { show: boolean; saving: boolean; label: string; onSave: () => void }) {
  return (
    <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center">
      {(show || saving) && (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-label={label}
          title={label}
          className="flex h-[15px] w-[15px] items-center justify-center rounded-[4px] bg-inventory-primary text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
        >
          {saving ? <span className="block h-2 w-2 animate-spin rounded-full border-[1.5px] border-white/40 border-t-white" /> : <Check className="h-2.5 w-2.5" />}
        </button>
      )}
    </span>
  );
}

/** Enter saves a dirty field; the cell inputs below share it. */
function saveOnEnter(dirty: boolean, onSave: () => void) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && dirty) {
      e.preventDefault();
      onSave();
    }
  };
}

export function NumCell({
  value,
  label,
  step,
  title,
  dirty,
  saving,
  onSave,
  onChange,
}: {
  value: number;
  label: string;
  step?: string;
  title?: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onChange: (value: number) => void;
}) {
  const { canEdit } = useInventoryAccess();
  return (
    <td className={`${CELL_CLASS} text-right`} title={title}>
      <div className="flex items-center justify-end gap-[2px]">
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          onKeyDown={saveOnEnter(dirty, onSave)}
          readOnly={!canEdit}
          aria-label={label}
          className={`w-14 pr-[5px] text-right tabular-nums ${INPUT_BASE}`}
        />
        <CellSave show={dirty} saving={saving} label={`Save ${label}`} onSave={onSave} />
      </div>
    </td>
  );
}

/** Stock on hand of a variant kept at locations: one input per location, stacked in the Location
 * cell's chip order (A→Z, same 15px rows) so each lines up with its chip, and — with several — the
 * row's total under them, beside the Location cell's "Total" line. Every input edits the
 * `locations` draft, so they share that field's one save. */
export function LocationStockCell({
  locations,
  label,
  dirty,
  saving,
  onSave,
  onChange,
}: {
  locations: VariantRow['locations'];
  label: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onChange: (locationId: string, quantity: number) => void;
}) {
  const { canEdit } = useInventoryAccess();
  const total = locations.reduce((sum, l) => sum + l.quantity, 0);
  return (
    <td className={`${CELL_CLASS} text-right`}>
      <div className="flex items-center justify-end gap-[2px]">
        <div className="flex flex-col items-end gap-[2px]">
          {locations.map((l) => (
            <input
              key={l.id}
              type="number"
              min={0}
              step={1}
              value={l.quantity}
              onChange={(e) => onChange(l.id, Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
              onKeyDown={saveOnEnter(dirty, onSave)}
              readOnly={!canEdit}
              aria-label={`${label} at ${l.name}`}
              title={l.name}
              className={`w-14 pr-[5px] text-right tabular-nums ${INPUT_BASE}`}
            />
          ))}
          {locations.length > 1 && (
            <span title="Total across locations" className="block h-[15px] w-14 pr-[5px] text-right text-[10px] font-bold leading-[15px] tabular-nums text-inventory-text">
              {formatNumber(total)}
            </span>
          )}
        </div>
        <CellSave show={dirty} saving={saving} label={`Save ${label}`} onSave={onSave} />
      </div>
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
  skuDirty,
  barcodeDirty,
  savingField,
  onChangeSku,
  onChangeBarcode,
  onSave,
}: {
  sku: string | null;
  barcode: string | null;
  skuDirty: boolean;
  barcodeDirty: boolean;
  /** Which of this row's inputs is mid-save, if any. */
  savingField: string | null;
  onChangeSku: (value: string) => void;
  onChangeBarcode: (value: string) => void;
  onSave: (field: 'sku' | 'barcode') => void;
}) {
  const { canEdit } = useInventoryAccess();
  return (
    <td className={CELL_CLASS}>
      <div className="mb-[2px] flex items-center gap-[2px]">
        <input
          type="text"
          value={sku ?? ''}
          onChange={(e) => onChangeSku(e.target.value)}
          onKeyDown={saveOnEnter(skuDirty, () => onSave('sku'))}
          readOnly={!canEdit}
          aria-label="SKU"
          className={`block w-24 font-medium ${INPUT_BASE}`}
        />
        <CellSave show={skuDirty} saving={savingField === 'sku'} label="Save SKU" onSave={() => onSave('sku')} />
      </div>
      <div className="flex items-center gap-[2px]">
        <input
          type="text"
          value={barcode ?? ''}
          onChange={(e) => onChangeBarcode(e.target.value)}
          onKeyDown={saveOnEnter(barcodeDirty, () => onSave('barcode'))}
          readOnly={!canEdit}
          aria-label="Barcode"
          className={`block w-24 tabular-nums ${INPUT_BASE}`}
        />
        <CellSave show={barcodeDirty} saving={savingField === 'barcode'} label="Save barcode" onSave={() => onSave('barcode')} />
      </div>
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
