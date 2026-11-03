'use client';

import { Fragment } from 'react';
import type { OrdersPageBundle } from '../ordersPageContext';
import OrderDecorationFiles from '../../../decoration/modules/OrderDecorationFiles';
import { getGridColumns } from './queueUtils';
import QueueRow from './QueueRow';
import ExpandedOrder from './ExpandedOrder';
import { StageTrackHead } from './StageTrack';
import { Icon } from './icons';

function SortHead({ p, label, sortKey }: { p: OrdersPageBundle; label: string; sortKey: 'number' | 'customer' }) {
  const on = p.sort === sortKey;
  return (
    <button type="button" onClick={() => p.handleSortChange(sortKey)} className="flex items-center gap-0.5 uppercase cursor-pointer hover:text-orders-text" aria-label={`Sort by ${label}`}>
      {label}<Icon name={on && p.dir === 'desc' ? 'chevronDown' : 'chevronUp'} className={`h-2.5 w-2.5 ${on ? 'text-orders-primary' : 'opacity-40'}`} />
    </button>
  );
}

function Header({ p }: { p: OrdersPageBundle }) {
  const { caps } = p;
  const some = p.selectedLabelIds.size > 0;
  return (
    <div role="row" className="sticky top-0 z-10 grid items-center gap-x-2 border-b border-orders-border bg-orders-surface-muted px-2 py-1.5 pl-3 text-[9.5px] font-bold tracking-wide text-orders-text-subtle" style={{ gridTemplateColumns: getGridColumns(caps) }}>
      <input type="checkbox" checked={p.allLabelsOnPageSelected} ref={(el) => { if (el) el.indeterminate = some && !p.allLabelsOnPageSelected; }} onChange={p.toggleSelectAllLabelsOnPage} disabled={p.loading || p.orders.length === 0} aria-label="Select all orders on this page" className="h-3.5 w-3.5 rounded border-orders-border-strong text-orders-primary cursor-pointer" />
      <SortHead p={p} label="Order" sortKey="number" />
      {caps.store && <span>STORE</span>}
      <SortHead p={p} label="Customer" sortKey="customer" />
      {caps.admin && <span title="Stock adjustment">STOCK ADJ.</span>}
      <span>ITEMS</span>
      <StageTrackHead caps={caps} />
      {caps.fulfilment && <span>FULFILMENT</span>}
      <span>PACKED</span>
      {(caps.decoration || caps.packedDate) && <span>{caps.packedDate ? 'PACKED DATE' : 'DECO'}</span>}
      <span>NOTES</span>
      <span className="text-right">ACTIONS</span>
    </div>
  );
}

export default function QueueTable({ p }: { p: OrdersPageBundle }) {
  const { orders, loading, error, expandedIds, caps } = p;
  return (
    <div role="table" aria-label="Orders queue" aria-busy={loading} className="min-w-[980px]">
      <Header p={p} />
      {loading && <div className="py-12 text-center text-[12px] text-orders-text-subtle">Loading orders…</div>}
      {!loading && error && <div className="py-12 text-center text-[12px] text-orders-danger">{error}</div>}
      {!loading && !error && orders.length === 0 && <div className="py-16 text-center text-[12px] text-orders-text-subtle">No orders found.</div>}
      {!loading && !error && orders.map((order) => {
        const isExpanded = expandedIds.has(order.id);
        return (
          <Fragment key={order.id}>
            <QueueRow p={p} order={order} isExpanded={isExpanded} />
            {caps.admin && order.items.some((i) => i.isEmbroidery || i.isPrint) && (
              <div className="border-b border-orders-border bg-orders-surface-muted px-3 py-1.5">
                <OrderDecorationFiles
                  attachments={order.decorationAttachments}
                  remarksValue={p.getAttachmentRemarksValue(order)}
                  uploadingFields={p.getUploadingAttachmentFields(order.id)}
                  savingRemarks={p.isSavingAttachmentRemarks(order.id)}
                  onUpload={(field, files) => p.uploadAttachmentFiles(order, field, files)}
                  onRemoveFile={(field, index) => p.removeAttachmentFile(order, field, index)}
                  onRemarksChange={(value) => p.setAttachmentRemarksDraft(order.id, value)}
                  onRemarksBlur={() => p.commitAttachmentRemarks(order)}
                />
              </div>
            )}
            {isExpanded && <ExpandedOrder p={p} order={order} />}
          </Fragment>
        );
      })}
    </div>
  );
}
