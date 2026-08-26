'use client';

import type { Dispatch, SetStateAction } from 'react';
import { createLocationRemark, type LocationRemark, type PrintOrder } from './usePickingListPage';

function updateLocationRemarks(setOrders: Dispatch<SetStateAction<PrintOrder[] | null>>, orderId: string, itemId: string, updater: (entries: LocationRemark[]) => LocationRemark[]) {
  setOrders((prev) => prev ? prev.map((o) => o.id === orderId ? { ...o, printItems: o.printItems.map((item) => item.id === itemId ? { ...item, locationRemarks: updater(item.locationRemarks) } : item) } : o) : prev);
}

type Props = {
  orderId: string;
  itemId: string;
  locationRemarks: LocationRemark[];
  disabled: boolean;
  setOrders: Dispatch<SetStateAction<PrintOrder[] | null>>;
};

export default function LocationRemarkFields({ orderId, itemId, locationRemarks, disabled, setOrders }: Props) {
  function updateField(entryId: string, patch: Partial<LocationRemark>) {
    updateLocationRemarks(setOrders, orderId, itemId, (entries) => entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry));
  }
  function addEntry(afterId: string) {
    updateLocationRemarks(setOrders, orderId, itemId, (entries) => {
      const index = entries.findIndex((entry) => entry.id === afterId);
      const next = [...entries];
      next.splice(index + 1, 0, createLocationRemark());
      return next;
    });
  }
  function removeEntry(entryId: string) {
    updateLocationRemarks(setOrders, orderId, itemId, (entries) => entries.length <= 1 ? entries : entries.filter((entry) => entry.id !== entryId));
  }

  return (
    <div className="mt-3 space-y-2">
      {locationRemarks.map((entry, idx) => {
        const isLast = idx === locationRemarks.length - 1;
        return (
          <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3">
            <label>
              {idx === 0 && <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Location</span>}
              <input value={entry.location} disabled={disabled} onChange={(e) => updateField(entry.id, { location: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100" />
            </label>
            <label>
              {idx === 0 && <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Remark</span>}
              <input value={entry.remark} disabled={disabled} onChange={(e) => updateField(entry.id, { remark: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100" />
            </label>
            <div className="flex items-center gap-1">
              {isLast ? (
                <button type="button" onClick={() => addEntry(entry.id)} disabled={disabled} className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Add location remark">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              ) : (
                <button type="button" onClick={() => removeEntry(entry.id)} disabled={disabled} className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Remove location remark">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" /></svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
