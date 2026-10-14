'use client';

import { MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import Pagination from '@/components/Pagination';
import PoListToolbar from './PoListToolbar';
import PoSelectionBar from './PoSelectionBar';
import PurchaseOrdersTable from './PurchaseOrdersTable';
import ViewPoModal from './ViewPoModal';
import { receiveLocationOptions } from './hooks/usePurchaseOrder';
import { PO_PAGE_SIZE_OPTIONS, type PurchaseOrdersTabState } from './hooks/usePurchaseOrdersTab';
import { SPINNER, WIZARD_BTN_FINISH } from './modalStyles';
import type { PurchaseOrderRecord, SupplierOption } from './types';
import { formatNumber, formatPoNumber } from './utils';

type PurchaseOrdersTabProps = {
  tab: PurchaseOrdersTabState;
  suppliers: SupplierOption[];
  onReceive: (po: PurchaseOrderRecord) => void;
  onPay: (po: PurchaseOrderRecord) => void;
  onBulkPay: () => void;
  onOpenSupplier: (supplierId: string) => void;
  onOpenProduct: (productId: string) => void;
};

const outstanding = (po: PurchaseOrderRecord) => po.items.reduce((sum, i) => sum + Math.max(0, i.quantity - i.receivedQuantity), 0);

/** The Purchase Orders tab — every product's POs in one table. */
export default function PurchaseOrdersTab({ tab, suppliers, onReceive, onPay, onBulkPay, onOpenSupplier, onOpenProduct }: PurchaseOrdersTabProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm xl:min-h-0 xl:flex-1 xl:overflow-y-auto thin-scroll">
      <PoListToolbar tab={tab} suppliers={suppliers} />

      {tab.hasSelection && <PoSelectionBar tab={tab} onBulkPay={onBulkPay} />}

      <PurchaseOrdersTable tab={tab} onReceive={onReceive} onPay={onPay} onOpenSupplier={onOpenSupplier} onOpenProduct={onOpenProduct} />

      <Pagination
        pagination={tab.pagination}
        loading={tab.loading}
        pageNumbers={tab.pageNumbers}
        onPageChange={tab.goToPage}
        itemLabel="purchase orders"
        pageSizeOptions={PO_PAGE_SIZE_OPTIONS}
        onPageSizeChange={tab.setPageSize}
      />

      {tab.viewTarget && <ViewPoModal po={tab.viewTarget} onClose={() => tab.setViewTarget(null)} />}

      {tab.receiveConfirmOpen && (
        <ModalShell
          disableBackdropClose={tab.bulkReceiving}
          elevated
          compact
          title={`Receive ${tab.receivable.length} purchase order${tab.receivable.length === 1 ? '' : 's'}?`}
          onClose={tab.closeReceiveConfirm}
          maxWidthClass="max-w-[520px]"
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={tab.closeReceiveConfirm} disabled={tab.bulkReceiving} className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}>
                Cancel
              </button>
              <button type="button" onClick={tab.confirmBulkReceive} disabled={tab.bulkReceiving} className={`flex-1 ${WIZARD_BTN_FINISH}`}>
                {tab.bulkReceiving && SPINNER}
                {tab.bulkReceiving ? 'Receiving...' : 'Receive all outstanding'}
              </button>
            </div>
          }
        >
          <p className="mb-2 text-[12px] text-inventory-text-muted">Every outstanding line is received in full, at its own unit cost, and added to stock on hand at the location chosen for each order (variants not kept there use their own first location).</p>
          <ul className="max-h-48 divide-y divide-inventory-divider overflow-y-auto thin-scroll rounded-lg border border-inventory-border text-[11px]">
            {tab.receivable.map((po) => {
              const locationOptions = receiveLocationOptions(po.items);
              return (
                <li key={po.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-inventory-text">{formatPoNumber(po.number)}</span> <span className="text-inventory-text-subtle">{po.productTitle}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {locationOptions.length > 0 ? (
                      <select
                        aria-label={`Location for ${formatPoNumber(po.number)}`}
                        value={tab.receiveLocationIds[po.id] ?? ''}
                        onChange={(e) => tab.setReceiveLocation(po.id, e.target.value)}
                        disabled={tab.bulkReceiving}
                        className="h-[22px] w-32 cursor-pointer rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                      >
                        {locationOptions.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-inventory-text-subtle">Unassigned</span>
                    )}
                    <span className="w-16 text-right tabular-nums text-inventory-text-muted">{formatNumber(outstanding(po))} units</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {tab.targetRows.length > tab.receivable.length && (
            <p className="mt-2 text-[11px] text-inventory-text-subtle">{tab.targetRows.length - tab.receivable.length} selected order(s) are cancelled or already fully received and will be skipped.</p>
          )}
        </ModalShell>
      )}
    </div>
  );
}
