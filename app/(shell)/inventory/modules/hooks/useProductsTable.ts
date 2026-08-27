'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { buildPageNumbers } from '@/hooks/usePagination';
import type { ProductRecord, ProductStatusValue } from '../types';

export type ProductsSortKey = 'name' | 'brand' | 'category' | 'sku' | 'status' | 'variants' | 'stock' | 'stockValue' | 'createdAt';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

type DeleteTarget = { kind: 'selection' } | { kind: 'single'; id: string; name: string };

type UseProductsTableArgs = {
  products: ProductRecord[];
  /** From the Verified toolbar checkbox — filters the table instead of being disabled by it. */
  verifiedOnly: boolean;
  onView: (id: string) => void;
  refreshCatalog: () => void;
};

export function totalStockOf(p: ProductRecord): number {
  return p.variants.reduce((sum, v) => sum + v.stockOnHand, 0);
}

export function availableStockOf(p: ProductRecord): number {
  return p.variants.reduce((sum, v) => sum + (v.stockOnHand - v.allocated), 0);
}

export function stockValueOf(p: ProductRecord): number {
  return p.variants.reduce((sum, v) => sum + v.stockOnHand * v.sellPrice, 0);
}

export function useProductsTable({ products, verifiedOnly, onView, refreshCatalog }: UseProductsTableArgs) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(PAGE_SIZE_OPTIONS[0]);

  // Every filter/sort/page-size setter resets to page 1 inline — mirrors how
  // useOrdersFilters resets its own pagination, instead of a useEffect side effect.
  const [search, setSearchState] = useState('');
  const setSearch = (value: string) => {
    setSearchState(value);
    setPage(1);
  };
  const [status, setStatusState] = useState<ProductStatusValue | ''>('');
  const setStatus = (value: ProductStatusValue | '') => {
    setStatusState(value);
    setPage(1);
  };
  const [supplierName, setSupplierNameState] = useState('');
  const setSupplierName = (value: string) => {
    setSupplierNameState(value);
    setPage(1);
  };
  const [sort, setSortState] = useState<ProductsSortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllFilters, setSelectAllFilters] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteTarget | null>(null);
  const [statusModal, setStatusModal] = useState<ProductStatusValue | null>(null);

  const supplierOptions = useMemo(() => [...new Set(products.map((p) => p.supplierName).filter(Boolean))].sort(), [products]);

  const hasActiveFilters = search.trim() !== '' || status !== '' || supplierName !== '';
  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setSupplierName('');
  };

  const filtered = useMemo(() => {
    let rows = verifiedOnly ? products.filter((p) => p.verified) : products;
    if (status) rows = rows.filter((p) => p.status === status);
    if (supplierName) rows = rows.filter((p) => p.supplierName === supplierName);
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.itemNo.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term) ||
          p.variants.some((v) => v.sku?.toLowerCase().includes(term) || v.barcode?.toLowerCase().includes(term))
      );
    }
    return rows;
  }, [products, verifiedOnly, status, supplierName, search]);

  const sorted = useMemo(() => {
    const factor = dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name) * factor;
        case 'brand':
          return a.brand.localeCompare(b.brand) * factor;
        case 'category':
          return a.category.localeCompare(b.category) * factor;
        case 'sku':
          return a.sku.localeCompare(b.sku) * factor;
        case 'status':
          return a.status.localeCompare(b.status) * factor;
        case 'variants':
          return (a.variants.length - b.variants.length) * factor;
        case 'stock':
          return (totalStockOf(a) - totalStockOf(b)) * factor;
        case 'stockValue':
          return (stockValueOf(a) - stockValueOf(b)) * factor;
        case 'createdAt':
          return a.createdAt.localeCompare(b.createdAt) * factor;
        default:
          return 0;
      }
    });
  }, [filtered, sort, dir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
  const pagination = {
    page: clampedPage,
    pageSize,
    total: sorted.length,
    totalPages,
    hasPrev: clampedPage > 1,
    hasNext: clampedPage < totalPages,
  };
  const pageNumbers = useMemo(() => buildPageNumbers(clampedPage, totalPages), [clampedPage, totalPages]);

  const handleSortChange = (key: ProductsSortKey) => {
    if (sort === key) {
      setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortState(key);
      setDir('asc');
    }
    setPage(1);
  };

  const isCurrentPageAllSelected = pageRows.length > 0 && pageRows.every((p) => selectedIds.includes(p.id));

  const toggleSelect = (id: string) => {
    setSelectAllFilters(false);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSelectAllOnPage = () => {
    setSelectAllFilters(false);
    setSelectedIds((prev) =>
      isCurrentPageAllSelected ? prev.filter((id) => !pageRows.some((p) => p.id === id)) : [...new Set([...prev, ...pageRows.map((p) => p.id)])]
    );
  };

  const toggleSelectAllFilters = () => {
    setSelectAllFilters((prev) => !prev);
    setSelectedIds([]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectAllFilters(false);
  };

  const targetIds = () => (selectAllFilters ? filtered.map((p) => p.id) : selectedIds);

  const runBulk = async (body: Record<string, unknown>) => {
    setBulkRunning(true);
    try {
      const res = await fetch('/api/inventory/catalog/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, productIds: targetIds() }),
      });
      const json = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !json.success) throw new Error(json.message || 'Bulk action failed');
      toast.success(json.message);
      clearSelection();
      refreshCatalog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkRunning(false);
    }
  };

  const runSingleDelete = async (id: string) => {
    setBulkRunning(true);
    try {
      const res = await fetch(`/api/inventory/catalog/${id}`, { method: 'DELETE' });
      const json = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete product');
      toast.success('Product deleted');
      refreshCatalog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setBulkRunning(false);
      setDeleteConfirm(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.kind === 'single') {
      void runSingleDelete(deleteConfirm.id);
      return;
    }
    setDeleteConfirm(null);
    void runBulk({ action: 'delete' });
  };

  const applyStatus = (value: ProductStatusValue) => {
    setStatusModal(null);
    void runBulk({ action: 'set_status', status: value });
  };

  const setVerified = (verified: boolean) => void runBulk({ action: 'set_verified', verified });

  return {
    search,
    setSearch,
    status,
    setStatus,
    supplierName,
    setSupplierName,
    supplierOptions,
    hasActiveFilters,
    handleClearFilters,
    sort,
    dir,
    handleSortChange,
    products: pageRows,
    pagination,
    pageNumbers,
    goToPage: setPage,
    pageSize,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    selectedIds,
    selectAllFilters,
    isCurrentPageAllSelected,
    toggleSelect,
    toggleSelectAllOnPage,
    toggleSelectAllFilters,
    clearSelection,
    bulkRunning,
    deleteConfirm,
    setDeleteConfirm,
    confirmDelete,
    statusModal,
    setStatusModal,
    applyStatus,
    setVerified,
    onView,
  };
}
