'use client';

import { useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import AnimatedStepBody from './newProduct/AnimatedStepBody';
import { WIZARD_BODY_CLASS, WIZARD_CARD_CLASS } from './modalStyles';
import { STATUS_BADGES } from './PurchaseOrdersPanel';
import ViewPoModal from './ViewPoModal';
import type { PurchaseOrderRecord } from './types';
import { formatCurrencyValue, formatDate, formatMoney, formatPoNumber, poAveragePrice } from './utils';

type BuyingHistoryModalProps = {
  purchaseOrders: PurchaseOrderRecord[];
  onClose: () => void;
  /** Opens the real Receive PO modal for `po` on top of this modal — wired to
   * `p.po.openReceive`, already mounted in `PoModals.tsx`. This modal stays open behind it,
   * and its rows refresh live once the receive lands since `purchaseOrders` is live state. */
  onReceive: (po: PurchaseOrderRecord) => void;
};

/** One row per purchase order — date, PO number, supplier, status, total qty, average unit cost,
 * total value, and View/Receive actions. Reuses `usePurchaseOrder.purchaseOrders`, already loaded
 * for the Purchase orders panel — no new fetch. */
export default function BuyingHistoryModal({ purchaseOrders, onClose, onReceive }: BuyingHistoryModalProps) {
  const [viewTarget, setViewTarget] = useState<PurchaseOrderRecord | null>(null);

  return (
    <ModalShell disableBackdropClose title="Buying history" compact onClose={onClose} maxWidthClass="max-w-4xl" bodyClassName={WIZARD_BODY_CLASS}>
      <div className={WIZARD_CARD_CLASS}>
        <AnimatedStepBody minHeightClassName="min-h-0">
          <div className="max-h-[min(28rem,calc(60vh/var(--page-zoom,1)))] overflow-x-auto overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
            <table className="w-full min-w-[560px] text-[11px] leading-none">
              <thead>
                <tr className="border-b border-inventory-border bg-inventory-surface-muted">
                  <Th align="left">Date</Th>
                  <Th align="left">PO</Th>
                  <Th align="left">Supplier</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Avg cost</Th>
                  <Th align="right">Total value</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-inventory-text-subtle">
                      No purchase orders yet.
                    </td>
                  </tr>
                )}
                {purchaseOrders.map((po) => {
                  const totalQty = po.items.reduce((sum, item) => sum + item.quantity, 0);
                  const avgPrice = poAveragePrice(po.items);
                  const totalValue = po.items.reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);
                  const outstanding = po.items.some((item) => item.receivedQuantity < item.quantity);
                  return (
                    <tr key={po.id} className="border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover">
                      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{formatDate(po.createdAt)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-medium text-inventory-text">{formatPoNumber(po.number)}</td>
                      <td className="px-2 py-1.5 text-inventory-text-muted [overflow-wrap:anywhere]">{po.supplierName}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_BADGES[po.status]}`}>
                          {po.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{totalQty}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{avgPrice !== null ? `$${formatMoney(avgPrice)}` : '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums font-semibold text-inventory-text">{formatCurrencyValue(totalValue)}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-end gap-[4px]">
                          <button
                            type="button"
                            onClick={() => setViewTarget(po)}
                            className="h-[20px] shrink-0 rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[9px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
                          >
                            View
                          </button>
                          {outstanding && po.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => onReceive(po)}
                              className="h-[20px] shrink-0 rounded-[6px] bg-inventory-success px-[6px] text-[9px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-success-hover cursor-pointer"
                            >
                              Receive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AnimatedStepBody>
      </div>

      {viewTarget && <ViewPoModal po={viewTarget} onClose={() => setViewTarget(null)} />}
    </ModalShell>
  );
}

function Th({ align, children }: { align: 'left' | 'right' | 'center'; children: React.ReactNode }) {
  const alignment = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  return <th className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle ${alignment}`}>{children}</th>;
}
