'use client';

import ColumnFillInput from './ColumnFillInput';
import VariantsMatrixRow from './VariantsMatrixRow';
import type { useVariantsMatrix } from './hooks/useVariantsMatrix';
import { formatCurrencyValue, formatNumber } from './utils';

type VariantsMatrixTableProps = {
  matrix: ReturnType<typeof useVariantsMatrix>;
  /** Rendered inside the full-screen "Full view" modal — fills the modal's height and scrolls
   * internally instead of capping at the fixed max-h used in the normal inline placement. */
  fillHeight?: boolean;
  /** Full view shows every column; the normal inline table hides SKU / Barcode and Trigger to
   * keep the common case compact — both are still reachable (and editable) via Full view. */
  showAllColumns?: boolean;
};

// Keyed so the header, each row, and the totals footer can't drift out of alignment — the
// visibility of the 'sku' and 'trigger' entries is the single source of truth all three read from.
const NUMERIC_HEADERS = [
  { key: 'stockOnHand', label: 'Stock on hand' },
  { key: 'allocated', label: 'Allocated' },
  { key: 'available', label: 'Available' },
  { key: 'incoming', label: 'Incoming' },
  { key: 'trigger', label: 'Trigger' },
] as const;

// Past this many body rows the table scrolls internally instead of growing the page —
// header + 8 body rows + totals footer = 10 rows visible at once (sticky header/footer).
const SCROLL_THRESHOLD = 8;

// `border-collapse` means a sticky cell's own border doesn't paint (the border lives on the
// adjacent cell instead), so the header/footer's separating line is an inset box-shadow instead.
const STICKY_HEADER_TH = 'sticky top-0 z-10 bg-inventory-surface-muted shadow-[inset_0_-1px_0_theme(colors.gray.200)]';
// Solid (not alpha-blended) tint of the panel's own accent hue — the sticky footer sits above
// scrolling body rows, so a semi-transparent bg would let their content bleed through underneath
// it. #f9f1fa is --inventory-sec-variants (#a21caf) blended 6% over white — light enough to keep
// the green success-colored total cells above the 4.5:1 text-contrast floor. The top edge is the
// same hue at 35% (the shadow paints over the now-opaque bg, not the scrolling content, so alpha
// here is safe) — a light line, but a visibly darker step than the bg fill, not full-saturation.
const STICKY_FOOTER_TD = 'sticky bottom-0 z-10 bg-[#f9f1fa] shadow-[inset_0_1px_0_rgba(162,28,175,0.35)]';

