'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import type { ImageSource } from './hooks/useStoreImageActions';
import type { ProductImage } from './types';

type StoreImagePickerModalProps = {
  systemImages: ProductImage[];
  saving: boolean;
  onSubmit: (source: ImageSource) => void;
  onClose: () => void;
};

/** "Add image" chooser: pick one of the system product's images, or upload a new file (which goes to
 * the store only — it is never added to the system gallery). The image is appended to the gallery. */
export default function StoreImagePickerModal({ systemImages, saving, onSubmit, onClose }: StoreImagePickerModalProps) {
  const [hubImageId, setHubImageId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const source: ImageSource | null = file ? { file } : hubImageId ? { hubImageId } : null;

  return (
    <ModalShell
      title="Add image to the store"
      onClose={onClose}
      compact
      elevated
      maxWidthClass="max-w-[560px]"
      disableBackdropClose={saving}
      footer={
        <div className="flex items-center justify-between gap-[8px]">
          <span className="text-[10.5px] text-inventory-text-subtle">Added as the last image.</span>
          <div className="flex gap-[6px]">
            <button type="button" onClick={onClose} disabled={saving} className="flex h-[26px] items-center rounded-[7px] border border-inventory-border-strong px-[12px] text-[11px] font-bold text-inventory-text-muted hover:bg-inventory-surface-hover disabled:opacity-50 cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              disabled={!source || saving}
              onClick={() => source && onSubmit(source)}
              className="flex h-[26px] items-center gap-[6px] rounded-[7px] bg-inventory-primary px-[12px] text-[11px] font-bold text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {saving && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {saving ? 'Adding…' : 'Add image'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-[10px]">
        <section>
          <h4 className="mb-[6px] text-[9.5px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">From the system product</h4>
          {systemImages.length === 0 ? (
            <p className="text-[11px] text-inventory-text-subtle">The system product has no images.</p>
          ) : (
            <div role="radiogroup" aria-label="System images" className="grid max-h-[220px] grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-[6px] overflow-y-auto thin-scroll p-[2px]">
              {systemImages.map((img, i) => {
                const selected = !file && hubImageId === img.id;
                return (
                  <button
                    key={img.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={img.altText || `System image ${i + 1}`}
                    onClick={() => {
                      setFile(null);
                      setHubImageId(img.id);
                    }}
                    className={`relative aspect-square overflow-hidden rounded-[7px] border bg-inventory-surface-muted transition-shadow duration-150 cursor-pointer ${
                      selected ? 'border-inventory-primary ring-2 ring-inventory-primary-ring' : 'border-inventory-border hover:border-inventory-border-strong'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute left-[3px] top-[3px] rounded-[4px] bg-black/60 px-[4px] py-[1px] text-[9px] font-bold leading-none tabular-nums text-white">{i + 1}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h4 className="mb-[6px] text-[9.5px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Or upload a new image</h4>
          <label
            className={`flex cursor-pointer items-center gap-[10px] rounded-[8px] border border-dashed p-[8px] text-[11px] transition-colors duration-150 ${
              file ? 'border-inventory-primary bg-inventory-primary/5' : 'border-inventory-border-strong hover:bg-inventory-surface-hover'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                if (picked) setHubImageId(null);
              }}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-[56px] w-[56px] shrink-0 rounded-[6px] border border-inventory-border object-cover" />
            ) : (
              <span className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[6px] bg-inventory-surface-muted text-inventory-text-subtle">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-semibold text-inventory-text">{file ? file.name : 'Choose a file'}</span>
              <span className="block text-inventory-text-subtle">Goes to this store only — the system gallery is not changed. Up to 10 MB.</span>
            </span>
          </label>
        </section>
      </div>
    </ModalShell>
  );
}
