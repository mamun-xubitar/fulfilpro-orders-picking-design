'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import type { PaginationState } from '@/hooks/usePagination';
import type { CustomerInvoiceSummary, CustomerRow, CustomerSource } from '../types';

export type InvoiceHistory = { invoices: CustomerInvoiceSummary[]; pagination: PaginationState };

/** View, delete, merge and sync — the actions on the customers list other than create / edit. */
export function useCustomerActions(source: CustomerSource, onChanged: () => void) {
  const [details, setDetails] = useState<CustomerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [selected, setSelected] = useState<Map<string, CustomerRow>>(new Map());
  const [mergeOpen, setMergeOpen] = useState(false);
  const [history, setHistory] = useState<InvoiceHistory | null>(null);
  const detailsReq = useRequest<CustomerRow>();
  const historyReq = useRequest<InvoiceHistory>();
  const deleteReq = useRequest();
  const mergeReq = useRequest();
  const syncReq = useRequest();

  const loadHistory = (customerId: string, page: number) =>
    void historyReq.request({
      url: `/api/customers/${customerId}/invoices`,
      method: 'GET',
      showToast: false,
      data: { source, page },
      onSuccess: ({ data }) => setHistory(data),
    });

  const openDetails = (row: CustomerRow) => {
    setDetails(row);
    setHistory(null);
    void detailsReq.request({
      url: `/api/customers/${row.id}?source=${source}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => setDetails(data),
    });
    loadHistory(row.id, 1);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    void deleteReq.request({
      url: `/api/customers/${deleteTarget.id}?source=${source}`,
      method: 'DELETE',
      onSuccess: () => {
        setSelected((prev) => {
          const next = new Map(prev);
          next.delete(deleteTarget.id);
          return next;
        });
        setDeleteTarget(null);
        onChanged();
      },
    });
  };

  const toggleSelected = (row: CustomerRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.set(row.id, row);
      return next;
    });

  const togglePage = (rows: CustomerRow[]) =>
    setSelected((prev) => {
      const next = new Map(prev);
      const allSelected = rows.every((row) => next.has(row.id));
      for (const row of rows) {
        if (allSelected) next.delete(row.id);
        else next.set(row.id, row);
      }
      return next;
    });

  const clearSelection = () => setSelected(new Map());

  const merge = (primaryId: string) => {
    void mergeReq.request({
      url: '/api/customers/merge',
      method: 'POST',
      data: { primaryId, ids: [...selected.keys()] },
      onSuccess: () => {
        setMergeOpen(false);
        clearSelection();
        onChanged();
      },
    });
  };

  // The sync runs in the background worker; the list picks the new rows up on its next refresh.
  const sync = () => void syncReq.request({ url: '/api/customers/sync', method: 'POST' });

  return {
    details,
    detailsLoading: detailsReq.loading,
    closeDetails: () => setDetails(null),
    openDetails,
    history,
    historyLoading: historyReq.loading,
    historyPage: (page: number) => details && loadHistory(details.id, page),
    deleteTarget,
    setDeleteTarget,
    deleting: deleteReq.loading,
    confirmDelete,
    selected,
    toggleSelected,
    togglePage,
    clearSelection,
    mergeOpen,
    setMergeOpen,
    merging: mergeReq.loading,
    merge,
    syncing: syncReq.loading,
    sync,
  };
}
