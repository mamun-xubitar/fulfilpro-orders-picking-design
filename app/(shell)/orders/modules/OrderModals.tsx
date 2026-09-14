'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { SHOPIFY_TRACKING_CARRIERS } from './constants';
import type {
  BackInStockItem,
  CancelFulfillmentModalState,
  EditFulfillmentModalState,
  MessageModalState,
  NoteModalState,
  OrderStockAdjustment,
  OrderRow,
  PendingFulfillmentModalState,
  RequestPermissionModalState,
  StockAdjustmentModalState,
  StockModalState,
  TrackingActionModalState,
} from './types';

type EligibleStockItem = { lineItemId: string; name: string; sku: string; vendor: string; remainingQty: number };

type OrderModalsProps = {
  stockModal: StockModalState | null;
  setStockModal: Dispatch<SetStateAction<StockModalState | null>>;
  closeStockModal: () => void;
  updateStockItem: (index: number, field: keyof BackInStockItem, value: string) => void;
  getAvailableStockItemsForRow: (order: OrderRow, items: BackInStockItem[], rowIndex: number) => EligibleStockItem[];
  getBackInStockEligibleItems: (order: OrderRow) => EligibleStockItem[];
  hasStockItemAvailableToAdd: (order: OrderRow, items: BackInStockItem[]) => boolean;
  addStockItem: () => void;
  removeStockItem: (index: number) => void;
  submitStockRequest: () => Promise<void>;
  formatStockStatus: (status: StockModalState['requests'][number]['status']) => string;
  messageModal: MessageModalState | null;
  setMessageModal: Dispatch<SetStateAction<MessageModalState | null>>;
  closeMessageModal: () => void;
  submitAdminMessage: () => Promise<void>;
  noteModal: NoteModalState | null;
  setNoteModal: Dispatch<SetStateAction<NoteModalState | null>>;
  closeNoteModal: () => void;
  cancelEditNote: () => void;
  submitOrderNote: () => Promise<void>;
  startEditNote: (note: NoteModalState['notes'][number]) => void;
  deleteOrderNote: (noteId: string) => Promise<void>;
  pendingFulfillment: PendingFulfillmentModalState | null;
  setPendingFulfillment: Dispatch<SetStateAction<PendingFulfillmentModalState | null>>;
  closeFulfillmentConfirmation: () => void;
  fulSaving: Record<string, boolean>;
  carrierDropdownOpen: boolean;
  setCarrierDropdownOpen: Dispatch<SetStateAction<boolean>>;
  carrierSearch: string;
  setCarrierSearch: Dispatch<SetStateAction<string>>;
  filteredTrackingCarriers: readonly string[];
  trackingNumInputRef: RefObject<HTMLInputElement | null>;
  confirmFul: () => Promise<void>;
  editFulModal: EditFulfillmentModalState | null;
  setEditFulModal: Dispatch<SetStateAction<EditFulfillmentModalState | null>>;
  submitEditFulfillment: () => Promise<void>;
  cancelFulModal: CancelFulfillmentModalState | null;
  setCancelFulModal: Dispatch<SetStateAction<CancelFulfillmentModalState | null>>;
  submitCancelFulfillment: () => Promise<void>;
  requestPermModal: RequestPermissionModalState | null;
  setRequestPermModal: Dispatch<SetStateAction<RequestPermissionModalState | null>>;
  submitPermissionRequest: () => Promise<void>;
  stockAdjustmentModal: StockAdjustmentModalState | null;
  setStockAdjustmentModal: Dispatch<SetStateAction<StockAdjustmentModalState | null>>;
  closeStockAdjustmentModal: () => void;
  toggleManagedStockAdjustmentItem: (lineItemId: string) => void;
  submitStockAdjustment: () => Promise<void>;
  trackingModal: TrackingActionModalState | null;
  closeTrackingModal: () => void;
  submitTrackingAction: () => Promise<void>;
};

