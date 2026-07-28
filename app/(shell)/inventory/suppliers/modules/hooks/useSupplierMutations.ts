'use client';

import { useState, useCallback } from 'react';
import useRequest from '@/hooks/useRequest';
import type { SupplierForm, SupplierRow } from '../types';
import { EMPTY_SUPPLIER_FORM } from '../types';

type MutationsParams = {
  bumpRefresh: () => void;
  setSuppliers: React.Dispatch<React.SetStateAction<SupplierRow[]>>;
};

export function useSupplierMutations({ bumpRefresh, setSuppliers }: MutationsParams) {
  const { request, loading, errors, setErrors } = useRequest<SupplierRow>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<SupplierRow | null>(null);
  const [form, setForm] = useState<SupplierForm>(EMPTY_SUPPLIER_FORM);

  const [deleteTarget, setDeleteTarget] = useState<SupplierRow | null>(null);

  const openAdd = useCallback(() => {
    setEditSupplier(null);
    setForm(EMPTY_SUPPLIER_FORM);
    setErrors({});
    setModalOpen(true);
  }, [setErrors]);

  const openEdit = useCallback((supplier: SupplierRow) => {
    setEditSupplier(supplier);
    setForm({
      name: supplier.name,
      poEmail: supplier.poEmail,
      contactEmail: supplier.contactEmail ?? '',
      description: supplier.description ?? '',
    });
    setErrors({});
    setModalOpen(true);
  }, [setErrors]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditSupplier(null);
  }, []);

  const set = (field: keyof SupplierForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  function submitForm() {
    const url = editSupplier ? `/api/inventory/suppliers/${editSupplier.id}` : '/api/inventory/suppliers';
    const method = editSupplier ? 'PATCH' : 'POST';
    void request({
      url,
      method,
      data: form as unknown as Record<string, unknown>,
      showToast: true,
      successMessage: editSupplier ? 'Supplier updated' : 'Supplier created',
      validation: async () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (!form.poEmail.trim()) errs.poEmail = 'PO email is required';
        return errs;
      },
      onSuccess: () => {
        bumpRefresh();
        closeModal();
      },
    });
  }

  const requestDelete = useCallback((supplier: SupplierRow) => setDeleteTarget(supplier), []);
  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    void request({
      url: `/api/inventory/suppliers/${id}`,
      method: 'DELETE',
      showToast: true,
      successMessage: 'Supplier deleted',
      onSuccess: () => {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        bumpRefresh();
        setDeleteTarget(null);
      },
    });
  }

  return {
    loading,
    errors,
    modalOpen,
    editSupplier,
    form,
    set,
    openAdd,
    openEdit,
    closeModal,
    submitForm,
    deleteTarget,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
