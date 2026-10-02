'use client';

import { STATUS_BADGES } from './PurchaseOrdersPanel';
import SortableTh from './SortableTh';
import type { PurchaseOrdersTabState, PoSortKey } from './hooks/usePurchaseOrdersTab';
import type { PurchaseOrderRecord } from './types';
import { formatCurrencyValue, formatDate, formatPoNumber } from './utils';

type PurchaseOrdersTableProps = {
  tab: PurchaseOrdersTabState;
  onReceive: (po: PurchaseOrderRecord) => void;
  onPay: (po: PurchaseOrderRecord) => void;
  onOpenSupplier: (supplierId: string) => void;
};

const COLUMN_COUNT = 13;
const ACTION_BTN =
  'h-[20px] rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[9px] font-bold text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer';

/** Order value: Σ(qty × unit cost) of the lines that have a cost. */
function poValue(po: PurchaseOrderRecord): number {
  return po.items.reduce((sum, i) => sum + i.quantity * (i.unitCost ?? 0), 0);
}

export default function PurchaseOrdersTable({ tab, onReceive, onPay, onOpenSupplier }: PurchaseOrdersTableProps) {
  const th = (label: string, sortKey?: PoSortKey, align?: 'left' | 'right' | 'center') => (
    <SortableTh label={label} sortKey={sortKey} align={align} sort={tab.sort} dir={tab.dir} onSortChange={tab.changeSort} />
  );

  return (
    <div className="overflow-x-auto thin-scroll">
      <table className="w-full min-w-[1080px] border-collapse text-[11px] leading-none">
        <thead>
          <tr className="border-b border-inventory-border bg-inventory-surface-muted">
            <th className="w-7 px-2 py-1">
              <input type="checkbox" checked={tab.allSelected} onChange={tab.toggleAll} aria-label="Select all purchase orders on this page" className="h-3 w-3 cursor-pointer accent-inventory-primary" />
            </th>
            {th('Date', 'createdAt')}
            {th('PO', 'number')}
            {th('Product', 'productTitle')}
            {th('Supplier', 'supplierName')}
            {th('Delivery', 'deliveryDate')}
            {th('Status', 'status', 'center')}
            {th('Qty', undefined, 'right')}
            {th('Received', undefined, 'right')}
            {th('Value', undefined, 'right')}
            {th('Payment', undefined, 'center')}
            {th('Remark')}
            {th('Actions', undefined, 'right')}
          </tr>
        </thead>
        <tbody>
          {tab.initialLoading ? (
            <SkeletonRows />
          ) : tab.rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-2 py-10 text-center text-[11px] text-inventory-text-subtle">
                {tab.hasFilters ? 'No purchase orders match these filters.' : 'No purchase orders yet — create one from a product’s Variants / stock table.'}
              </td>
            </tr>
          ) : (
            tab.rows.map((po) => <PoRow key={po.id} po={po} tab={tab} onReceive={onReceive} onPay={onPay} onOpenSupplier={onOpenSupplier} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function PoRow({ po, tab, onReceive, onPay, onOpenSupplier }: { po: PurchaseOrderRecord; tab: PurchaseOrdersTabState } & Omit<PurchaseOrdersTableProps, 'tab'>) {
  const qty = po.items.reduce((sum, i) => sum + i.quantity, 0);
  const received = po.items.reduce((sum, i) => sum + i.receivedQuantity, 0);
  const canReceive = po.status !== 'CANCELLED' && received < qty;
  const paid = po.payment?.status === 'PAID';
  const selected = tab.selectedIds.includes(po.id);

  return (
    <tr className={`border-b border-inventory-divider transition-colors duration-150 last:border-0 hover:bg-inventory-surface-hover ${selected ? 'bg-inventory-primary/[5%]' : ''}`}>
      <td className="px-2 py-1.5">
        <input type="checkbox" checked={selected} onChange={() => tab.toggle(po.id)} aria-label={`Select ${formatPoNumber(po.number)}`} className="h-3 w-3 cursor-pointer accent-inventory-primary" />
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{formatDate(po.createdAt)}</td>
      <td className="whitespace-nowrap px-2 py-1.5 font-medium text-inventory-text">{formatPoNumber(po.number)}</td>
      <td className="max-w-[200px] px-2 py-1.5">
        <span className="block truncate text-inventory-text" title={po.productTitle}>
          {po.productTitle}
        </span>
        <span className="mt-[2px] block truncate text-[9.5px] text-inventory-text-subtle">{po.itemNo}</span>
      </td>
      <td className="max-w-[150px] px-2 py-1.5">
        <button type="button" onClick={() => onOpenSupplier(po.supplierId)} title={`View ${po.supplierName}`} className="block max-w-full truncate text-left font-medium text-inventory-secondary underline-offset-2 hover:underline cursor-pointer">
          {po.supplierName}
        </button>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{formatDate(po.deliveryDate)}</td>
      <td className="px-2 py-1.5 text-center">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_BADGES[po.status]}`}>{po.status.replace('_', ' ')}</span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{qty}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{received}</td>
      <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-inventory-text">{formatCurrencyValue(po.payment?.totalAud ?? poValue(po))}</td>
      <td className="px-2 py-1.5 text-center">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
            paid ? 'border-inventory-success/30 bg-inventory-success/10 text-inventory-success-hover' : 'border-inventory-warning/30 bg-inventory-warning/10 text-inventory-warning-ink'
          }`}
        >
          {paid ? 'Paid' : 'Unpaid'}
        </span>
      </td>
      <td className="px-2 py-1">
        <input
          key={`${po.id}:${po.poRemark ?? ''}`}
          type="text"
          defaultValue={po.poRemark ?? ''}
          onBlur={(e) => tab.saveRemark(po, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder="Add remark"
          aria-label={`Remark for ${formatPoNumber(po.number)}`}
          className="h-[20px] w-[130px] rounded-[5px] border border-transparent bg-transparent px-[4px] text-[10.5px] uppercase text-inventory-text-muted outline-none placeholder:normal-case placeholder:text-inventory-text-subtle hover:border-inventory-border-strong focus:border-inventory-primary focus:bg-inventory-surface focus:ring-2 focus:ring-inventory-primary-ring"
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-[4px]">
          <button type="button" onClick={() => tab.setViewTarget(po)} className={ACTION_BTN}>
            View
          </button>
          {canReceive && (
            <button type="button" onClick={() => onReceive(po)} className="h-[20px] rounded-[6px] bg-inventory-success px-[6px] text-[9px] font-bold text-white transition-colors duration-150 hover:bg-inventory-success-hover cursor-pointer">
              Receive
            </button>
          )}
          <button type="button" onClick={() => tab.print([po])} className={ACTION_BTN}>
            Print
          </button>
          <button
            type="button"
            onClick={() => onPay(po)}
            className={`h-[20px] rounded-[6px] px-[6px] text-[9px] font-bold transition-colors duration-150 cursor-pointer ${
              po.payment ? 'border border-inventory-primary/40 bg-inventory-primary/10 text-inventory-primary hover:bg-inventory-primary/15' : 'bg-inventory-primary text-white hover:bg-inventory-primary-hover'
            }`}
          >
            {po.payment ? 'Edit pay' : 'Pay'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-inventory-divider last:border-0">
          {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
            <td key={j} className="px-2 py-2">
              <div className="h-3 animate-pulse rounded bg-inventory-surface-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
