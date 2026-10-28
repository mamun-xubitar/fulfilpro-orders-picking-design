'use client';

import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { DEFAULT_INVOICE_ACCENT } from '@/lib/invoice-defaults';

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type InvoiceStoreRef = { id: string; name: string | null; storeDomain: string };

export type InvoiceFormValues = {
  storeName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  abn: string;
  invoicePrefix: string;
  paymentInstructions: string;
  accentColor: string;
  ausTaxRate: string;
  nzTaxRate: string;
  defaultTerms: string;
};

type InvoiceSettingsData = InvoiceFormValues & { logoPath: string | null };

const EMPTY_FORM: InvoiceFormValues = {
  storeName: '',
  businessName: '',
  email: '',
  websiteUrl: '',
  abn: '',
  invoicePrefix: '',
  paymentInstructions: '',
  accentColor: DEFAULT_INVOICE_ACCENT,
  ausTaxRate: '11',
  nzTaxRate: '15',
  defaultTerms: '',
};

function validateForm(form: InvoiceFormValues) {
  const errors: Record<string, string> = {};
  if (!form.storeName.trim()) errors.storeName = 'Store name is required';
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (form.abn.replace(/\s/g, '') && !/^\d{11}$/.test(form.abn.replace(/\s/g, ''))) errors.abn = 'ABN must be 11 digits';
  if (form.invoicePrefix.trim() && !/^[A-Za-z0-9#/-]{1,10}$/.test(form.invoicePrefix.trim())) {
    errors.invoicePrefix = 'Up to 10 letters, numbers, #, / or -';
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(form.accentColor.trim())) errors.accentColor = 'Use a hex color like #A6D3CC';
  (['ausTaxRate', 'nzTaxRate'] as const).forEach((field) => {
    const value = Number(form[field]);
    if (form[field].trim() === '' || !Number.isFinite(value) || value < 0 || value > 100) {
      errors[field] = 'Enter a rate between 0 and 100';
    }
  });
  return errors;
}

export function useInvoiceSettings() {
  const [target, setTarget] = useState<InvoiceStoreRef | null>(null);
  const [form, setForm] = useState<InvoiceFormValues>(EMPTY_FORM);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const activeStoreId = useRef<string | null>(null);

  const loadReq = useRequest<InvoiceSettingsData>();
  const saveReq = useRequest<InvoiceSettingsData>();
  const { request: loadRequest } = loadReq;
  const { request: saveRequest } = saveReq;

  const applyData = (data: InvoiceSettingsData) => {
    const { logoPath: nextLogo, ...values } = data;
    setForm(values);
    setLogoPath(nextLogo);
  };

  const open = useCallback((store: InvoiceStoreRef) => {
    activeStoreId.current = store.id;
    setTarget(store);
    setForm(EMPTY_FORM);
    setLogoPath(null);
    setLogoError('');
    void loadRequest({
      url: `/api/stores/${store.id}/invoice-settings`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        if (activeStoreId.current !== store.id) return;
        const { logoPath: nextLogo, ...values } = data;
        setForm(values);
        setLogoPath(nextLogo);
      },
    });
  }, [loadRequest]);

  const close = () => {
    activeStoreId.current = null;
    setTarget(null);
  };

  const set = (field: keyof InvoiceFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const setAccent = (value: string) => setForm((prev) => ({ ...prev, accentColor: value }));

  const save = () => {
    if (!target) return;
    void saveRequest({
      url: `/api/stores/${target.id}/invoice-settings`,
      method: 'PUT',
      data: { ...form },
      successMessage: 'Invoice settings saved.',
      validation: async () => validateForm(form),
      onSuccess: ({ data }) => {
        applyData(data);
        close();
      },
    });
  };

  const changeLogo = async (method: 'POST' | 'DELETE', file?: File) => {
    if (!target) return;
    const storeId = target.id;
    setLogoError('');
    setLogoBusy(true);
    const toastId = toast.loading(method === 'POST' ? 'Uploading logo...' : 'Removing logo...');
    try {
      const body = new FormData();
      if (file) body.set('logo', file);
      const res = await fetch(`/api/stores/${storeId}/invoice-settings/logo`, {
        method,
        body: method === 'POST' ? body : undefined,
      });
      const json = (await res.json()) as ApiResponse<InvoiceSettingsData>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Logo update failed.');
      if (activeStoreId.current === storeId) setLogoPath(json.data.logoPath);
      toast.update(toastId, { render: json.message, type: 'success', isLoading: false, autoClose: 3000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logo update failed.';
      setLogoError(message);
      toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 4000 });
    } finally {
      setLogoBusy(false);
    }
  };

  const uploadLogo = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLogoError('Choose an image file.');
      return;
    }
    void changeLogo('POST', file);
  };

  return {
    target,
    form,
    set,
    setAccent,
    logoPath,
    logoBusy,
    logoError,
    loading: loadReq.loading,
    saving: saveReq.loading,
    errors: { ...loadReq.errors, ...saveReq.errors },
    open,
    close,
    save,
    uploadLogo,
    removeLogo: () => void changeLogo('DELETE'),
  };
}
