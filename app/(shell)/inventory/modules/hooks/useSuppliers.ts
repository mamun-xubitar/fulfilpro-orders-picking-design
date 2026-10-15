'use client';

import { useEffect, useRef, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { buildPageNumbers, type PaginationState } from '@/hooks/usePagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';

export type SupplierRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  poEmail: string;
  description: string | null;
  productCount: number;
  purchaseOrderCount: number;
  paymentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplierForm = { name: string; poEmail: string; contactEmail: string; description: string };

const EMPTY_FORM: SupplierForm = { name: '', poEmail: '', contactEmail: '', description: '' };
export const SUPPLIER_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;
const EMPTY_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type UseSuppliersArgs = {
  /** Called after a create/edit/delete so the New Product / Import Products / Create PO
   * dropdowns elsewhere on the page pick up the change immediately. */
  onChanged: () => void;
  /** Bumped by usePurchaseOrder after a successful Receive — a receipt can create a new
   * (non-primary) supplier link, which this list's Products Count must reflect immediately. */
  refreshKey?: number;
};

/** List + create/edit/delete for the Suppliers module tab. Mirrors the house pattern: debounced
 * search, page state reset to 1 on filter change, an EMPTY_FORM + set(field) form helper, and
 * server errors surfaced inline via useRequest's `errors` map. */
export function useSuppliers({ onChanged, refreshKey }: UseSuppliersArgs) {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const [initialLoading, setInitialLoading] = useState(true);
  // Which query `rows` belong to — a refetch of the same query keeps showing them instead of a skeleton.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { request: requestList, loading: listLoading } = useRequest<{ suppliers: SupplierRow[]; pagination: PaginationState }>();

  const [searchInput, setSearchInputState] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchInput = (value: string) => {
    setSearchInputState(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPage(1), 300);
  };

  const queryKey = JSON.stringify({ search: searchInput, page, pageSize });
  const load = (overrides?: { page?: number }) => {
    requestList({
      url: '/api/inventory/suppliers',
      method: 'GET',
      showToast: false,
      data: { search: searchInput, page: overrides?.page ?? page, pageSize },
      onSuccess: ({ data }) => {
        setRows(data.suppliers);
        setPagination(data.pagination);
        setInitialLoading(false);
        setLoadedKey(queryKey);
      },
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [searchInput, page, pageSize, refreshKey]);

  const pageNumbers = buildPageNumbers(pagination.page, pagination.totalPages);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setFormState] = useState<SupplierForm>(EMPTY_FORM);
  const set = (field: keyof SupplierForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormState((prev) => ({ ...prev, [field]: e.target.value }));

  const { request: requestSave, loading: saving, errors: saveErrors } = useRequest<SupplierRow>();
  const { request: requestDelete, loading: deleting } = useRequest<null>();

  /** `onCreated` fires once, after a successful create, with the new supplier row — used by
   * SupplierMultiSelect's create-on-not-found flow to auto-select the supplier it just made. */
  const onCreatedRef = useRef<((supplier: SupplierRow) => void) | null>(null);
  const openCreate = (options?: { name?: string; onCreated?: (supplier: SupplierRow) => void }) => {
    setEditingId(null);
    setFormState({ ...EMPTY_FORM, name: options?.name ?? '' });
    onCreatedRef.current = options?.onCreated ?? null;
    setModalOpen(true);
  };
  const openEdit = (row: SupplierRow) => {
    setEditingId(row.id);
    setFormState({ name: row.name, poEmail: row.poEmail, contactEmail: row.contactEmail ?? '', description: row.description ?? '' });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const save = () => {
    requestSave({
      url: editingId ? `/api/inventory/suppliers/${editingId}` : '/api/inventory/suppliers',
      method: editingId ? 'PATCH' : 'POST',
      data: form,
      successMessage: editingId ? 'Supplier updated' : 'Supplier created',
      onSuccess: ({ data }) => {
        setModalOpen(false);
        load();
        onChanged();
        if (!editingId) onCreatedRef.current?.(data);
        onCreatedRef.current = null;
      },
    });
  };

  const [deleteTarget, setDeleteTarget] = useState<SupplierRow | null>(null);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    requestDelete({
      url: `/api/inventory/suppliers/${deleteTarget.id}`,
      method: 'DELETE',
      successMessage: 'Supplier deleted',
      onSuccess: () => {
        setDeleteTarget(null);
        load();
        onChanged();
      },
      // A 409 (supplier still has products) leaves the confirm dialog open — useRequest already
      // toasts the message, so the admin sees why and can cancel instead.
    });
  };

  return {
    rows,
    pagination,
    pageNumbers,
    loading: listLoading,
    initialLoading,
    showSkeleton: initialLoading || (listLoading && loadedKey !== queryKey),
    searchInput,
    setSearchInput,
    goToPage: setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    modalOpen,
    editingId,
    form,
    set,
    openCreate,
    openEdit,
    closeModal,
    save,
    saving,
    saveErrors,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    deleting,
  };
}
