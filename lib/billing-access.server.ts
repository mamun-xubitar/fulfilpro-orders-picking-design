import { canReadInventory, isTestUserRole } from '@/lib/roles';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

export type BillingSession = {
  user?: { id?: string | null; role?: string | null; name?: string | null; email?: string | null } | null;
} | null;

/** Customers and invoices are for admin and staff; the test user can look but not change. */
export const canReadBilling = (session: BillingSession) => canReadInventory(session?.user?.role);

export const canWriteBilling = (session: BillingSession) =>
  canReadInventory(session?.user?.role) && !isTestUserRole(session?.user?.role);

export const isBillingAdmin = (session: BillingSession) => session?.user?.role === 'admin';

/** Store ids the user may see; null means all stores. */
export async function billingStoreScope(session: BillingSession): Promise<string[] | null> {
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !role) return [];
  return getUserAllowedStoreIds(userId, role);
}

export type ListPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export function readListParams(searchParams: URLSearchParams, sortKeys: readonly string[], defaultSort: string) {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20') || 20));
  const requested = searchParams.get('sort') ?? '';
  return {
    search: searchParams.get('search')?.trim() ?? '',
    page,
    pageSize,
    sort: sortKeys.includes(requested) ? requested : defaultSort,
    dir: searchParams.get('dir') === 'asc' ? ('asc' as const) : ('desc' as const),
  };
}

export function buildPagination(page: number, pageSize: number, total: number): ListPagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page, pageSize, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
}
