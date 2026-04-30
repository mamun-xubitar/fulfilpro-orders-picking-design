'use client';

import { useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import type { StoreRow } from '@/models/store.model.server';

const STATUS_MAP: Record<string, { chip: string; label: string }> = {
  connected: { chip: 'bg-green-100 text-green-700', label: 'Connected' },
  disconnected: { chip: 'bg-gray-100 text-gray-500', label: 'Disconnected' },
  pending: { chip: 'bg-amber-100 text-amber-700', label: 'Pending' },
};

interface StoresTableProps {
  stores: StoreRow[];
  isLoading: boolean;
  onDisconnect: (id: string) => void;
  onReconnect: (id: string) => void;
  onDelete: (id: string) => void;
  onLogoUpload: (id: string, file: File) => void;
  onLogoRemove: (id: string) => void;
  disconnectingIds: string[];
  deletingIds: string[];
  uploadingLogoIds: string[];
  logoErrors: Record<string, string>;
}

function logoUrl(logoPath: string | null) {
  const filename = logoPath?.split('/').pop();
  return filename ? `/api/uploads/logos/${encodeURIComponent(filename)}` : '';
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function StoresTable({
  stores,
  isLoading,
  onDisconnect,
  onReconnect,
  onDelete,
  onLogoUpload,
  onLogoRemove,
  disconnectingIds,
  deletingIds,
  uploadingLogoIds,
  logoErrors,
}: StoresTableProps) {
  const [storePendingLogoRemoval, setStorePendingLogoRemoval] = useState<StoreRow | null>(null);

  const handleFileChange = (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onLogoUpload(id, file);
  };

  const handleConfirmLogoRemove = () => {
    if (!storePendingLogoRemoval) return;
    onLogoRemove(storePendingLogoRemoval.id);
    setStorePendingLogoRemoval(null);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-[820px] w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Logo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

            {!isLoading && stores.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-16 text-sm">
                  No stores connected yet.
                </td>
              </tr>
            )}

            {!isLoading && stores.map((store) => {
              const sc = STATUS_MAP[store.status] ?? STATUS_MAP.disconnected;
              const isDisconnecting = disconnectingIds.includes(store.id);
              const isDeleting = deletingIds.includes(store.id);
              const isUploadingLogo = uploadingLogoIds.includes(store.id);
              const isBusy = isDisconnecting || isDeleting || isUploadingLogo;
              const logoInputId = `store-logo-${store.id}`;
              const logoSrc = logoUrl(store.logoPath);

              return (
                <tr key={store.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{store.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {logoSrc ? (
                          <Image
                            src={logoSrc}
                            alt={`${store.name ?? store.storeDomain} logo`}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-400">
                            {(store.name ?? store.storeDomain).slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {isUploadingLogo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            id={logoInputId}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="sr-only"
                            disabled={isBusy}
                            onChange={(event) => handleFileChange(store.id, event)}
                          />
                          <label
                            htmlFor={logoInputId}
                            title={logoSrc ? 'Change logo' : 'Upload logo'}
                            aria-label={logoSrc ? `Change logo for ${store.name ?? store.storeDomain}` : `Upload logo for ${store.name ?? store.storeDomain}`}
                            className={[
                              'inline-flex h-7 min-w-7 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-xs transition-colors duration-150',
                              isBusy
                                ? 'pointer-events-none border-gray-200 text-gray-400'
                                : 'border-blue-200 text-blue-600 hover:bg-blue-50',
                            ].join(' ')}
                          >
                            {logoSrc ? <svg className="h-4 w-4 text-current" fill='currentColor' viewBox="0 0 122.61 122.88"><path d="M23.28,94.67H23a50.6,50.6,0,0,0,88.87-33.1,5.36,5.36,0,0,1,10.71,0A61.3,61.3,0,0,1,17.54,104.48v12.35a5.36,5.36,0,0,1-10.72,0V89.31A5.36,5.36,0,0,1,12.18,84h3.91a50.57,50.57,0,0,0,7.19,10.71Zm38-72.91A39.68,39.68,0,1,1,21.62,61.44,39.68,39.68,0,0,1,61.31,21.76ZM55.1,83.41H67.55A4.48,4.48,0,0,0,72,78.93V63.45h7.91A3.72,3.72,0,0,0,83.09,62c1.66-2.49-.6-5-2.17-6.68-4.47-4.89-14.57-13.76-16.77-16.35a3.64,3.64,0,0,0-5.71,0C56.17,41.59,45.52,51,41.28,55.75,39.81,57.4,38,59.66,39.52,62a3.76,3.76,0,0,0,3.17,1.49h7.93V78.93a4.49,4.49,0,0,0,4.48,4.48Zm51.5-78a5.36,5.36,0,1,1,10.71,0V33.14A5.36,5.36,0,0,1,112,38.49h-5.65A50.42,50.42,0,0,0,99,27.78h0a51,51,0,0,0-6.48-6.07l0,0L91.62,21l-.1-.07-.11-.08-.21-.16L91,20.61l0,0-.22-.16-.42-.3L90.13,20A50.51,50.51,0,0,0,25.6,25.73c-.31.31-.62.62-.92.94l-.35.37-.06.07-.35.37A50.45,50.45,0,0,0,10.71,61.57,5.36,5.36,0,1,1,0,61.57,61.31,61.31,0,0,1,91.07,8,61.83,61.83,0,0,1,106.6,20.27V5.36Z" /></svg> :
                              <svg className="h-4 w-4 text-current" fill='currentColor' shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" viewBox="0 0 512 364.92"><path fillRule="nonzero" d="M359.34 124.66c-13.56 6.7-25.71 15.36-37.41 24.9l-20.13-23.03c14.81-13.74 32.08-24.49 50.64-32.39-37.56-66.54-128.4-83.94-188.3-37.42-21.75 16.84-38.26 42.04-44.61 75.42l-2 10.43-10.4 1.84c-10.19 1.78-19.29 4.24-27.27 7.36-49.8 19.27-63.78 74.7-33.31 116.79 13.04 17.91 29.66 36.17 51.47 39.21h30.49c-.21 3-.32 6.02-.32 9.07 0 7.34.62 14.53 1.82 21.53H97.53l-1.92-.17c-30.53-3.88-55.62-26.61-73.75-51.72C-20.41 228.28.4 149.83 68.93 123.25c7.15-2.79 14.8-5.12 22.86-6.99 9.15-36.34 28.65-64.32 53.72-83.74C222.7-27.29 338.58-1.8 382.79 86.08c6.65-1.05 13.31-1.58 19.92-1.5 98.9.73 138.01 127.2 86.69 195.33-20.57 27.29-52.12 50.51-84.61 58.05l-3.41.41h-19.81a128.362 128.362 0 0 0 1.5-30.6h16.61c24.15-5.81 49.91-25.68 65.23-46.16 36.46-48.56 10.58-146.05-62.41-146.51-14.26-.12-29.11 3.33-43.16 9.56zM234.73 364.92h42.56c9.95 0 18.11-8.16 18.11-18.11v-58.64h31.04c6.54-.28 11.18-2.44 13.87-6.52 7.27-10.91-2.66-21.68-9.55-29.27-19.55-21.46-53.22-53.23-62.87-64.59-7.32-8.08-17.72-8.08-25.04 0-9.97 11.64-44.84 45.77-63.43 66.64-6.45 7.27-14.42 17.17-7.72 27.22 2.76 4.08 7.35 6.24 13.89 6.52h31.04v58.64c0 9.84 8.15 18.11 18.1 18.11z" /></svg>
                            }
                           {isUploadingLogo && <span>Loading...</span>}
                          </label>
                          {logoSrc && (
                            <button
                              type="button"
                              onClick={() => setStorePendingLogoRemoval(store)}
                              disabled={isBusy}
                              title="Remove logo"
                              aria-label={`Remove logo for ${store.name ?? store.storeDomain}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12m-9 0V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 11.2A2 2 0 0 1 14.3 20H9.7a2 2 0 0 1-2-1.8L7 7m3 4v5m4-5v5" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {logoErrors[store.id] && (
                          <p className="mt-1 max-w-[180px] truncate text-xs text-red-500" title={logoErrors[store.id]}>
                            {logoErrors[store.id]}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{store.storeDomain}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.chip}`}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {store.status === 'connected' && (
                        <button
                          onClick={() => onDisconnect(store.id)}
                          disabled={isBusy}
                          className="px-2.5 py-1 text-xs border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
                        >
                          {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                      )}
                      {store.status !== 'connected' && (
                        <>
                          <button
                            onClick={() => onReconnect(store.id)}
                            disabled={isBusy}
                            className="px-2.5 py-1 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
                          >
                            {store.status === 'pending' ? 'Authorize' : 'Reconnect'}
                          </button>
                          <button
                            onClick={() => onDelete(store.id)}
                            disabled={isBusy}
                            className="px-2.5 py-1 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors duration-150 disabled:opacity-50 cursor-pointer"
                          >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {storePendingLogoRemoval && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => setStorePendingLogoRemoval(null)} />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex gap-3 px-5 pt-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">Remove store logo?</h2>
                <p className="mt-1 text-sm text-gray-600">
                  This will remove the logo for <span className="font-medium text-gray-900">{storePendingLogoRemoval.name ?? storePendingLogoRemoval.storeDomain}</span>.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 px-5 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setStorePendingLogoRemoval(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogoRemove}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Remove Logo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
