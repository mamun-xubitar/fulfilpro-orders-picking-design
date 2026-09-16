'use client';

import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import StoreDraftImageCard from './StoreDraftImageCard';
import { Plus } from './icons';
import type { StoreDraft } from './hooks/useStorePublish';

// Mirrors the limits enforced in app/api/inventory/catalog/[id]/images/staged/route.ts
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file

type ApiResponse<T> = { success: boolean; message: string; data: T };

type StoreDraftMediaProps = {
  productId: string;
  draft: StoreDraft;
  toggleImage: (imageId: string) => void;
  setAlt: (imageId: string, value: string) => void;
  addImages: (images: { id: string; url: string; altText: string | null }[]) => void;
  removeImage: (imageId: string) => void;
};

/** Media section of a store draft — this store's own image list, temporary until Save. Adding a
 * file here stages it to disk (so Shopify has a URL to fetch) without creating a hub gallery row;
 * removing one here never deletes the hub's image, exactly like every other field in this modal. */
export default function StoreDraftMedia({ productId, draft, toggleImage, setAlt, addImages, removeImage }: StoreDraftMediaProps) {
  return (
    <div className="mb-3 space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">
          Media (Images) — {draft.images.length - draft.excludedImages.length} of {draft.images.length} selected
        </p>
        <p className="mt-1 text-[10px] leading-snug text-inventory-text-subtle">This store&apos;s own image list — added/removed here only, pushed on Save. The hub gallery is never touched.</p>
      </div>
      {draft.images.length === 0 && <p className="text-[11px] text-inventory-text-subtle">No images for this store yet.</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {draft.images.map((img) => (
          <StoreDraftImageCard
            key={img.id}
            image={img}
            excluded={draft.excludedImages.includes(img.id)}
            altValue={draft.imageAlts[img.id] ?? img.altText ?? ''}
            onToggleInclude={() => toggleImage(img.id)}
            onAltChange={(value) => setAlt(img.id, value)}
            onRemove={() => removeImage(img.id)}
          />
        ))}
        <AddImageTile productId={productId} onAdded={addImages} />
      </div>
    </div>
  );
}

function AddImageTile({ productId, onAdded }: { productId: string; onAdded: (images: { id: string; url: string; altText: string | null }[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-inventory-border-strong text-inventory-text-subtle transition-colors duration-150 hover:border-inventory-primary hover:text-inventory-secondary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        <span className="text-[10px] font-semibold">{uploading ? 'Uploading…' : 'Add image'}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length === 0) return;
          if (files.length > MAX_FILES) {
            toast.error(`You can upload at most ${MAX_FILES} files at once`);
            return;
          }
          const nonImage = files.find((f) => !f.type.startsWith('image/'));
          if (nonImage) {
            toast.error(`${nonImage.name} is not an image`);
            return;
          }
          const oversized = files.find((f) => f.size > MAX_SIZE);
          if (oversized) {
            toast.error(`${oversized.name} exceeds the 10 MB limit`);
            return;
          }

          const formData = new FormData();
          for (const file of files) formData.append('files', file);
          setUploading(true);
          try {
            const res = await fetch(`/api/inventory/catalog/${productId}/images/staged`, { method: 'POST', body: formData });
            const json = (await res.json()) as ApiResponse<{ files: { url: string; name: string }[] }>;
            if (!res.ok || !json.success) {
              toast.error(json.message || 'Upload failed');
              return;
            }
            onAdded(json.data.files.map((f) => ({ id: f.url, url: f.url, altText: null })));
          } catch {
            toast.error('Upload failed');
          } finally {
            setUploading(false);
          }
        }}
      />
    </>
  );
}
