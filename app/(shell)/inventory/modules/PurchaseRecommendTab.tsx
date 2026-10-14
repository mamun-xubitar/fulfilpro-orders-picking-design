'use client';

import Pagination from '@/components/Pagination';
import RecommendListToolbar from './RecommendListToolbar';
import RecommendTable from './RecommendTable';
import RecommendVariantsModal from './RecommendVariantsModal';
import { RECOMMEND_PAGE_SIZE_OPTIONS, type PurchaseRecommendTabState } from './hooks/usePurchaseRecommendTab';
import type { ProductRecord, SupplierOption } from './types';

type PurchaseRecommendTabProps = {
  tab: PurchaseRecommendTabState;
  suppliers: SupplierOption[];
  onOpenProduct: (productId: string) => void;
  onCreatePo: (product: ProductRecord, variantIds: string[]) => void;
};

/** The Purchase Recommend tab — every product with a variant to reorder, in one table. */
export default function PurchaseRecommendTab({ tab, suppliers, onOpenProduct, onCreatePo }: PurchaseRecommendTabProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm xl:min-h-0 xl:flex-1 xl:overflow-y-auto thin-scroll">
      <RecommendListToolbar tab={tab} suppliers={suppliers} />

      <RecommendTable tab={tab} onOpenProduct={onOpenProduct} onCreatePo={onCreatePo} />

      <Pagination
        pagination={tab.pagination}
        loading={tab.loading}
        pageNumbers={tab.pageNumbers}
        onPageChange={tab.goToPage}
        itemLabel="products"
        pageSizeOptions={RECOMMEND_PAGE_SIZE_OPTIONS}
        onPageSizeChange={tab.setPageSize}
      />

      {tab.viewTarget && <RecommendVariantsModal product={tab.viewTarget} onClose={() => tab.setViewTarget(null)} onCreatePo={onCreatePo} />}
    </div>
  );
}
