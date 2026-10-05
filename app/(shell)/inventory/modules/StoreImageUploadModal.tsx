'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { Upload } from './icons';
import type { StoreListingImage } from './types';

type StoreImageUploadModalProps = {
  image: StoreListingImage & { position: number };
  saving: boolean;
  onSubmit: (file: File) => void;
  onClose: () => void;
};

/** "Update by upload": pick a file from this computer, see it beside the picture it will replace,
 * and confirm. The upload goes to this store only — the system gallery is never touched — and keeps
 * the image's place in the gallery and every variant link. */
export default function StoreImageUploadModal({ image, saving, onSubmit, onClose }: StoreImageUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <ModalShell
      title={`Update image ${image.position} by upload`}
      onClose={onClose}
      compact
      elevated
      maxWidthClass="max-w-[460px]"
      disableBackdropClose={saving}
      footer={
        <div className="flex items-center justify-between gap-[8px]">
          <span className="text-[10.5px] text-inventory-text-subtle">Replaces this image on the store only.</span>
          <div className="flex gap-[6px]">
            <button type="button" onClick={onClose} disabled={saving} className="flex h-[26px] items-center rounded-[7px] border border-inventory-border-strong px-[12px] text-[11px] font-bold text-inventory-text-muted hover:bg-inventory-surface-hover disabled:opacity-50 cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              disabled={!file || saving}
              onClick={() => file && onSubmit(file)}
              className="flex h-[26px] items-center gap-[6px] rounded-[7px] bg-inventory-primary px-[12px] text-[11px] font-bold text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {saving && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {saving ? 'Updating…' : 'Update image'}
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-[12px]">
        <figure className="space-y-[3px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.altText ?? `Image ${image.position}`} className="h-[110px] w-[110px] rounded-[8px] border border-inventory-border object-cover" />
          <figcaption className="text-[9.5px] font-semibold uppercase tracking-[0.3px] text-inventory-text-subtle">Current</figcaption>
        </figure>
        <label
          className={`flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-[4px] rounded-[8px] border border-dashed p-[8px] text-center text-[11px] transition-colors duration-150 ${
            file ? 'border-inventory-primary bg-inventory-primary/5' : 'border-inventory-border-strong hover:bg-inventory-surface-hover'
          }`}
        >
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-[80px] w-full rounded-[6px] object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-inventory-text-subtle" />
          )}
          <span className="max-w-full truncate font-semibold text-inventory-text">{file ? file.name : 'Choose a file'}</span>
          <span className="text-inventory-text-subtle">{file ? 'Click to choose a different file' : 'PNG, JPG or WebP, up to 10 MB'}</span>
        </label>
      </div>
    </ModalShell>
  );
}
