'use client';

import VariantsMatrixRow from './VariantsMatrixRow';
import { formatCurrencyValue, formatNumber } from './utils';
import type { useVariantsMatrix } from './hooks/useVariantsMatrix';

type VariantsMatrixTableProps = {
  matrix: ReturnType<typeof useVariantsMatrix>;
  /** Rendered inside the full-screen "Full view" modal — fills the modal's height and scrolls
   * internally instead of capping at the fixed max-h used in the normal inline placement. */
  fillHeight?: boolean;
};

const NUMERIC_HEADERS = ['Stock on hand', 'Allocated', 'Available', 'Incoming', 'Trigger'];

// Past this many rows the table scrolls internally instead of growing the page — roughly 10 rows
// visible at once including the sticky header and footer.
const SCROLL_THRESHOLD = 8;

// `border-collapse` means a sticky cell's own border doesn't paint (the border lives on the
// adjacent cell instead), so the header/footer's separating line is an inset box-shadow instead.
const STICKY_HEADER_TH = 'sticky top-0 z-10 bg-gray-50 shadow-[inset_0_-1px_0_theme(colors.gray.200)]';
const STICKY_FOOTER_TD = 'sticky bottom-0 z-10 bg-gray-50 shadow-[inset_0_1px_0_theme(colors.gray.200)]';

export default function VariantsMatrixTable({ matrix, fillHeight }: VariantsMatrixTableProps) {
  const { rows, totals } = matrix;
  const scrollable = rows.length > SCROLL_THRESHOLD;

  return (
    <div className={fillHeight ? 'h-full overflow-y-auto overflow-x-auto' : scrollable ? 'max-h-[27rem] overflow-y-auto overflow-x-auto' : 'overflow-x-auto'}>
      <table className="w-full min-w-5xl border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th scope="col" className={`${STICKY_HEADER_TH} py-2.5 pl-4 pr-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500`}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={matrix.allRowsSelected}
                  onChange={matrix.toggleAllRows}
                  aria-label="Select all rows"
                  className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
                />
                Colour
              </label>
            </th>
            <Th align="left">Size</Th>
            <Th align="left">SKU / Barcode</Th>
            {NUMERIC_HEADERS.map((label) => (
              <Th key={label} align="right">
                {label}
              </Th>
            ))}
            <Th align="center">Status</Th>
            <Th align="right">Buy price</Th>
            <Th align="right">Sell price</Th>
            <Th align="right">Stock value</Th>
            <th scope="col" className={`${STICKY_HEADER_TH} py-2.5 pl-2 pr-4 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500`}>
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
              editing={matrix.editingRowId === variant.id}
              swatch={matrix.swatchOf(variant.colour)}
              colours={matrix.colours}
              sizes={matrix.sizes}
              onToggleSelect={matrix.toggleRow}
              onFieldChange={matrix.setVariantEdit}
              onStartEdit={matrix.startRowEdit}
              onSave={matrix.saveRowEdit}
              onCancel={matrix.cancelRowEdit}
              onDelete={matrix.requestDeleteRow}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={13} className="px-4 py-12 text-center text-sm text-gray-400">
                No variants match the current filters
              </td>
            </tr>
          )}
        </tbody>

        {rows.length > 0 && (
          <tfoot>
            <tr className="font-bold text-gray-900">
              <td className={`${STICKY_FOOTER_TD} py-2.5 pl-4 pr-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500`}>Total</td>
              <td className={STICKY_FOOTER_TD} />
              <td className={`${STICKY_FOOTER_TD} px-2 py-2.5 text-[11px] font-medium text-gray-500`}>
                {rows.length} row{rows.length === 1 ? '' : 's'}
                {matrix.hiddenCount > 0 && <span className="text-gray-400"> · {matrix.hiddenCount} hidden</span>}
              </td>
              <TotalCell value={formatNumber(totals.totalStock)} />
              <TotalCell value={formatNumber(totals.allocated)} />
              <TotalCell value={formatNumber(totals.availableStock)} className="text-emerald-700" />
              <TotalCell value={formatNumber(totals.incoming)} />
              <TotalCell value={formatNumber(totals.trigger)} />
              <td className={STICKY_FOOTER_TD} />
              <td className={STICKY_FOOTER_TD} />
              <td className={STICKY_FOOTER_TD} />
              <TotalCell value={formatCurrencyValue(totals.stockValue)} className="text-emerald-800" />
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
    <th scope="col" className={`${STICKY_HEADER_TH} whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 ${alignment}`}>
      {children}
    </th>
  );
}

function TotalCell({ value, className }: { value: string; className?: string }) {
  return <td className={`${STICKY_FOOTER_TD} px-2 py-2.5 text-right text-[13px] font-bold tabular-nums ${className ?? 'text-gray-900'}`}>{value}</td>;
}
