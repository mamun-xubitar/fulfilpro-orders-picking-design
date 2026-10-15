'use client';

import { STATUS_STYLES, STICKY_THEAD } from './constants';
import { useInventoryAccess } from './InventoryAccess';
import { Eye, Plus } from './icons';
import SortableTh from './SortableTh';
import { SkeletonRows, type SkeletonCell } from './Skeleton';
import type { PurchaseRecommendTabState, RecommendSortKey } from './hooks/usePurchaseRecommendTab';
import type { ProductRecord } from './types';
import { formatNumber, getStatus } from './utils';

type RecommendTableProps = {
  tab: PurchaseRecommendTabState;
  onOpenProduct: (productId: string) => void;
  /** Starts a purchase order for the given variants of a product. */
  onCreatePo: (product: ProductRecord, variantIds: string[]) => void;
};

const COLUMN_COUNT = 8;
const RECOMMEND_SKELETON: SkeletonCell[] = ['stack', 'text', 'text', 'badge', 'num', 'num', { kind: 'actions', count: 2 }];

/** The variants of `product` that are in the Reorder state — the same rule as the variants matrix badge. */
export function reorderVariants(product: ProductRecord): ProductRecord['variants'] {
  return product.variants.filter((v) => getStatus(v) === 'below');
}

export default function RecommendTable({ tab, onOpenProduct, onCreatePo }: RecommendTableProps) {
  const th = (label: string, sortKey?: RecommendSortKey, align?: 'left' | 'right' | 'center') => (
    <SortableTh label={label} sortKey={sortKey} align={align} sort={tab.sort} dir={tab.dir} onSortChange={tab.changeSort} />
  );

  return (
    <div className="overflow-x-auto thin-scroll xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
      <table aria-busy={tab.loading || tab.initialLoading} className="w-full min-w-[940px] border-collapse text-[11px] leading-none">
        <thead className={STICKY_THEAD}>
          <tr className="border-b border-inventory-border bg-inventory-surface-muted">
            {th('Product', 'name')}
            {th('Brand', 'brand')}
            {th('Suppliers')}
            {th('Reorder variants', 'reorder', 'center')}
            {th('On hand', 'stock', 'right')}
            {th('Incoming', undefined, 'right')}
            {th('Actions', undefined, 'right')}
          </tr>
        </thead>
        <tbody>
          {tab.showSkeleton ? (
            <SkeletonRows rows={tab.rows.length || 8} cells={RECOMMEND_SKELETON} />
          ) : tab.rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-2 py-10 text-center text-[11px] text-inventory-text-subtle">
                {tab.hasFilters ? 'No products to reorder match these filters.' : 'Nothing needs reordering — every variant is at or above its trigger.'}
              </td>
            </tr>
          ) : (
            tab.rows.map((product) => <RecommendRow key={product.id} product={product} tab={tab} onOpenProduct={onOpenProduct} onCreatePo={onCreatePo} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecommendRow({ product, tab, onOpenProduct, onCreatePo }: { product: ProductRecord; tab: PurchaseRecommendTabState } & Omit<RecommendTableProps, 'tab'>) {
  const { canEdit } = useInventoryAccess();
  const flagged = reorderVariants(product);
  const onHand = product.variants.reduce((sum, v) => sum + v.stockOnHand, 0);
  const incoming = product.variants.reduce((sum, v) => sum + v.incoming, 0);

  return (
    <tr className="border-b border-inventory-divider transition-colors duration-150 hover:bg-inventory-surface-hover">
      <td className="max-w-[260px] px-2 py-1.5">
        <button
          type="button"
          onClick={() => onOpenProduct(product.id)}
          title={`Open ${product.name} in Variants`}
          className="block max-w-full truncate text-left font-medium text-inventory-secondary underline-offset-2 hover:underline cursor-pointer"
        >
          {product.name}
        </button>
        <span className="mt-[2px] block truncate text-[9.5px] text-inventory-text-subtle">{product.itemNo}</span>
      </td>
      <td className="max-w-[140px] truncate px-2 py-1.5 text-inventory-text-muted">{product.brand || '—'}</td>
      <td className="max-w-[200px] truncate px-2 py-1.5 text-inventory-text-muted" title={product.suppliers.map((s) => s.name).join(', ')}>
        {product.suppliers.length > 0 ? product.suppliers.map((s) => s.name).join(', ') : '—'}
      </td>
      <td className="px-2 py-1.5 text-center">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_STYLES.below.badge}`}>
          {flagged.length} of {product.variants.length}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{formatNumber(onHand)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{formatNumber(incoming)}</td>
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-[4px]">
          <button
            type="button"
            onClick={() => tab.setViewTarget(product)}
            title="View variants"
            aria-label={`View variants of ${product.name}`}
            className="flex h-[20px] w-[20px] items-center justify-center rounded-[6px] border border-inventory-border-strong bg-inventory-surface text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
          >
            <Eye className="h-3 w-3" />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => onCreatePo(product, flagged.map((v) => v.id))}
              title={`Create a purchase order for the ${flagged.length} variant${flagged.length === 1 ? '' : 's'} to reorder`}
              aria-label={`Create purchase order for ${product.name}`}
              className="flex h-[20px] w-[20px] items-center justify-center rounded-[6px] bg-inventory-primary text-white transition-colors duration-150 hover:bg-inventory-primary-hover cursor-pointer"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
