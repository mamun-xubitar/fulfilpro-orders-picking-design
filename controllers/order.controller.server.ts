import { OrderModel } from '@/models/order.model.server';

const model = new OrderModel();

type Period = 'all' | 'week' | 'month' | 'year';

export class OrderController {
  async list(searchParams: URLSearchParams) {
    const search = searchParams.get('search')?.trim() ?? '';
    const storeId = searchParams.get('storeId')?.trim() ?? '';
    const period = normalizePeriod(searchParams.get('period'));
    const page = normalizePositiveInt(searchParams.get('page'), 1);
    const pageSize = clamp(normalizePositiveInt(searchParams.get('pageSize'), 20), 5, 100);

    const [result, stores] = await Promise.all([
      model.listForConnectedStores({
        search,
        storeId: storeId || undefined,
        period,
        page,
        pageSize,
      }),
      model.getConnectedStoreOptions(),
    ]);

    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    return {
      data: {
        orders: result.orders,
        filters: {
          search,
          storeId,
          period,
        },
        stores,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      },
    };
  }
}

function normalizePeriod(value: string | null): Period {
  if (value === 'week' || value === 'month' || value === 'year') return value;
  return 'all';
}

function normalizePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
