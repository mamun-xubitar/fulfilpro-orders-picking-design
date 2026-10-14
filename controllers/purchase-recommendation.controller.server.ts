import { SupplierProductModel } from '@/models/supplier-product.model.server';
import type { ProductsSortKey } from '@/models/supplier-product.model.server';
import { canReadInventory } from '@/lib/roles';

const model = new SupplierProductModel();

const SORT_KEYS = new Set<string>(['name', 'brand', 'reorder', 'stock', 'createdAt']);
const PAGE_SIZES = [20, 50, 100];

type Session = { user?: { role?: string | null } | null } | null;

export class PurchaseRecommendationController {
  /** Every product with at least one variant in the Reorder state, one page at a time. */
  async list(searchParams: URLSearchParams, session: Session) {
    if (!canReadInventory(session?.user?.role)) return { error: { message: 'Forbidden', status: 403 } };

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = PAGE_SIZES.includes(Number(searchParams.get('pageSize'))) ? Number(searchParams.get('pageSize')) : PAGE_SIZES[0];
    const sortParam = searchParams.get('sort');
    const sort = sortParam && SORT_KEYS.has(sortParam) ? (sortParam as ProductsSortKey) : 'reorder';
    const dirParam = searchParams.get('dir');
    const dir = dirParam === 'asc' || dirParam === 'desc' ? dirParam : sort === 'reorder' ? 'desc' : 'asc';

    const { products, total } = await model.list({
      page,
      pageSize,
      search: searchParams.get('search')?.trim() || undefined,
      supplierId: searchParams.get('supplier')?.trim() || undefined,
      reorderOnly: true,
      sort,
      dir,
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, totalPages);
    return { data: { products, pagination: { page: current, pageSize, total, totalPages, hasPrev: current > 1, hasNext: current < totalPages } } };
  }
}