export default function VariantsMatrixTable({ matrix, fillHeight, showAllColumns }: VariantsMatrixTableProps) {
  const { rows, totals } = matrix;
  const scrollable = rows.length > SCROLL_THRESHOLD;
  const numericHeaders = NUMERIC_HEADERS.filter((h) => showAllColumns || h.key !== 'trigger');
  // Size, Variant, [SKU / Barcode], numeric columns, Status, Buy price, Sell price, Stock value,
  // Actions — 13 in full view, 11 inline (SKU/Barcode and Trigger dropped). The 7 accounts for the
  // always-shown non-numeric columns: Size, Variant, Status, Buy price, Sell price, Stock value,
  // Actions. Colour is now a separate panel beside the table, not a column.
  const columnCount = 7 + numericHeaders.length + (showAllColumns ? 1 : 0);

  return (
    <div className={`thin-scroll ${fillHeight ? 'h-full overflow-y-auto overflow-x-auto' : scrollable ? 'max-h-[12.5rem] overflow-y-auto overflow-x-auto' : 'overflow-x-auto'}`}>
      <table className="w-full min-w-5xl border-collapse">
        <thead>
          <tr className="border-b border-inventory-border bg-inventory-surface-muted">
            <th scope="col" className={`${STICKY_HEADER_TH} py-[3px] pl-[6px] pr-[4px] text-left text-[8px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle`}>
              <label className="flex cursor-pointer items-center gap-[5px]">
                <input
                  type="checkbox"
                  checked={matrix.allRowsSelected}
                  onChange={matrix.toggleAllRows}
                  aria-label="Select all rows"
                  className="h-3 w-3 cursor-pointer accent-inventory-primary"
                />
                Size
              </label>
            </th>
            <Th align="left">Variant</Th>
            {showAllColumns && <Th align="left">SKU / Barcode</Th>}
            {numericHeaders.map((h) => (
              <Th key={h.key} align="right">
                <span className="flex items-center justify-end gap-[4px]">
                  <span>{h.label}</span>
                  {(h.key === 'stockOnHand' || h.key === 'allocated') && (
                    <span className="inline-block w-[64px] min-w-0">
                      <ColumnFillInput
                        label={h.label}
                        rowCount={rows.length}
                        step="1"
                        min={0}
                        integerOnly
                        onApply={(value) => matrix.fillColumn(h.key as 'stockOnHand' | 'allocated', value)}
                      />
                    </span>
                  )}
                </span>
              </Th>
            ))}
            <Th align="center">Status</Th>
            <Th align="right">Buy price</Th>
            <Th align="right">
              <span className="flex items-center justify-end gap-[4px]">
                <span>Sell price</span>
                <span className="inline-block w-[64px] min-w-0">
                  <ColumnFillInput label="Sell price" rowCount={rows.length} step="0.01" min={0} onApply={(value) => matrix.fillColumn('sellPrice', value)} />
                </span>
              </span>
            </Th>
            <Th align="right">Stock value</Th>
            <th scope="col" className={`${STICKY_HEADER_TH} py-[3px] pl-[4px] pr-[6px] text-right text-[8px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle`}>
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((variant) => (
            <VariantsMatrixRow
              key={variant.id}
              variant={variant}
              selected={matrix.selectedIds.has(variant.id)}
              dirty={matrix.isRowDirty(variant.id)}
              saving={matrix.savingRowId === variant.id}
              showAllColumns={!!showAllColumns}
              onToggleSelect={matrix.toggleRow}
              onFieldChange={matrix.setVariantEdit}
              onSave={matrix.saveRow}
              onRevert={matrix.revertRow}
              onDelete={matrix.requestDeleteRow}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="px-4 py-6 text-center text-[10px] text-inventory-text-subtle">
                No variants match the current filters
              </td>
            </tr>
          )}
        </tbody>

        {rows.length > 0 && (
          <tfoot>
            <tr className="font-bold text-inventory-text">
              <td className={`${STICKY_FOOTER_TD} py-[2px] pl-[6px] pr-[4px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle`}>Total</td>
              <td className={`${STICKY_FOOTER_TD} px-[4px] py-[2px] text-[9.5px] font-semibold leading-none text-inventory-text-subtle`}>
                {rows.length} row{rows.length === 1 ? '' : 's'}
                {matrix.hiddenCount > 0 && <span className="text-inventory-text-subtle"> · {matrix.hiddenCount} hidden</span>}
              </td>
              {showAllColumns && <td className={STICKY_FOOTER_TD} />}
              <TotalCell value={formatNumber(totals.totalStock)} />
              <TotalCell value={formatNumber(totals.allocated)} />
              <TotalCell value={formatNumber(totals.availableStock)} className="text-inventory-success-hover" />
              <TotalCell value={formatNumber(totals.incoming)} />
              {showAllColumns && <TotalCell value={formatNumber(totals.trigger)} />}
              <td className={STICKY_FOOTER_TD} />
              <td className={STICKY_FOOTER_TD} />
              <td className={STICKY_FOOTER_TD} />
              <TotalCell value={formatCurrencyValue(totals.stockValue)} className="text-inventory-success-hover" />
              <td className={STICKY_FOOTER_TD} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Th({ align, children }: { align: 'left' | 'right' | 'center'; children: React.ReactNode }) {
  const alignment = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  return (
    <th
      scope="col"
      className={`${STICKY_HEADER_TH} whitespace-nowrap px-[4px] py-[3px] text-[8px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle ${alignment}`}
    >
      {children}
    </th>
  );
}

function TotalCell({ value, className }: { value: string; className?: string }) {
  return <td className={`${STICKY_FOOTER_TD} px-[4px] py-[2px] text-right text-[9.5px] font-bold leading-none tabular-nums ${className ?? 'text-inventory-text'}`}>{value}</td>;
}
