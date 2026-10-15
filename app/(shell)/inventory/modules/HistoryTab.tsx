'use client';

import Pagination from '@/components/Pagination';
import HistoryListToolbar from './HistoryListToolbar';
import HistoryTable from './HistoryTable';
import { HISTORY_PAGE_SIZE_OPTIONS, type HistoryTabState } from './hooks/useHistoryTab';

type HistoryTabProps = { tab: HistoryTabState; onOpenProduct: (productId: string) => void; onViewAdjustment: (id: string) => void };

/** The History tab — every change recorded across the product catalogue in one read-only table. */
export default function HistoryTab({ tab, onOpenProduct, onViewAdjustment }: HistoryTabProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
      <HistoryListToolbar tab={tab} />
      <HistoryTable tab={tab} onOpenProduct={onOpenProduct} onViewAdjustment={onViewAdjustment} />
      <Pagination
        pagination={tab.pagination}
        loading={tab.loading}
        pageNumbers={tab.pageNumbers}
        onPageChange={tab.goToPage}
        itemLabel="entries"
        pageSizeOptions={HISTORY_PAGE_SIZE_OPTIONS}
        onPageSizeChange={tab.setPageSize}
      />
    </div>
  );
}
