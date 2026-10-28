'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useRequest from '@/hooks/useRequest';
import { useStoreOptions } from '@/hooks/useStoreOptions';
import { blankForm, formFromDetail, type InvoiceDetail, type InvoiceFormValues, type InvoiceListRow } from '@/components/invoices/invoiceForm';
import type { InvoiceModalMode } from '@/components/invoices/InvoiceModal';
import { useInvoicePrint } from '@/components/invoices/useInvoicePrint';
import { useInvoicesList } from './useInvoicesList';

type ModalState = { mode: InvoiceModalMode; initial: InvoiceFormValues; invoiceId: string | null; token: number };

export function useInvoicesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const stores = useStoreOptions();
  const list = useInvoicesList();
  const printer = useInvoicePrint();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceListRow | null>(null);
  const detailReq = useRequest<InvoiceDetail>();
  const deleteReq = useRequest();

  const open = (state: Omit<ModalState, 'token'>) => setModal({ ...state, token: Date.now() });

  const openCreate = () => open({ mode: 'create', initial: blankForm(stores.find((s) => s.id === list.storeId) ?? stores[0]), invoiceId: null });

  const openFromRow = (row: InvoiceListRow, mode: 'view' | 'edit' | 'copy') => {
    void detailReq.request({
      url: `/api/invoices/${row.id}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) =>
        open({ mode, initial: formFromDetail(data, mode === 'copy' ? 'copy' : 'edit'), invoiceId: mode === 'copy' ? null : data.id }),
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    void deleteReq.request({
      url: `/api/invoices/${deleteTarget.id}`,
      method: 'DELETE',
      onSuccess: () => {
        setDeleteTarget(null);
        list.refresh();
      },
    });
  };

  return {
    stores,
    list,
    printer,
    modal,
    closeModal: () => setModal(null),
    switchToEdit: () => modal && open({ ...modal, mode: 'edit' }),
    onSaved: () => {
      setModal(null);
      list.refresh();
    },
    openCreate,
    openFromRow,
    loadingDetail: detailReq.loading,
    deleteTarget,
    setDeleteTarget,
    deleting: deleteReq.loading,
    confirmDelete,
    canWrite: role === 'admin' || role === 'staff',
  };
}
