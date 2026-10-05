'use client';

import Pagination from '@/components/Pagination';
import StocktakeListToolbar from './StocktakeListToolbar';
import StocktakesTable from './StocktakesTable';
import { STOCKTAKE_PAGE_SIZE_OPTIONS, type StocktakesTabState } from './hooks/useStocktakesTab';
import type { StocktakeDetailState } from './hooks/useStocktakeDetail';

/** The Stocktake tab — every product's stocktakes in one table. Counting, syncing and cancelling
 * open the shared modals owned by the page (useStocktakeDetail), not state in here. */
export default function StocktakesTab({ tab, detail }: { tab: StocktakesTabState; detail: StocktakeDetailState }) {
  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm xl:min-h-0 xl:flex-1 xl:overflow-y-auto thin-scroll">
      <StocktakeListToolbar tab={tab} />
      <StocktakesTable tab={tab} detail={detail} />
      <Pagination
        pagination={tab.pagination}
        loading={tab.loading}
        pageNumbers={tab.pageNumbers}
        onPageChange={tab.goToPage}
        itemLabel="stocktakes"
        pageSizeOptions={STOCKTAKE_PAGE_SIZE_OPTIONS}
        onPageSizeChange={tab.setPageSize}
      />
    </div>
  );
}
