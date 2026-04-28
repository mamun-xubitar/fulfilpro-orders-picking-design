'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

type RequestOptions<TData = unknown> = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, unknown>;
  showToast?: boolean;
  successMessage?: string | (() => null);
  onSuccess?: (res: { data: TData; message: string }) => void;
  onError?: (err: Record<string, string>) => void;
  validation?: () => Promise<Record<string, string>>;
};

export default function useRequest<TData = unknown>() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const request = useCallback(async (options: RequestOptions<TData>) => {
    const {
      url,
      method = 'POST',
      data,
      showToast = true,
      successMessage,
      onSuccess,
      onError,
      validation,
    } = options;

    if (validation) {
      const validationErrors = await validation();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }

    setErrors({});
    setLoading(true);

    let toastId: string | number | undefined;
    if (showToast) {
      toastId = toast.loading('Loading...');
    }

    try {
      let finalUrl = url;
      let body: string | undefined;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (method === 'GET' && data) {
        const params = new URLSearchParams();
        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.set(k, String(v));
        });
        finalUrl = `${url}?${params.toString()}`;
      } else if (data) {
        body = JSON.stringify(data);
      }

      const res = await fetch(finalUrl, { method, headers, body });
      const json = (await res.json()) as {
        success: boolean;
        message: string;
        data?: TData;
        errors?: string[];
      };

      if (!res.ok || !json.success) {
        const errorMessage = json.message || 'Something went wrong';
        const fieldErrors: Record<string, string> = {};

        if (json.errors?.length) {
          json.errors.forEach((e) => {
            const colonIdx = e.indexOf(':');
            if (colonIdx !== -1) {
              const field = e.slice(0, colonIdx).trim();
              const msg = e.slice(colonIdx + 1).trim();
              fieldErrors[field] = msg;
            } else {
              fieldErrors.general = e;
            }
          });
        }

        if (!Object.keys(fieldErrors).length) {
          fieldErrors.general = errorMessage;
        }

        setErrors(fieldErrors);

        if (showToast && toastId !== undefined) {
          toast.update(toastId, {
            render: errorMessage,
            type: 'error',
            isLoading: false,
            autoClose: 4000,
          });
        }

        onError?.(fieldErrors);
      } else {
        if (showToast && toastId !== undefined) {
          const msg =
            typeof successMessage === 'function' ? successMessage() : successMessage;
          if (msg) {
            toast.update(toastId, {
              render: msg,
              type: 'success',
              isLoading: false,
              autoClose: 3000,
            });
          } else {
            toast.dismiss(toastId);
          }
        }

        onSuccess?.({ data: json.data as TData, message: json.message });
      }
    } catch {
      const errMsg = 'Network error. Please try again.';
      setErrors({ general: errMsg });
      if (showToast && toastId !== undefined) {
        toast.update(toastId, {
          render: errMsg,
          type: 'error',
          isLoading: false,
          autoClose: 4000,
        });
      }
      onError?.({ general: errMsg });
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, errors, setErrors };
}
