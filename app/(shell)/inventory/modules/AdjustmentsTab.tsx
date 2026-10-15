'use client';

import Pagination from '@/components/Pagination';
import AdjustmentListToolbar from './AdjustmentListToolbar';
import AdjustmentsTable from './AdjustmentsTable';
import { ADJUSTMENTS_PAGE_SIZE_OPTIONS, type AdjustmentsTabState } from './hooks/useAdjustmentsTab';

type AdjustmentsTabProps = { tab: AdjustmentsTabState; onOpenProduct: (productId: string) => void; onView: (id: string) => void };

/** The Adjustments tab — every product's stock adjustments in one read-only table, one row per adjustment; View opens its lines. */
export default function AdjustmentsTab({ tab, onOpenProduct, onView }: AdjustmentsTabProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
      <AdjustmentListToolbar tab={tab} />
      <AdjustmentsTable tab={tab} onOpenProduct={onOpenProduct} onView={onView} />
      <Pagination
        pagination={tab.pagination}
        loading={tab.loading}
        pageNumbers={tab.pageNumbers}
        onPageChange={tab.goToPage}
        itemLabel="adjustments"
        pageSizeOptions={ADJUSTMENTS_PAGE_SIZE_OPTIONS}
        onPageSizeChange={tab.setPageSize}
      />
    </div>
  );
}
