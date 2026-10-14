import type { PurchaseOrdersTabState } from './hooks/usePurchaseOrdersTab';
import { useInventoryAccess } from './InventoryAccess';

const CHECK_LABEL = 'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[11px] text-inventory-text-muted';
const CHECKBOX = 'h-3 w-3 cursor-pointer accent-inventory-primary';

/** Bulk bar for the Purchase Orders tab — same two select-all checkboxes as the Products list. */
export default function PoSelectionBar({ tab, onBulkPay }: { tab: PurchaseOrdersTabState; onBulkPay: () => void }) {
  const { canEdit } = useInventoryAccess();
  // In "all matching filters" mode the full rows are only fetched when an action runs, so
  // nothing is known to be receivable until then.
  const receiveDisabled = tab.resolving || (!tab.selectAllFilters && tab.receivable.length === 0);
  const receiveTitle =
    !tab.selectAllFilters && tab.receivable.length === 0 ? 'Nothing outstanding on the selected purchase orders' : 'Receives everything outstanding on the selected purchase orders';

  return (
    <div className="flex flex-wrap items-center gap-[6px] border-b border-inventory-primary/25 bg-inventory-primary/[6%] px-2 py-1">
      <label className={CHECK_LABEL}>
        <input type="checkbox" checked={tab.allSelected} onChange={tab.toggleAll} className={CHECKBOX} />
        Select all on this page
      </label>
      <label className={CHECK_LABEL}>
        <input type="checkbox" checked={tab.selectAllFilters} onChange={tab.toggleSelectAllFilters} className={CHECKBOX} />
        Select all matching filters
      </label>
      <span className="rounded-full bg-inventory-primary px-[8px] py-[2px] text-[10px] font-bold leading-none text-white tabular-nums">
        {tab.selectAllFilters ? `All matching filters (${tab.pagination.total})` : `${tab.selectedIds.length} selected`}
      </span>
      {canEdit && (
        <button
          type="button"
          onClick={tab.openReceiveConfirm}
          disabled={receiveDisabled}
          title={receiveTitle}
          className="flex h-[22px] items-center rounded-[6px] bg-inventory-success px-[8px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-success-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Receive
        </button>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={onBulkPay}
          disabled={tab.resolving}
          title="Pay the selected purchase orders in one go"
          className="flex h-[22px] items-center rounded-[6px] bg-inventory-primary px-[8px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Bulk pay
        </button>
      )}
      <button
        type="button"
        onClick={tab.printSelection}
        disabled={tab.resolving}
        className="flex h-[22px] items-center rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[8px] text-[10px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        Print
      </button>
      <button type="button" onClick={tab.clearSelection} className="h-[22px] rounded-[6px] px-[8px] text-[10px] font-bold text-inventory-text-subtle hover:bg-inventory-surface-hover cursor-pointer">
        Clear
      </button>
    </div>
  );
}
