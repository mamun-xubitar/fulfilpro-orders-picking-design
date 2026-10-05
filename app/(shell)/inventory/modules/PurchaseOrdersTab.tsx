'use client';

import { MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import Pagination from '@/components/Pagination';
import PoListToolbar from './PoListToolbar';
import PurchaseOrdersTable from './PurchaseOrdersTable';
import ViewPoModal from './ViewPoModal';
import { PO_PAGE_SIZE_OPTIONS, type PurchaseOrdersTabState } from './hooks/usePurchaseOrdersTab';
import { SPINNER, WIZARD_BTN_FINISH } from './modalStyles';
import type { PurchaseOrderRecord, SupplierOption } from './types';
import { formatNumber, formatPoNumber } from './utils';

type PurchaseOrdersTabProps = {
  tab: PurchaseOrdersTabState;
  suppliers: SupplierOption[];
  onReceive: (po: PurchaseOrderRecord) => void;
  onPay: (po: PurchaseOrderRecord) => void;
  onOpenSupplier: (supplierId: string) => void;
  onOpenProduct: (productId: string) => void;
};

const outstanding = (po: PurchaseOrderRecord) => po.items.reduce((sum, i) => sum + Math.max(0, i.quantity - i.receivedQuantity), 0);

/** The Purchase Orders tab — every product's POs in one table. */
export default function PurchaseOrdersTab({ tab, suppliers, onReceive, onPay, onOpenSupplier, onOpenProduct }: PurchaseOrdersTabProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm xl:min-h-0 xl:flex-1 xl:overflow-y-auto thin-scroll">
      <PoListToolbar tab={tab} suppliers={suppliers} />

      {tab.selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-[6px] border-b border-inventory-primary/25 bg-inventory-primary/[6%] px-2 py-1">
          <span className="rounded-full bg-inventory-primary px-[8px] py-[2px] text-[10px] font-bold leading-none text-white tabular-nums">{tab.selectedIds.length} selected</span>
          <button
            type="button"
            onClick={tab.openReceiveConfirm}
            disabled={tab.receivable.length === 0}
            title={tab.receivable.length === 0 ? 'Nothing outstanding on the selected purchase orders' : 'Receives everything outstanding on the selected purchase orders'}
            className="flex h-[22px] items-center rounded-[6px] bg-inventory-success px-[8px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-success-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            Receive
          </button>
          <button
            type="button"
            onClick={() => tab.print(tab.selectedRows)}
            className="flex h-[22px] items-center rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[8px] text-[10px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
          >
            Print
          </button>
          <button type="button" onClick={tab.clearSelection} className="h-[22px] rounded-[6px] px-[8px] text-[10px] font-bold text-inventory-text-subtle hover:bg-inventory-surface-hover cursor-pointer">
            Clear
          </button>
        </div>
      )}

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
          maxWidthClass="max-w-[460px]"
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
          <p className="mb-2 text-[12px] text-inventory-text-muted">Every outstanding line is received in full, at its own unit cost, and added to stock on hand.</p>
          <ul className="max-h-48 divide-y divide-inventory-divider overflow-y-auto thin-scroll rounded-lg border border-inventory-border text-[11px]">
            {tab.receivable.map((po) => (
              <li key={po.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-inventory-text">{formatPoNumber(po.number)}</span> <span className="text-inventory-text-subtle">{po.productTitle}</span>
                </span>
                <span className="shrink-0 tabular-nums text-inventory-text-muted">{formatNumber(outstanding(po))} units</span>
              </li>
            ))}
          </ul>
          {tab.selectedRows.length > tab.receivable.length && (
            <p className="mt-2 text-[11px] text-inventory-text-subtle">{tab.selectedRows.length - tab.receivable.length} selected order(s) are cancelled or already fully received and will be skipped.</p>
          )}
        </ModalShell>
      )}
    </div>
  );
}
