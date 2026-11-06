'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { BackInStockItem, OrderRow, StockModalState } from '../types';
import Badge from '../queue/Badge';
import { Icon } from '../queue/icons';
import DialogShell from './DialogShell';
import { dlgBtn, dlgInput, dlgTextarea, Hint } from './dialogUi';

type EligibleStockItem = { lineItemId: string; name: string; sku: string; vendor: string; remainingQty: number };

type Props = {
  modal: StockModalState;
  setModal: Dispatch<SetStateAction<StockModalState | null>>;
  onClose: () => void;
  updateItem: (index: number, field: keyof BackInStockItem, value: string) => void;
  getAvailableItemsForRow: (order: OrderRow, items: BackInStockItem[], rowIndex: number) => EligibleStockItem[];
  getEligibleItems: (order: OrderRow) => EligibleStockItem[];
  hasItemToAdd: (order: OrderRow, items: BackInStockItem[]) => boolean;
  addItem: () => void;
  removeItem: (index: number) => void;
  onSubmit: () => Promise<void>;
  formatStatus: (status: StockModalState['requests'][number]['status']) => string;
};

const HEAD = 'grid h-[22px] grid-cols-[1fr_1fr_44px_62px_62px] items-center gap-2 border-b border-orders-border bg-orders-surface-muted px-2 text-[9px] font-bold uppercase tracking-[.4px] text-orders-text-subtle';

/** Request stock (back in stock): existing requests with their updates, or a new request for the order's short lines. */
export default function RequestStockDialog({ modal, setModal, onClose, updateItem, getAvailableItemsForRow, getEligibleItems, hasItemToAdd, addItem, removeItem, onSubmit, formatStatus }: Props) {
  const eligible = getEligibleItems(modal.order);
  const canCreate = !modal.loading && modal.requests.length === 0 && eligible.length > 0;
  return (
    <DialogShell
      title="Request stock"
      sub={`#${modal.order.number} · ${modal.order.customer}`}
      width={520}
      busy={modal.saving}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={modal.saving} className={dlgBtn.ghost}>Close</button>
        {canCreate && <button type="button" onClick={() => void onSubmit()} disabled={modal.saving} className={dlgBtn.pri}>{modal.saving ? 'Submitting…' : 'Send request'}</button>}
      </>}
    >
      {modal.loading ? <Hint>Loading stock request…</Hint> : modal.requests.length > 0 ? (
        <div className="flex flex-col gap-2">
          {modal.requests.map((request) => (
            <div key={request.id} className="rounded-lg border border-orders-border bg-orders-surface-muted p-2">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5"><Badge tone="warn">{formatStatus(request.status)}</Badge><span className="text-[10.5px] text-orders-text-subtle">Requested by {request.requesterName} on {new Date(request.createdAt).toLocaleString()}</span></span>
                {request.unreadUpdateCount > 0 && <Badge tone="warn">{request.unreadUpdateCount} update{request.unreadUpdateCount === 1 ? '' : 's'}</Badge>}
              </div>
              <div className={HEAD}><span>Item</span><span>Supplier</span><span className="text-center">Qty</span><span className="text-center">Restocked</span><span>Due</span></div>
              {request.items.map((item, index) => (
                <div key={`${request.id}-${index}`} className="grid min-h-[30px] grid-cols-[1fr_1fr_44px_62px_62px] items-center gap-2 border-b border-orders-divider px-2 last:border-b-0">
                  <b className="truncate text-orders-text">{item.item}</b><span className="truncate text-orders-text-subtle">{item.supplierName}</span>
                  <b className="text-center tabular-nums">{item.quantity}</b><b className="text-center tabular-nums">{item.restockedQuantity ?? 0}/{item.quantity}</b><span className="tabular-nums">{item.dueDate}</span>
                </div>
              ))}
              {request.requestMessage && <p className="mt-2 whitespace-pre-wrap rounded-lg border border-orders-border bg-orders-surface p-2 text-orders-text-body">{request.requestMessage}</p>}
              <div className="mt-2 flex flex-col gap-1.5">
                {request.messages.length === 0 ? <p className="text-[10.5px] text-orders-text-subtle">No updates yet.</p> : request.messages.map((message) => (
                  <div key={message.id} className="rounded-lg bg-orders-surface px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2"><b className="text-orders-text">{message.senderName}</b><span className="text-[10px] text-orders-text-subtle">{new Date(message.createdAt).toLocaleString()}</span></div>
                    <p className="mt-0.5 whitespace-pre-wrap text-orders-text-body">{message.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : eligible.length === 0 ? <Hint>No product to request back in stock.</Hint> : (
        <div className="flex flex-col gap-2">
          {modal.items.map((item, index) => {
            const options = getAvailableItemsForRow(modal.order, modal.items, index);
            const selected = options.find((o) => o.lineItemId === item.lineItemId);
            return (
              <div key={index} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_60px_136px_26px] items-center gap-1.5 rounded-lg border border-orders-border p-1.5">
                <select value={item.lineItemId} onChange={(e) => updateItem(index, 'lineItemId', e.target.value)} className={dlgInput}>
                  {options.map((o) => <option key={o.lineItemId} value={o.lineItemId}>{o.name}{o.sku ? ` - ${o.sku}` : ''} ({o.remainingQty} left)</option>)}
                </select>
                <input value={item.supplierName} onChange={(e) => updateItem(index, 'supplierName', e.target.value)} placeholder="Supplier" className={dlgInput} />
                <input type="number" min={1} max={selected?.remainingQty ?? 1} value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} placeholder="Qty" className={`${dlgInput} text-center`} />
                <input type="date" aria-label="Due date" value={item.dueDate} onChange={(e) => updateItem(index, 'dueDate', e.target.value)} className={dlgInput} />
                <button type="button" aria-label="Remove product detail" onClick={() => removeItem(index)} disabled={modal.items.length === 1} className="flex h-7 w-[26px] items-center justify-center rounded-lg border border-orders-border-strong text-orders-text-subtle hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"><Icon name="close" className="h-3 w-3" /></button>
              </div>
            );
          })}
          <div><button type="button" onClick={addItem} disabled={!hasItemToAdd(modal.order, modal.items)} className={dlgBtn.ghost}><Icon name="plus" className="h-3 w-3" />Add product</button></div>
          <textarea value={modal.message} onChange={(e) => setModal((prev) => (prev ? { ...prev, message: e.target.value, error: '' } : prev))} rows={3} placeholder="Message (optional)" className={dlgTextarea} />
        </div>
      )}
      {modal.error && <p className="mt-2 text-[11px] text-orders-danger">{modal.error}</p>}
    </DialogShell>
  );
}
