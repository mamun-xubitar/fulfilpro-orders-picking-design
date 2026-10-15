'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { buildPageNumbers, type PaginationState } from '@/hooks/usePagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';

export type LocationRow = {
  id: string;
  name: string;
  description: string | null;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LocationOption = { id: string; name: string };

export type LocationForm = { name: string; description: string };

const EMPTY_FORM: LocationForm = { name: '', description: '' };
export const LOCATION_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;
const EMPTY_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type UseLocationsArgs = {
  /** Bumped when a variant's locations change elsewhere, so the tab's per-location variant counts refresh. */
  refreshKey?: number;
  /** Called after a location is renamed or deleted — variant rows carry location names, so the
   * catalogue has to be re-read. */
  onChanged: () => void;
};

/** The Location module tab (list + create / edit / delete, mirroring useSuppliers) plus the full
 * name list every variant location picker draws from. */
export function useLocations({ refreshKey, onChanged }: UseLocationsArgs) {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const [initialLoading, setInitialLoading] = useState(true);
  // Which query `rows` belong to — a refetch of the same query keeps showing them instead of a skeleton.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { request: requestList, loading: listLoading } = useRequest<{ locations: LocationRow[]; pagination: PaginationState }>();
  const { request: requestOptions } = useRequest<{ locations: LocationOption[] }>();
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [optionsNonce, setOptionsNonce] = useState(0);

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
  const load = () => {
    requestList({
      url: '/api/inventory/locations',
      method: 'GET',
      showToast: false,
      data: { search: searchInput, page, pageSize },
      onSuccess: ({ data }) => {
        setRows(data.locations);
        setPagination(data.pagination);
        setInitialLoading(false);
        setLoadedKey(queryKey);
      },
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [searchInput, page, pageSize, refreshKey]);

  useEffect(() => {
    requestOptions({ url: '/api/inventory/locations', method: 'GET', showToast: false, data: { options: '1' }, onSuccess: ({ data }) => setOptions(data.locations) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsNonce]);

  const refreshAll = () => {
    load();
    setOptionsNonce((n) => n + 1);
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setFormState] = useState<LocationForm>(EMPTY_FORM);
  const set = (field: keyof LocationForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormState((prev) => ({ ...prev, [field]: e.target.value }));
  const { request: requestSave, loading: saving, errors: saveErrors } = useRequest<LocationRow>();
  const { request: requestDelete, loading: deleting } = useRequest<null>();

  const openCreate = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setModalOpen(true);
  };
  const openEdit = (row: LocationRow) => {
    setEditingId(row.id);
    setFormState({ name: row.name, description: row.description ?? '' });
    setModalOpen(true);
  };

  const save = () =>
    requestSave({
      url: editingId ? `/api/inventory/locations/${editingId}` : '/api/inventory/locations',
      method: editingId ? 'PATCH' : 'POST',
      data: form,
      successMessage: editingId ? 'Location updated' : 'Location created',
      onSuccess: () => {
        setModalOpen(false);
        refreshAll();
        if (editingId) onChanged();
      },
    });

  const [deleteTarget, setDeleteTarget] = useState<LocationRow | null>(null);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    requestDelete({
      url: `/api/inventory/locations/${deleteTarget.id}`,
      method: 'DELETE',
      successMessage: 'Location deleted',
      onSuccess: () => {
        setDeleteTarget(null);
        refreshAll();
      },
    });
  };

  /** Create-from-the-picker: makes a location named `name` straight away and resolves to it, so the
   * picker can select it without a modal round trip. */
  const createInline = async (name: string): Promise<LocationOption | null> => {
    try {
      const res = await fetch('/api/inventory/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const json = (await res.json()) as { success: boolean; message: string; errors?: string[]; data?: LocationRow };
      if (!res.ok || !json.success || !json.data) throw new Error(json.errors?.length ? json.errors.join('; ') : json.message || 'Failed to create location');
      toast.success('Location created');
      refreshAll();
      return { id: json.data.id, name: json.data.name };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create location');
      return null;
    }
  };

  return {
    rows,
    options,
    pagination,
    pageNumbers: buildPageNumbers(pagination.page, pagination.totalPages),
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
    closeModal: () => setModalOpen(false),
    save,
    saving,
    saveErrors,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    deleting,
    createInline,
  };
}

export type LocationsState = ReturnType<typeof useLocations>;
