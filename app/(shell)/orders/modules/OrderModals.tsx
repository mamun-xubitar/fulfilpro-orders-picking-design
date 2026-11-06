'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type {
  BackInStockItem,
  CancelFulfillmentModalState,
  EditFulfillmentModalState,
  MessageModalState,
  NoteModalState,
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
  /** Note | Message toggle (the merged Orders page only). */
  onSwitchToMessages?: (order: OrderRow) => void;
  onSwitchToNotes?: (order: OrderRow) => void;
  messageSendDisabled?: boolean;
};

import StockAdjustmentDialog from './dialogs/StockAdjustmentDialog';
import RequestStockDialog from './dialogs/RequestStockDialog';
import MessagesDialog from './dialogs/MessagesDialog';
import NotesDialog from './dialogs/NotesDialog';
import FulfilConfirmDialog from './dialogs/FulfilConfirmDialog';
import { CancelFulfilmentDialog, EditFulfilmentDialog, RequestPermissionDialog, TrackingDialog } from './dialogs/FulfilmentEditDialogs';

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
  onSwitchToMessages,
  onSwitchToNotes,
  messageSendDisabled,
}: OrderModalsProps) {
  return (
    <>
      {stockAdjustmentModal && <StockAdjustmentDialog modal={stockAdjustmentModal} setModal={setStockAdjustmentModal} onClose={closeStockAdjustmentModal} onToggle={toggleManagedStockAdjustmentItem} onSave={submitStockAdjustment} />}
      {stockModal && (
        <RequestStockDialog
          modal={stockModal}
          setModal={setStockModal}
          onClose={closeStockModal}
          updateItem={updateStockItem}
          getAvailableItemsForRow={getAvailableStockItemsForRow}
          getEligibleItems={getBackInStockEligibleItems}
          hasItemToAdd={hasStockItemAvailableToAdd}
          addItem={addStockItem}
          removeItem={removeStockItem}
          onSubmit={submitStockRequest}
          formatStatus={formatStockStatus}
        />
      )}
      {messageModal && <MessagesDialog state={messageModal} setState={setMessageModal} onClose={closeMessageModal} onSubmit={submitAdminMessage} onSwitchToNotes={onSwitchToNotes ? () => onSwitchToNotes(messageModal.order) : undefined} sendDisabled={messageSendDisabled} />}
      {noteModal && <NotesDialog modal={noteModal} setModal={setNoteModal} onClose={closeNoteModal} onCancelEdit={cancelEditNote} onSubmit={submitOrderNote} onStartEdit={startEditNote} onDelete={deleteOrderNote} onSwitchToMessages={onSwitchToMessages ? () => onSwitchToMessages(noteModal.order) : undefined} />}
      {pendingFulfillment && (
        <FulfilConfirmDialog
          modal={pendingFulfillment}
          setModal={setPendingFulfillment}
          saving={Boolean(fulSaving[pendingFulfillment.order.id])}
          onClose={closeFulfillmentConfirmation}
          onConfirm={confirmFul}
          carrierOpen={carrierDropdownOpen}
          setCarrierOpen={setCarrierDropdownOpen}
          carrierSearch={carrierSearch}
          setCarrierSearch={setCarrierSearch}
          carriers={filteredTrackingCarriers}
          trackingInputRef={trackingNumInputRef}
        />
      )}
      {editFulModal && <EditFulfilmentDialog modal={editFulModal} setModal={setEditFulModal} onSubmit={submitEditFulfillment} />}
      {cancelFulModal && <CancelFulfilmentDialog modal={cancelFulModal} setModal={setCancelFulModal} onSubmit={submitCancelFulfillment} />}
      {requestPermModal && <RequestPermissionDialog modal={requestPermModal} setModal={setRequestPermModal} onSubmit={submitPermissionRequest} />}
      {trackingModal && <TrackingDialog modal={trackingModal} onClose={closeTrackingModal} onSubmit={submitTrackingAction} />}
    </>
  );
}
