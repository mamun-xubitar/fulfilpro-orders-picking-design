'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, BulkJob, BulkProductAction, ProductRow } from '../types';

type BulkFilters = {
  search: string;
  searchField: string;
  storeIds: string[];
  status: string[];
  stockLevel: string;
};

type DeleteConfirmTarget = { kind: 'selection' } | { kind: 'single'; id: string; title: string };

type UseInventoryBulkArgs = {
  products: ProductRow[];
  filters: BulkFilters;
  bumpRefresh: () => void;
};

const POLL_INTERVAL_MS = 1500;

export function useInventoryBulk({ products, filters, bumpRefresh }: UseInventoryBulkArgs) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllFilters, setSelectAllFilters] = useState(false);
  const [bulkJob, setBulkJob] = useState<BulkJob | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [tagModal, setTagModal] = useState<{ mode: 'add' | 'remove'; input: string } | null>(null);
  const [channelModal, setChannelModal] = useState<{ mode: 'include' | 'exclude'; input: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmTarget | null>(null);

  const pollTimer = useRef<number | null>(null);

  const isCurrentPageAllSelected = products.length > 0 && products.every((p) => selectedIds.includes(p.id));

  const stopPolling = () => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const toggleSelect = (id: string) => {
    setSelectAllFilters(false);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSelectAllOnPage = () => {
    setSelectAllFilters(false);
    setSelectedIds((prev) =>
      isCurrentPageAllSelected
        ? prev.filter((id) => !products.some((p) => p.id === id))
        : [...new Set([...prev, ...products.map((p) => p.id)])]
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

  const pollJob = (jobId: string) => {
    stopPolling();
    pollTimer.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/inventory/bulk?jobId=${jobId}`);
        const json = (await res.json()) as ApiResponse<{ job: BulkJob }>;
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load bulk action status');

        setBulkJob(json.data.job);
        if (json.data.job.status === 'completed' || json.data.job.status === 'failed') {
          stopPolling();
          setBulkRunning(false);
          clearSelection();
          bumpRefresh();

          if (json.data.job.status === 'failed') {
            toast.error(json.data.job.error || 'Bulk action failed');
          } else {
            const errors = json.data.job.progress?.errors ?? [];
            if (errors.length > 0) {
              toast.info(`Bulk action finished with ${errors.length} error(s)`);
            } else {
              toast.success('Bulk action completed');
            }
          }
        }
      } catch (err) {
        stopPolling();
        setBulkRunning(false);
        toast.error(err instanceof Error ? err.message : 'Failed to load bulk action status');
      }
    }, POLL_INTERVAL_MS);
  };

  const runBulkAction = async (action: BulkProductAction, extra?: { tags?: string[]; channelName?: string }) => {
    setBulkRunning(true);
    setBulkJob(null);
    try {
      const body = selectAllFilters
        ? { action, selectAllFilters: true, filters, ...extra }
        : { action, productIds: selectedIds, ...extra };

      const res = await fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResponse<{ job: BulkJob }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to queue bulk action');

      setBulkJob(json.data.job);
      toast.info('Bulk action queued');
      pollJob(json.data.job.id);
    } catch (err) {
      setBulkRunning(false);
      toast.error(err instanceof Error ? err.message : 'Failed to queue bulk action');
    }
  };

  const runSingleDelete = async (id: string) => {
    setBulkRunning(true);
    try {
      const res = await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<null>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete product');
      toast.success('Product deleted');
      bumpRefresh();
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
    void runBulkAction('delete');
  };

  const submitTagModal = () => {
    if (!tagModal) return;
    const tags = tagModal.input.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length === 0) return;
    const mode = tagModal.mode;
    setTagModal(null);
    void runBulkAction(mode === 'add' ? 'add_tags' : 'remove_tags', { tags });
  };

  const submitChannelModal = () => {
    if (!channelModal) return;
    const channelName = channelModal.input.trim();
    if (!channelName) return;
    const mode = channelModal.mode;
    setChannelModal(null);
    void runBulkAction(mode === 'include' ? 'include_channel' : 'exclude_channel', { channelName });
  };

  return {
    selectedIds,
    selectAllFilters,
    isCurrentPageAllSelected,
    toggleSelect,
    toggleSelectAllOnPage,
    toggleSelectAllFilters,
    clearSelection,
    bulkJob,
    bulkRunning,
    runBulkAction,
    tagModal,
    setTagModal,
    submitTagModal,
    channelModal,
    setChannelModal,
    submitChannelModal,
    deleteConfirm,
    setDeleteConfirm,
    confirmDelete,
  };
}
