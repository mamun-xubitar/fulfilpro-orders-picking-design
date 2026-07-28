import type { PaginationState } from '@/hooks/usePagination';

export const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};
