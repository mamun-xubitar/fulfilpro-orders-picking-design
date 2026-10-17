'use client';

import type { ChangeEvent } from 'react';
import Image from 'next/image';

type InvoiceLogoFieldProps = {
  storeName: string;
  logoPath: string | null;
  busy: boolean;
  error: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

function logoUrl(logoPath: string | null) {
  const filename = logoPath?.split('/').pop();
  return filename ? `/api/uploads/logos/${encodeURIComponent(filename)}` : '';
}

export default function InvoiceLogoField({ storeName, logoPath, busy, error, onUpload, onRemove }: InvoiceLogoFieldProps) {
  const logoSrc = logoUrl(logoPath);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onUpload(file);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Logo</label>
      <div className="flex items-center gap-3">
        <div className="relative flex h-16 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {logoSrc ? (
            <Image src={logoSrc} alt={`${storeName} invoice logo`} fill sizes="160px" className="object-contain p-1" />
          ) : (
            <span className="px-2 text-center text-xs font-semibold uppercase text-gray-400">{storeName || 'Store name'}</span>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <input id="invoice-logo-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={busy} onChange={handleChange} />
          <label
            htmlFor="invoice-logo-input"
            className={`inline-flex cursor-pointer items-center rounded-lg border px-2.5 py-1 text-xs transition-colors ${busy ? 'pointer-events-none border-gray-200 text-gray-400' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}
          >
            {logoSrc ? 'Replace logo' : 'Upload logo'}
          </label>
          {logoSrc && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 cursor-pointer"
            >
              Remove logo
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-400">Saved as soon as you choose a file. Without a logo, the store name is printed instead.</p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
