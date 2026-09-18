'use client';

import { deriveColorFromName, resolveSwatch } from '@/lib/inventory/colour';
import ColumnFillInput from '../ColumnFillInput';
import { variantTitle } from '../utils';
import type { VariantDraftRow } from './useColourSizeModal';

type VariantListColumnProps = {
  variants: VariantDraftRow[];
  onChange: (key: string, field: 'stockOnHand' | 'trigger', value: number) => void;
  onFillAll: (field: 'stockOnHand' | 'trigger', value: number) => void;
};

/**
 * The third column of the Colour & size adjustment modal — the live preview of checked colours x
 * checked sizes, regenerated on every check/uncheck/add/remove. Each header number input mirrors
 * the Create PO modal's Qty column (`ColumnFillInput`): typing and confirming sets every visible
 * row at once.
 */
export default function VariantListColumn({ variants, onChange, onFillAll }: VariantListColumnProps) {
  return (
    <div className="flex max-h-[300px] min-h-0 flex-col rounded-[8px] border border-inventory-border bg-inventory-surface md:h-full md:max-h-none">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-[6px] border-b border-inventory-border px-[8px] py-[6px]">
        <h4 className="text-[11px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-muted">Variants</h4>
        <div>
          <p className="mb-[2px] text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-text-subtle">Stock on hand</p>
          <ColumnFillInput label="Stock on hand" rowCount={variants.length} min={0} integerOnly onApply={(v) => onFillAll('stockOnHand', v)} />
        </div>
        <div>
          <p className="mb-[2px] text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-text-subtle">Trigger</p>
          <ColumnFillInput label="Trigger" rowCount={variants.length} min={0} integerOnly onApply={(v) => onFillAll('trigger', v)} />
        </div>
      </div>

      <div className="flex-1 divide-y divide-inventory-border overflow-y-auto thin-scroll">
        {variants.length === 0 && (
          <p className="px-[10px] py-[8px] text-[11px] text-inventory-text-subtle">Check at least one colour or size to preview variants.</p>
        )}
        {variants.map((row) => (
          <div
            key={row.key}
            className={`grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-[6px] px-[8px] py-[5px] hover:bg-inventory-surface-hover ${row.isNew ? 'bg-inventory-success/[12%]' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-[6px]">
              {row.colour && (
                <span
                  className="h-[8px] w-[8px] shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: resolveSwatch(deriveColorFromName(row.colour)) }}
                />
              )}
              <span className="truncate text-[11.5px] font-medium uppercase tracking-[0.2px] text-inventory-text">
                {[row.colour, row.size].filter(Boolean).join(' / ') || 'Default Title'}
              </span>
              {row.isNew && (
                <span className="shrink-0 rounded-full bg-inventory-success/15 px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-success-hover">
                  New
                </span>
              )}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={row.stockOnHand}
              onChange={(e) => onChange(row.key, 'stockOnHand', Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
              aria-label={`Stock on hand for ${variantTitle(row)}`}
              className="h-[22px] w-full min-w-0 rounded-[6px] border border-inventory-border-strong px-[6px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={row.trigger ?? ''}
              placeholder="Default"
              onChange={(e) => onChange(row.key, 'trigger', Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
              aria-label={`Trigger for ${variantTitle(row)}`}
              className="h-[22px] w-full min-w-0 rounded-[6px] border border-inventory-border-strong px-[6px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
