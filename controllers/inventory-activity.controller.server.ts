import { InventoryActivityModel, ACTIVITY_SORT_KEYS, type ActivitySortKey } from '@/models/inventory-activity.model.server';
import { canReadInventory } from '@/lib/roles';

const model = new InventoryActivityModel();

type Session = { user?: { role?: string | null } | null } | null;

export class InventoryActivityController {
  async list(searchParams: URLSearchParams, session: Session) {
    if (!canReadInventory(session?.user?.role)) return { error: { message: 'Forbidden', status: 403 } };

    const sortRaw = searchParams.get('sort') ?? '';
    const sort = (ACTIVITY_SORT_KEYS as readonly string[]).includes(sortRaw) ? (sortRaw as ActivitySortKey) : undefined;
    const dir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20') || 20));

    const result = await model.list({
      search: searchParams.get('search')?.trim() || undefined,
      type: searchParams.get('type')?.trim() || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sort,
      dir,
      page,
      pageSize,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    return {
      data: {
        activities: result.activities,
        pagination: { page, pageSize, total: result.total, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
      },
    };
  }
}
