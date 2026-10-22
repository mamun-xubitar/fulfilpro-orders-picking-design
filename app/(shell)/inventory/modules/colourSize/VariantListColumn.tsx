'use client';

import { useRef, useState } from 'react';
import { deriveColorFromName, resolveSwatch } from '@/lib/inventory/colour';
import ColumnFillInput from '../ColumnFillInput';
import { ChevronDown } from '../icons';
import LocationPickerMenu, { locationChipClass } from '../LocationPickerMenu';
import { formatNumber, variantTitle } from '../utils';
import type { VariantDraftRow } from './useColourSizeModal';
import type { LocationSelection } from './useLocationSelection';

type VariantListColumnProps = {
  variants: VariantDraftRow[];
  location: Pick<LocationSelection, 'ids' | 'options' | 'set' | 'error'>;
  onChange: (key: string, field: 'stockOnHand' | 'trigger', value: number, locationId?: string) => void;
  onFillAll: (field: 'stockOnHand' | 'trigger', value: number) => void;
};

const INPUT_CLASS =
  'h-[22px] w-full min-w-0 rounded-[6px] border border-inventory-border-strong pl-[6px] pr-[10px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring read-only:cursor-default read-only:bg-inventory-surface-muted read-only:text-inventory-text-muted';
const toCount = (raw: string) => Math.max(0, Math.trunc(Number(raw) || 0));

/** The header's multi-select: which locations the Stock on hand column shows and writes. */
function LocationPicker({ location }: { location: VariantListColumnProps['location'] }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const names = location.options.filter((o) => location.ids.includes(o.id)).map((o) => o.name);
  const summary = names.length === 0 ? (location.options.length === 0 ? 'No locations' : 'Pick location') : names.length === 1 ? names[0] : `${names.length} locations`;

  return (
    <div>
      <label className="mb-[2px] block text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-text-subtle">Location</label>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={location.options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Locations"
        title={names.join(', ') || undefined}
        className={`flex h-[22px] w-full min-w-0 items-center justify-between gap-[2px] rounded-[6px] border bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
          location.error ? 'border-inventory-danger' : 'border-inventory-border-strong focus:border-inventory-primary'
        }`}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      <LocationPickerMenu anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} options={location.options} selectedIds={location.ids} onChange={location.set} />
    </div>
  );
}

/**
 * The third column of the Colour & size adjustment modal — the live preview of checked colours x
 * checked sizes, regenerated on every check/uncheck/add/remove. Each header number input mirrors
 * the Create PO modal's Qty column (`ColumnFillInput`): typing and confirming sets every visible
 * row at once.
 */
export default function VariantListColumn({ variants, location, onChange, onFillAll }: VariantListColumnProps) {
  return (
    <div className="flex max-h-[300px] min-h-0 flex-col rounded-[8px] border border-inventory-border bg-inventory-surface md:h-full md:max-h-none">
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_5.5rem] items-center gap-[6px] border-b border-inventory-border px-[8px] py-[6px]">
        <h4 className="text-[11px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-muted">Variants</h4>
        <LocationPicker location={location} />
        <div>
          <p className="mb-[2px] text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-text-subtle">Stock on hand</p>
          <ColumnFillInput label="Stock on hand" rowCount={variants.filter((r) => !r.stockLocked).length} min={0} integerOnly onApply={(v) => onFillAll('stockOnHand', v)} />
        </div>
        <div>
          <p className="mb-[2px] text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-text-subtle">Trigger</p>
          <ColumnFillInput label="Trigger" rowCount={variants.length} min={0} integerOnly onApply={(v) => onFillAll('trigger', v)} />
        </div>
      </div>
      {location.error && <p className="border-b border-inventory-border px-[8px] py-[3px] text-[10px] leading-tight text-inventory-danger">{location.error}</p>}

      <div className="flex-1 divide-y divide-inventory-border overflow-y-auto thin-scroll">
        {variants.length === 0 && (
          <p className="px-[10px] py-[8px] text-[11px] text-inventory-text-subtle">Check at least one colour or size to preview variants.</p>
        )}
        {variants.map((row) => (
          <div
            key={row.key}
            className={`grid grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_5.5rem] items-center gap-[6px] px-[8px] py-[5px] hover:bg-inventory-surface-hover ${row.isNew ? 'bg-inventory-success/[12%]' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-[6px]">
              {row.colour && (
                <span
                  className="h-[8px] w-[8px] shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: resolveSwatch(deriveColorFromName(row.colour)) }}
                />
              )}
              <span
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollWidth > el.clientWidth) el.title = el.textContent ?? '';
                  else el.removeAttribute('title');
                }}
                className="truncate text-[11.5px] font-medium uppercase tracking-[0.2px] text-inventory-text"
              >
                {[row.colour, row.size].filter(Boolean).join(' / ') || 'Default Title'}
              </span>
              {row.isNew && (
                <span className="shrink-0 rounded-full bg-inventory-success/15 px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-success-hover">
                  New
                </span>
              )}
            </span>
            <span className="flex flex-col items-start gap-[2px]">
              {row.stock.length === 0 && <span className="text-[10.5px] text-inventory-text-subtle">—</span>}
              {row.stock.map((s) => (
                <span
                  key={s.id}
                  title={s.name}
                  className={`inline-flex h-[22px] max-w-full items-center truncate whitespace-nowrap rounded-[4px] border px-[4px] text-[9.5px] font-semibold ${locationChipClass(s.id)}`}
                >
                  <span className="truncate">{s.name}</span>
                </span>
              ))}
              {row.stock.length > 1 && <span className="text-[9.5px] font-semibold leading-[16px] text-inventory-text-subtle">Total</span>}
            </span>
            <span className="flex flex-col items-end gap-[2px]">
              {row.stock.length === 0 ? (
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={row.stockOnHand}
                  onChange={(e) => onChange(row.key, 'stockOnHand', toCount(e.target.value))}
                  readOnly={row.stockLocked}
                  title={row.stockLocked ? 'Kept at several locations — pick a location to edit its stock' : undefined}
                  aria-label={`Stock on hand for ${variantTitle(row)}`}
                  className={INPUT_CLASS}
                />
              ) : (
                row.stock.map((s) => (
                  <input
                    key={s.id}
                    type="number"
                    min={0}
                    step={1}
                    value={s.quantity}
                    onChange={(e) => onChange(row.key, 'stockOnHand', toCount(e.target.value), s.id)}
                    title={s.name}
                    aria-label={`Stock on hand for ${variantTitle(row)} at ${s.name}`}
                    className={INPUT_CLASS}
                  />
                ))
              )}
              {row.stock.length > 1 && (
                <span title="Total across locations" className="block h-[16px] pr-[10px] text-right text-[10px] font-bold leading-[16px] tabular-nums text-inventory-text">
                  {formatNumber(row.stockOnHand)}
                </span>
              )}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={row.trigger ?? ''}
              placeholder="Default"
              onChange={(e) => onChange(row.key, 'trigger', toCount(e.target.value))}
              aria-label={`Trigger for ${variantTitle(row)}`}
              className="h-[22px] w-full min-w-0 rounded-[6px] border border-inventory-border-strong pl-[6px] pr-[10px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
