'use client';

import Pagination from '@/components/Pagination';
import PoPanelFilters from './PoPanelFilters';
import PoHistoryRow from './PoHistoryRow';
import type { usePurchaseOrders } from './hooks/usePurchaseOrders';

type SupplierPoPanelProps = {
  po: ReturnType<typeof usePurchaseOrders>;
};

export default function SupplierPoPanel({ po }: SupplierPoPanelProps) {
  const hasFilters = po.statusFilter !== '' || po.dateTo !== '';

  return (
    <div className="min-w-0">
      {po.panelExpanded && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-full flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Purchase orders</h3>

          <PoPanelFilters
            statusFilter={po.statusFilter}
            onStatusFilterChange={po.setStatusFilter}
            dateTo={po.dateTo}
            onDateToChange={po.setDateTo}
          />

          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 max-h-120">
            {po.loadingList && <p className="text-xs text-gray-400 text-center py-6">Loading...</p>}
            {!po.loadingList && po.purchaseOrders.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm font-medium text-gray-700">No purchase orders yet</p>
                {!hasFilters && <p className="text-xs text-gray-400 mt-1">Supplier PO history for this product will appear here.</p>}
              </div>
            )}
            {!po.loadingList &&
              po.purchaseOrders.map((row) => <PoHistoryRow key={row.id} po={row} onSendEmail={po.sendEmailForPo} onOpen={po.openPoModal} />)}
          </div>

          {po.pagination.total > 0 && (
            <div className="-mx-4 -mb-4 mt-3">
              <Pagination pagination={po.pagination} loading={po.loadingList} pageNumbers={po.pageNumbers} onPageChange={po.goToPage} itemLabel="POs" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