export default function OrderModals({
  stockModal,
  setStockModal,
  closeStockModal,
  updateStockItem,
  getAvailableStockItemsForRow,
  getBackInStockEligibleItems,
  hasStockItemAvailableToAdd,
  addStockItem,
  removeStockItem,
  submitStockRequest,
  formatStockStatus,
  messageModal,
  setMessageModal,
  closeMessageModal,
  submitAdminMessage,
  noteModal,
  setNoteModal,
  closeNoteModal,
  cancelEditNote,
  submitOrderNote,
  startEditNote,
  deleteOrderNote,
  pendingFulfillment,
  setPendingFulfillment,
  closeFulfillmentConfirmation,
  fulSaving,
  carrierDropdownOpen,
  setCarrierDropdownOpen,
  carrierSearch,
  setCarrierSearch,
  filteredTrackingCarriers,
  trackingNumInputRef,
  confirmFul,
  editFulModal,
  setEditFulModal,
  submitEditFulfillment,
  cancelFulModal,
  setCancelFulModal,
  submitCancelFulfillment,
  requestPermModal,
  setRequestPermModal,
  submitPermissionRequest,
  stockAdjustmentModal,
  setStockAdjustmentModal,
  closeStockAdjustmentModal,
  toggleManagedStockAdjustmentItem,
  submitStockAdjustment,
  trackingModal,
  closeTrackingModal,
  submitTrackingAction,
}: OrderModalsProps) {
  return (
    <>
  {stockAdjustmentModal && (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
      onClick={closeStockAdjustmentModal}
    >
      <div
        className="w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-hidden rounded-lg bg-white shadow-xl border border-gray-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200">
          <div>
            <h3 id="stock-adjustment-title" className="text-base font-semibold text-gray-900">
              Manage stock adjustment
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Order {stockAdjustmentModal.order.number} - {stockAdjustmentModal.order.customer}
            </p>
          </div>
          <button
            type="button"
            onClick={closeStockAdjustmentModal}
            disabled={stockAdjustmentModal.saving}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto px-5 py-4">
          {stockAdjustmentModal.loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading stock adjustment...</div>
          ) : !stockAdjustmentModal.adjustment ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              No stock adjustment is pending for this order.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <span>
                  {stockAdjustmentModal.adjustment.managedCount}/{stockAdjustmentModal.adjustment.totalCount} products managed
                </span>
                <span>
                  Last event: {formatStockAdjustmentEventLabel(stockAdjustmentModal.adjustment.lastEventType)} on {new Date(stockAdjustmentModal.adjustment.lastEventAt).toLocaleString()}
                </span>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2 pr-2 text-left font-medium">Managed</th>
                    <th className="py-2 pr-2 text-left font-medium">Product</th>
                    <th className="py-2 pr-2 text-left font-medium">SKU</th>
                    <th className="py-2 pr-2 text-left font-medium">Action</th>
                    <th className="py-2 text-center font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAdjustmentModal.adjustment.items.map((item) => (
                    <tr key={item.lineItemId} className="border-b border-gray-100">
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={stockAdjustmentModal.managedLineItemIds.includes(item.lineItemId)}
                          onChange={() => toggleManagedStockAdjustmentItem(item.lineItemId)}
                          disabled={stockAdjustmentModal.saving}
                          className="rounded border-gray-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 pr-2 text-gray-800">
                        <div className="font-medium">{item.name}</div>
                        {item.vendor && <div className="text-[11px] text-gray-400">{item.vendor}</div>}
                      </td>
                      <td className="py-2 pr-2 font-mono text-gray-500">{item.sku || '-'}</td>
                      <td className="py-2 pr-2">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${item.action === 'restore' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-800'}`}>
                          {item.action === 'restore' ? 'Restore' : 'Decrease'}
                        </span>
                      </td>
                      <td className="py-2 text-center text-gray-700">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* <label className="block text-sm text-gray-700">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Note</span>
                <textarea
                  value={stockAdjustmentModal.note}
                  onChange={(event) => setStockAdjustmentModal((prev) => prev ? { ...prev, note: event.target.value, error: '' } : prev)}
                  rows={3}
                  maxLength={2000}
                  disabled={stockAdjustmentModal.saving}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  placeholder="Optional stock management note"
                />
              </label> */}

              {stockAdjustmentModal.error && (
                <p className="text-sm text-red-600">{stockAdjustmentModal.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeStockAdjustmentModal}
            disabled={stockAdjustmentModal.saving}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void submitStockAdjustment()}
            disabled={stockAdjustmentModal.saving || stockAdjustmentModal.loading || !stockAdjustmentModal.adjustment}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {stockAdjustmentModal.saving ? 'Saving...' : 'Save stock status'}
          </button>
        </div>
      </div>
    </div>
  )}

  {stockModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Request stock</h3>
            <p className="mt-0.5 text-xs text-gray-500">Order {stockModal.order.number} - {stockModal.order.customer}</p>
          </div>
          <button
            onClick={closeStockModal}
            disabled={stockModal.saving}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Close stock request modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(90vh-132px)] overflow-y-auto px-5 py-4">
          {stockModal.loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading stock request...</div>
          ) : stockModal.requests.length > 0 ? (
            <div className="space-y-4">
              {stockModal.requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatStockStatus(request.status)}</p>
                      <p className="text-xs text-gray-500">Requested by {request.requesterName} on {new Date(request.createdAt).toLocaleString()}</p>
                    </div>
                    {request.unreadUpdateCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {request.unreadUpdateCount} update{request.unreadUpdateCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-1 text-left font-medium">Item</th>
                        <th className="py-1 text-left font-medium">Supplier</th>
                        <th className="py-1 text-center font-medium">Qty</th>
                        <th className="py-1 text-center font-medium">Restocked</th>
                        <th className="py-1 text-left font-medium">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.items.map((item, index) => (
                        <tr key={`${request.id}-${index}`} className="border-b border-gray-100">
                          <td className="py-1.5 pr-2 text-gray-700">{item.item}</td>
                          <td className="py-1.5 pr-2 text-gray-600">{item.supplierName}</td>
                          <td className="py-1.5 text-center text-gray-700">{item.quantity}</td>
                          <td className="py-1.5 text-center text-gray-700">{item.restockedQuantity ?? 0}</td>
                          <td className="py-1.5 text-gray-600">{item.dueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {request.requestMessage && (
                    <p className="mt-3 whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">{request.requestMessage}</p>
                  )}
                  <div className="mt-4 space-y-2">
                    {request.messages.length === 0 ? (
                      <p className="text-xs text-gray-400">No updates yet.</p>
                    ) : request.messages.map((message) => (
                      <div key={message.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-gray-800">{message.senderName}</span>
                          <span className="text-xs text-gray-400">{new Date(message.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-gray-700">{message.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : getBackInStockEligibleItems(stockModal.order).length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              No product to request back in stock.
            </div>
          ) : (
            <div className="space-y-3">
              {stockModal.items.map((item, index) => {
                const eligibleItems = getAvailableStockItemsForRow(stockModal.order, stockModal.items, index);
                const selected = eligibleItems.find((eligible) => eligible.lineItemId === item.lineItemId);
                return (
                  <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-2.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_70px_160px_34px]">
                    <select
                      value={item.lineItemId}
                      onChange={(e) => updateStockItem(index, 'lineItemId', e.target.value)}
                      className="min-w-0 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
                    >
                      {eligibleItems.map((eligible) => (
                        <option key={eligible.lineItemId} value={eligible.lineItemId}>
                          {eligible.name}{eligible.sku ? ` - ${eligible.sku}` : ''} ({eligible.remainingQty} left)
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.supplierName}
                      onChange={(e) => updateStockItem(index, 'supplierName', e.target.value)}
                      className="min-w-0 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
                      placeholder="Supplier"
                    />
                    <input
                      type="number"
                      min={1}
                      max={selected?.remainingQty ?? 1}
                      value={item.quantity}
                      onChange={(e) => updateStockItem(index, 'quantity', e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                      placeholder="Qty"
                    />
                    <label className="flex min-w-0 items-center overflow-hidden rounded-md border border-gray-300 bg-white">
                      <span className="border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] font-medium text-gray-500">
                        Due date
                      </span>
                      <input
                        type="date"
                        value={item.dueDate}
                        onChange={(e) => updateStockItem(index, 'dueDate', e.target.value)}
                        className="min-w-0 flex-1 px-2 py-1.5 text-xs outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeStockItem(index)}
                      disabled={stockModal.items.length === 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                      aria-label="Remove product detail"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addStockItem}
                  disabled={!hasStockItemAvailableToAdd(stockModal.order, stockModal.items)}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add Product
                </button>
              </div>
              <textarea
                value={stockModal.message}
                onChange={(e) => setStockModal((prev) => prev ? { ...prev, message: e.target.value, error: '' } : prev)}
                className="min-h-20 w-full rounded-md border border-gray-300 px-2.5 py-2 text-xs"
                placeholder="Message (optional)"
              />
            </div>
          )}
          {stockModal.error && <p className="mt-3 text-sm text-red-600">{stockModal.error}</p>}
        </div>
        {!stockModal.loading && stockModal.requests.length === 0 && getBackInStockEligibleItems(stockModal.order).length > 0 && (
          <div className="flex justify-end border-t border-gray-200 px-5 py-3">
            <button
              type="button"
              onClick={() => void submitStockRequest()}
              disabled={stockModal.saving}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {stockModal.saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  )}

  {messageModal && (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-message-title"
      onClick={closeMessageModal}
    >
      <div
        className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-hidden rounded-lg bg-white shadow-xl border border-gray-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200">
          <div>
            <h3 id="admin-message-title" className="text-base font-semibold text-gray-900">
              Direct message
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Order {messageModal.order.number} · {messageModal.order.customer}
            </p>
          </div>
          <button
            type="button"
            onClick={closeMessageModal}
            disabled={messageModal.sending}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-4">
          {messageModal.loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading messages...</div>
          ) : (
            <div className="allow-copy grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-3">
                <label className="block text-sm text-gray-700">
                  <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Recipient</span>
                  <select
                    value={messageModal.selectedAdminId}
                    onChange={(event) => {
                      setMessageModal((prev) => prev ? { ...prev, selectedAdminId: event.target.value } : prev);
                    }}
                    disabled={messageModal.sending || messageModal.admins.length === 0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {messageModal.admins.length === 0 ? (
                      <option value="">No active recipients</option>
                    ) : (
                      messageModal.admins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.name} - {admin.email}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="block text-sm text-gray-700">
                  <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Message</span>
                  <textarea
                    value={messageModal.message}
                    onChange={(event) => {
                      setMessageModal((prev) => prev ? { ...prev, message: event.target.value, error: '' } : prev);
                    }}
                    rows={7}
                    maxLength={5000}
                    disabled={messageModal.sending}
                    placeholder="Write a message for the selected recipient"
                    className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  />
                </label>

                {messageModal.error && (
                  <p className="text-sm text-red-600">{messageModal.error}</p>
                )}

                <button
                  type="button"
                  onClick={submitAdminMessage}
                  disabled={messageModal.sending || messageModal.admins.length === 0}
                  className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {messageModal.sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Message history</h4>
                {messageModal.messages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                    No messages sent yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messageModal.messages.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{item.adminName}</p>
                            <p className="text-xs text-gray-500 truncate">{item.adminEmail}</p>
                          </div>
                          <p className="text-xs text-gray-400 sm:text-right">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {(item.senderName || item.senderEmail) && (
                          <p className="mt-1 text-xs text-gray-500">
                            Sent by {[item.senderName, item.senderEmail].filter(Boolean).join(' - ')}
                          </p>
                        )}
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{item.message}</p>
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
  )}

  {noteModal && (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-notes-title"
      onClick={closeNoteModal}
    >
      <div
        className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-hidden rounded-lg bg-white shadow-xl border border-gray-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200">
          <div>
            <h3 id="order-notes-title" className="text-base font-semibold text-gray-900">
              Order notes
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Order {noteModal.order.number} · {noteModal.order.customer}
            </p>
          </div>
          <button
            type="button"
            onClick={closeNoteModal}
            disabled={noteModal.saving || Boolean(noteModal.deletingId)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-4">
          {noteModal.loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading notes...</div>
          ) : (
            <div className="allow-copy grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
              <div className="space-y-3">
                <label className="block text-sm text-gray-700">
                  <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    {noteModal.editingNoteId ? 'Update note' : 'Add note'}
                  </span>
                  <textarea
                    value={noteModal.note}
                    onChange={(event) => {
                      setNoteModal((prev) => prev ? { ...prev, note: event.target.value, error: '' } : prev);
                    }}
                    rows={8}
                    maxLength={5000}
                    disabled={noteModal.saving}
                    placeholder="Write a note for this order"
                    className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                  />
                </label>

                {noteModal.error && (
                  <p className="text-sm text-red-600">{noteModal.error}</p>
                )}

                <div className="flex items-center gap-2">
                  {noteModal.editingNoteId && (
                    <button
                      type="button"
                      onClick={cancelEditNote}
                      disabled={noteModal.saving}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={submitOrderNote}
                    disabled={noteModal.saving}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {noteModal.saving ? 'Saving...' : noteModal.editingNoteId ? 'Update Note' : 'Add Note'}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Notes</h4>
                {noteModal.notes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                    No notes added yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {noteModal.notes.map((item) => {
                      const wasEdited = item.updatedAt !== item.createdAt;
                      return (
                        <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {item.authorName || item.authorEmail || 'Unknown user'}
                              </p>
                              {item.authorEmail && item.authorName && (
                                <p className="text-xs text-gray-500 truncate">{item.authorEmail}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditNote(item)}
                                disabled={noteModal.saving || Boolean(noteModal.deletingId)}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteOrderNote(item.id)}
                                disabled={noteModal.saving || Boolean(noteModal.deletingId)}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {noteModal.deletingId === item.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{item.note}</p>
                          <p className="mt-2 text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleString()}
                            {wasEdited && ` · Edited ${new Date(item.updatedAt).toLocaleString()}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {pendingFulfillment && (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fulfillment-confirmation-title"
      onClick={closeFulfillmentConfirmation}
    >
      <div
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg bg-white shadow-xl border border-gray-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 id="fulfillment-confirmation-title" className="text-base font-semibold text-gray-900">
            Confirm fulfilment
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Order {pendingFulfillment.order.number} will be fulfilled.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-700">
            After confirming fulfilment, these items cannot be changed without admin permission.
          </p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase text-gray-500">Items to fulfill</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {pendingFulfillment.lines.map((line) => {
                const item = pendingFulfillment.order.items.find((orderItem) => orderItem.id === line.lineItemId);
                return (
                  <li key={line.lineItemId} className="flex justify-between gap-3">
                    <span className="truncate">{item?.name ?? line.lineItemId}</span>
                    <span className="font-medium">x{line.quantity}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <label className="block text-sm text-gray-700">
            <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Barcodes</span>
            <input
              type="text"
              value={pendingFulfillment.barcodeInput}
              onChange={(event) => {
                setPendingFulfillment((prev) => (
                  prev ? { ...prev, barcodeInput: event.target.value } : prev
                ));
              }}
              placeholder="Scan or type barcodes"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="mt-1 block text-xs text-gray-500">
              Use a space between barcodes when adding multiple barcodes.
            </span>
          </label>

          <div className="grid grid-cols-1 gap-3">
            <div className="text-sm text-gray-700">
              <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Shipping carrier</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCarrierDropdownOpen((prev) => !prev);
                    setCarrierSearch('');
                  }}
                  className="w-full min-h-10 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  <span className={pendingFulfillment.trackingCompany ? 'text-gray-800 truncate' : 'text-gray-400'}>
                    {pendingFulfillment.trackingCompany || 'Select carrier'}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${carrierDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {carrierDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={carrierSearch}
                        onChange={(event) => setCarrierSearch(event.target.value)}
                        placeholder="Search carrier"
                        autoFocus
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {filteredTrackingCarriers.length > 0 ? (
                        filteredTrackingCarriers.map((carrier, index) => (
                          <button
                            key={`${carrier}-${index}`}
                            type="button"
                            onClick={() => {
                              setPendingFulfillment((prev) => (
                                prev ? { ...prev, trackingCompany: carrier } : prev
                              ));
                              setCarrierDropdownOpen(false);
                              setCarrierSearch('');
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 cursor-pointer ${pendingFulfillment.trackingCompany === carrier ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                              }`}
                          >
                            {carrier}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm text-gray-400">No carriers found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <label className="text-sm text-gray-700">
              <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                Tracking number{pendingFulfillment.trackingCompany.trim() ? ' *' : ''}
              </span>
              <input
                type="text"
                value={pendingFulfillment.trackingNumber}
                ref={trackingNumInputRef}
                required={Boolean(pendingFulfillment.trackingCompany.trim())}
                onChange={(event) => {
                  setPendingFulfillment((prev) => (
                    prev ? { ...prev, trackingNumber: event.target.value } : prev
                  ));
                }}
                placeholder="Enter tracking number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>

            <label className="text-sm text-gray-700">
              <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Tracking URL</span>
              <input
                type="url"
                value={pendingFulfillment.trackingUrl}
                onChange={(event) => {
                  setPendingFulfillment((prev) => (
                    prev ? { ...prev, trackingUrl: event.target.value } : prev
                  ));
                }}
                placeholder="https://carrier.example/track/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={pendingFulfillment.notifyCustomer}
              onChange={(event) => {
                setPendingFulfillment((prev) => (
                  prev ? { ...prev, notifyCustomer: event.target.checked } : prev
                ));
              }}
              className="rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            Send notification to customer
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={closeFulfillmentConfirmation}
            disabled={fulSaving[pendingFulfillment.order.id]}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={confirmFul}
            disabled={fulSaving[pendingFulfillment.order.id]}
            className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {fulSaving[pendingFulfillment.order.id] ? 'Confirming...' : 'Confirm fulfilment'}
          </button>
        </div>
      </div>
    </div>
  )}
  {/* Edit Fulfillment Modal */}
  {editFulModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit Fulfillment</h2>
          <p className="text-xs text-gray-500 mt-0.5">Order #{editFulModal.order.number}</p>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {editFulModal.error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editFulModal.error}</div>}
          <label className="block text-sm text-gray-700">
            <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Barcodes (space-separated)</span>
            <input type="text" value={editFulModal.barcodes} onChange={(e) => setEditFulModal((p) => p ? { ...p, barcodes: e.target.value } : null)} placeholder="barcode1 barcode2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          <label className="block text-sm text-gray-700">
            <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Fulfillment Date</span>
            <input type="date" value={editFulModal.fulfillmentDate} onChange={(e) => setEditFulModal((p) => p ? { ...p, fulfillmentDate: e.target.value } : null)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          <label className="block text-sm text-gray-700">
            <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Carrier</span>
            <input type="text" value={editFulModal.carrier} onChange={(e) => setEditFulModal((p) => p ? { ...p, carrier: e.target.value } : null)} list="edit-ful-carriers" placeholder="e.g. Australia Post" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <datalist id="edit-ful-carriers">{SHOPIFY_TRACKING_CARRIERS.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="block text-sm text-gray-700">
            <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Tracking Number</span>
            <input type="text" value={editFulModal.trackingNumber} onChange={(e) => setEditFulModal((p) => p ? { ...p, trackingNumber: e.target.value } : null)} placeholder="Enter tracking number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
          <label className="block text-sm text-gray-700">
            <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Tracking URL</span>
            <input type="url" value={editFulModal.trackingUrl} onChange={(e) => setEditFulModal((p) => p ? { ...p, trackingUrl: e.target.value } : null)} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
          <button onClick={() => setEditFulModal(null)} disabled={editFulModal.saving} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50">Cancel</button>
          <button onClick={() => void submitEditFulfillment()} disabled={editFulModal.saving} className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60">{editFulModal.saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )}

  {/* Cancel Fulfillment Modal */}
  {cancelFulModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Cancel Fulfillment</h2>
          <p className="text-xs text-gray-500 mt-0.5">Order #{cancelFulModal.order.number}</p>
        </div>
        <div className="p-5">
          {cancelFulModal.error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{cancelFulModal.error}</div>}
          <div className="flex items-start gap-3 text-sm text-gray-700">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Are you sure?</p>
              <p className="text-gray-600 text-xs">This will cancel the fulfillment and remove it from this order. This cannot be undone.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
          <button onClick={() => setCancelFulModal(null)} disabled={cancelFulModal.saving} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50">Go Back</button>
          <button onClick={() => void submitCancelFulfillment()} disabled={cancelFulModal.saving} className="px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-60">{cancelFulModal.saving ? 'Cancelling…' : 'Yes, Cancel Fulfillment'}</button>
        </div>
      </div>
    </div>
  )}

  {/* Staff Permission Request Modal */}
  {requestPermModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Request {requestPermModal.requestType === 'edit' ? 'Edit' : 'Cancel'} Permission</h2>
          <p className="text-xs text-gray-500 mt-0.5">Order #{requestPermModal.order.number}</p>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {requestPermModal.error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{requestPermModal.error}</div>}
          <div>
            <span className="block text-xs font-semibold uppercase text-gray-500 mb-2">Notify admin(s) *</span>
            {requestPermModal.loadingAdmins ? (
              <div className="text-xs text-gray-400">Loading admins…</div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {requestPermModal.availableAdmins.map((admin) => (
                  <label key={admin.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requestPermModal.selectedAdminIds.includes(admin.id)}
                      onChange={() => setRequestPermModal((prev) => {
                        if (!prev) return null;
                        const next = prev.selectedAdminIds.includes(admin.id)
                          ? prev.selectedAdminIds.filter((id) => id !== admin.id)
                          : [...prev.selectedAdminIds, admin.id];
                        return { ...prev, selectedAdminIds: next };
                      })}
                      className="rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{admin.name} <span className="text-xs text-gray-400">({admin.email})</span></span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <label className="block text-sm text-gray-700">
            <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Reason *</span>
            <textarea
              value={requestPermModal.reason}
              onChange={(e) => setRequestPermModal((p) => p ? { ...p, reason: e.target.value } : null)}
              rows={4}
              maxLength={2000}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Explain why you need this permission…"
            />
            <span className="text-xs text-gray-400">{requestPermModal.reason.length}/2000</span>
          </label>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
          <button onClick={() => setRequestPermModal(null)} disabled={requestPermModal.saving} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50">Cancel</button>
          <button onClick={() => void submitPermissionRequest()} disabled={requestPermModal.saving || requestPermModal.loadingAdmins} className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60">{requestPermModal.saving ? 'Submitting…' : 'Submit Request'}</button>
        </div>
      </div>
    </div>
  )}

  {trackingModal && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracking-action-title"
      onClick={closeTrackingModal}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 id="tracking-action-title" className="text-base font-semibold text-gray-900">
            {trackingModal.action === 'register' ? 'Register Tracking' : trackingModal.action === 'pause' ? 'Pause Tracking' : 'Restart Tracking'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Order #{trackingModal.order.number}</p>
        </div>
        <div className="p-5">
          {trackingModal.error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{trackingModal.error}</div>
          )}
          <p className="text-sm text-gray-700">
            {trackingModal.action === 'register'
              ? 'Register all tracking numbers for this order with 17track to enable automated shipment tracking.'
              : trackingModal.action === 'pause'
              ? `Pause tracking for ${trackingModal.tracking?.trackingNumber ?? 'this shipment'}. No further updates will be fetched until restarted.`
              : `Restart tracking for ${trackingModal.tracking?.trackingNumber ?? 'this shipment'}.`}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeTrackingModal}
            disabled={trackingModal.saving}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submitTrackingAction()}
            disabled={trackingModal.saving}
            className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60"
          >
            {trackingModal.saving
              ? 'Saving...'
              : trackingModal.action === 'register'
              ? 'Register'
              : trackingModal.action === 'pause'
              ? 'Pause Tracking'
              : 'Restart Tracking'}
          </button>
        </div>
      </div>
    </div>
  )}

    </>
  );
}

function formatStockAdjustmentEventLabel(value: OrderStockAdjustment['lastEventType']) {
  if (value === 'fulfillment_canceled') return 'Fulfillment canceled';
  if (value === 'partially_fulfilled') return 'Partially fulfilled';
  return 'Fulfilled';
}
