'use client';

import { useState, useCallback } from 'react';
import useRequest from '@/hooks/useRequest';
import type { CurrencyForm, CurrencyRateRow } from '../types';
import { EMPTY_CURRENCY_FORM } from '../types';

type MutationsParams = {
  bumpRefresh: () => void;
  setCurrencies: React.Dispatch<React.SetStateAction<CurrencyRateRow[]>>;
};

export function useCurrencyMutations({ bumpRefresh, setCurrencies }: MutationsParams) {
  const { request, loading, errors, setErrors } = useRequest<CurrencyRateRow>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editCurrency, setEditCurrency] = useState<CurrencyRateRow | null>(null);
  const [form, setForm] = useState<CurrencyForm>(EMPTY_CURRENCY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<CurrencyRateRow | null>(null);

  const openAdd = useCallback(() => {
    setEditCurrency(null);
    setForm(EMPTY_CURRENCY_FORM);
    setErrors({});
    setModalOpen(true);
  }, [setErrors]);

  const openEdit = useCallback((currency: CurrencyRateRow) => {
    setEditCurrency(currency);
    setForm({ code: currency.code, rate: String(currency.rate) });
    setErrors({});
    setModalOpen(true);
  }, [setErrors]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditCurrency(null);
  }, []);

  const set = (field: keyof CurrencyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'code' ? e.target.value.toUpperCase() : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  function submitForm() {
    const url = editCurrency ? `/api/inventory/settings/currencies/${editCurrency.id}` : '/api/inventory/settings/currencies';
    const method = editCurrency ? 'PATCH' : 'POST';
    void request({
      url,
      method,
      data: { rate: Number(form.rate), ...(editCurrency ? {} : { code: form.code }) },
      showToast: true,
      successMessage: editCurrency ? 'Currency updated' : 'Currency added',
      validation: async () => {
        const errs: Record<string, string> = {};
        if (!editCurrency && !form.code.trim()) errs.code = 'Currency code is required';
        if (!form.rate.trim() || Number.isNaN(Number(form.rate))) errs.rate = 'Enter a valid rate';
        return errs;
      },
      onSuccess: () => {
        bumpRefresh();
        closeModal();
      },
    });
  }

  const requestDelete = useCallback((currency: CurrencyRateRow) => setDeleteTarget(currency), []);
  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    void request({
      url: `/api/inventory/settings/currencies/${id}`,
      method: 'DELETE',
      showToast: true,
      successMessage: 'Currency removed',
      onSuccess: () => {
        setCurrencies((prev) => prev.filter((c) => c.id !== id));
        bumpRefresh();
        setDeleteTarget(null);
      },
    });
  }

  return {
    savingCurrency: loading,
    errors,
    modalOpen,
    editCurrency,
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
