'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { NotifyModalState, Recipient } from './usePickingListPage';

type Props = {
  state: NotifyModalState;
  setState: Dispatch<SetStateAction<NotifyModalState | null>>;
  packingRecipients: Recipient[];
  onClose: () => void;
  onSubmit: () => void;
};

export default function NotifyModal({ state, setState, packingRecipients, onClose, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{state.type === 'confirm' ? 'Confirm packed' : 'Cancel packed'}</h3>
          <p className="text-sm text-gray-500">Order {state.order.number}</p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">Notify users</span>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {packingRecipients.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={state.selectedUserIds.includes(r.id)} onChange={() => setState((prev) => prev ? { ...prev, selectedUserIds: prev.selectedUserIds.includes(r.id) ? prev.selectedUserIds.filter((id) => id !== r.id) : [...prev.selectedUserIds, r.id] } : prev)} className="cursor-pointer rounded border-gray-300 text-blue-600" />
                  <span>{r.name}</span>
                  <span className="text-xs text-gray-400">{r.email}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="block text-sm text-gray-700">
            <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Email message (optional)</span>
            <textarea value={state.message} onChange={(e) => setState((prev) => prev ? { ...prev, message: e.target.value } : prev)} rows={4} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button onClick={onClose} disabled={state.saving} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600">Cancel</button>
          <button onClick={onSubmit} disabled={state.saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{state.saving ? 'Saving...' : 'Submit'}</button>
        </div>
      </div>
    </div>
  );
}
