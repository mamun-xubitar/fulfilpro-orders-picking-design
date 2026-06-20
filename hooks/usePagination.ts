'use client';

import { useMemo, useState } from 'react';

export type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type PaginationItem = number | 'ellipsis';

export function buildPageNumbers(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 2) return [1, 2, 3, 'ellipsis', totalPages];
  if (page >= totalPages - 1) return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
}

export function usePagination(initialState: PaginationState) {
  const [pagination, setPagination] = useState(initialState);

  const pageNumbers = useMemo<PaginationItem[]>(
    () => buildPageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  );

  const goToPage = (page: number) => setPagination((prev) => ({ ...prev, page }));

  return { pagination, setPagination, pageNumbers, goToPage };
}
