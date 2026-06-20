'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { MessageModalState, OrderRef } from '@/hooks/useOrderMessages';

type Props<O extends OrderRef> = {
  state: MessageModalState<O>;
  setState: Dispatch<SetStateAction<MessageModalState<O> | null>>;
  onClose: () => void;
  onSubmit: () => void;
};

export default function MessagesModal<O extends OrderRef>({ state, setState, onClose, onSubmit }: Props<O>) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="admin-message-title" onClick={onClose}>
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 id="admin-message-title" className="text-base font-semibold text-gray-900">Direct message</h3>
            <p className="mt-1 text-sm text-gray-500">Order {state.order.number} · {state.order.customer}</p>
          </div>
          <button type="button" onClick={onClose} disabled={state.sending} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-4">
          {state.loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading messages...</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-3">
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Recipient</span>
                  <select
                    value={state.selectedAdminId}
                    onChange={(e) => setState((prev) => prev ? { ...prev, selectedAdminId: e.target.value } : prev)}
                    disabled={state.sending || state.admins.length === 0}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {state.admins.length === 0
                      ? <option value="">No active recipients</option>
                      : state.admins.map((a) => <option key={a.id} value={a.id}>{a.name} - {a.email}</option>)
                    }
                  </select>
                </label>
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Message</span>
                  <textarea
                    value={state.message}
                    onChange={(e) => setState((prev) => prev ? { ...prev, message: e.target.value, error: '' } : prev)}
                    rows={7}
                    maxLength={5000}
                    disabled={state.sending}
                    placeholder="Write a message for the selected recipient"
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  />
                </label>
                {state.error && <p className="text-sm text-red-600">{state.error}</p>}
                <button type="button" onClick={onSubmit} disabled={state.sending || state.admins.length === 0} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {state.sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Message history</h4>
                {state.messages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">No messages sent yet.</div>
                ) : (
                  <div className="space-y-3">
                    {state.messages.map((msg) => (
                      <div key={msg.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800">{msg.adminName}</p>
                            <p className="truncate text-xs text-gray-500">{msg.adminEmail}</p>
                          </div>
                          <p className="text-xs text-gray-400 sm:text-right">{new Date(msg.createdAt).toLocaleString()}</p>
                        </div>
                        {(msg.senderName || msg.senderEmail) && (
                          <p className="mt-1 text-xs text-gray-500">Sent by {[msg.senderName, msg.senderEmail].filter(Boolean).join(' - ')}</p>
                        )}
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
