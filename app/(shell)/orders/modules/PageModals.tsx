'use client';

import { useZoom } from '@/components/ZoomContext';
import type { OrdersPageBundle } from './ordersPageContext';
import OrderModals from './OrderModals';
import InvoiceModal from '@/components/invoices/InvoiceModal';
import AssignModal from './AssignModal';
import WorkModal from './WorkModal';
import WorkDetailsModal from './WorkDetailsModal';
import DeleteLineItemModal from './DeleteLineItemModal';
import EditLineItemModal from './EditLineItemModal';
import AddLineItemModal from './AddLineItemModal';
import MessagesDialog from './dialogs/MessagesDialog';
import { formatStockStatus, getAvailableStockItemsForRow, getBackInStockEligibleItems, hasStockItemAvailableToAdd } from './utils';
import PrintSlipModal from './queue/PrintSlipModal';
import NotifyPackedModal from './queue/NotifyPackedModal';
import FulfilmentsModal from './queue/FulfilmentsModal';
import { CreatePoModal } from '@/app/(shell)/inventory/modules/PoModals';

/** Every dialog the Orders page can open. Each one only mounts while its own state is set. */
export default function PageModals({ p }: { p: OrdersPageBundle }) {
  // The page is zoomed (50-150%); dialogs keep their normal size, so cancel the page zoom here.
  const { zoomPercent } = useZoom();
  return (
    <div style={{ zoom: 100 / zoomPercent, '--page-zoom': 1 } as React.CSSProperties}>
  <OrderModals
    stockModal={p.stockModal}
    setStockModal={p.setStockModal}
    closeStockModal={p.closeStockModal}
    updateStockItem={p.updateStockItem}
    getAvailableStockItemsForRow={getAvailableStockItemsForRow}
    getBackInStockEligibleItems={getBackInStockEligibleItems}
    hasStockItemAvailableToAdd={hasStockItemAvailableToAdd}
    addStockItem={p.addStockItem}
    removeStockItem={p.removeStockItem}
    submitStockRequest={p.submitStockRequest}
    formatStockStatus={formatStockStatus}
    messageModal={p.messageModal}
    setMessageModal={p.setMessageModal}
    closeMessageModal={p.closeMessageModal}
    submitAdminMessage={p.submitAdminMessage}
    noteModal={p.noteModal}
    setNoteModal={p.setNoteModal}
    closeNoteModal={p.closeNoteModal}
    cancelEditNote={p.cancelEditNote}
    submitOrderNote={p.submitOrderNote}
    startEditNote={p.startEditNote}
    deleteOrderNote={p.deleteOrderNote}
    pendingFulfillment={p.pendingFulfillment}
    setPendingFulfillment={p.setPendingFulfillment}
    closeFulfillmentConfirmation={p.closeFulfillmentConfirmation}
    fulSaving={p.fulSaving}
    carrierDropdownOpen={p.carrierDropdownOpen}
    setCarrierDropdownOpen={p.setCarrierDropdownOpen}
    carrierSearch={p.carrierSearch}
    setCarrierSearch={p.setCarrierSearch}
    filteredTrackingCarriers={p.filteredTrackingCarriers}
    trackingNumInputRef={p.trackingNumInputRef}
    confirmFul={p.confirmFul}
    editFulModal={p.editFulModal}
    setEditFulModal={p.setEditFulModal}
    submitEditFulfillment={p.submitEditFulfillment}
    cancelFulModal={p.cancelFulModal}
    setCancelFulModal={p.setCancelFulModal}
    submitCancelFulfillment={p.submitCancelFulfillment}
    requestPermModal={p.requestPermModal}
    setRequestPermModal={p.setRequestPermModal}
    submitPermissionRequest={p.submitPermissionRequest}
    stockAdjustmentModal={p.stockAdjustmentModal}
    setStockAdjustmentModal={p.setStockAdjustmentModal}
    closeStockAdjustmentModal={p.closeStockAdjustmentModal}
    toggleManagedStockAdjustmentItem={p.toggleManagedStockAdjustmentItem}
    submitStockAdjustment={p.submitStockAdjustment}
    trackingModal={p.trackingModal}
    closeTrackingModal={p.closeTrackingModal}
    submitTrackingAction={p.submitTrackingAction}
    onSwitchToMessages={(order) => {
      p.closeNoteModal();
      if (p.caps.role === 'picker') void p.pickerMessages.openMessageModal(order);
      else void p.openMessageModal(order);
    }}
    onSwitchToNotes={(order) => {
      p.closeMessageModal();
      void p.openNoteModal(order);
    }}
  />

  {p.assignModal && (
    <AssignModal
      assignModal={p.assignModal}
      setAssignModal={p.setAssignModal}
      closeAssignModal={p.closeAssignModal}
      removeAssignment={p.removeAssignment}
      submitAssignment={p.submitAssignment}
      decoratorUsers={p.decoratorUsers}
      decoratorUsersLoaded={p.decoratorUsersLoaded}
    />
  )}

  {p.workModal && (
    <WorkModal
      workModal={p.workModal}
      closeWorkModal={p.closeWorkModal}
      updateWorkQuantity={p.updateWorkQuantity}
      addCommentRow={p.addCommentRow}
      removeCommentRow={p.removeCommentRow}
      updateCommentField={p.updateCommentField}
      uploadCommentFiles={p.uploadCommentFiles}
      removeCommentFile={p.removeCommentFile}
      submitWork={p.submitWork}
    />
  )}

  {p.workDetails && (
    <WorkDetailsModal
      workDetails={p.workDetails}
      closeWorkDetails={p.closeWorkDetails}
      userIsAdmin={p.userIsAdmin}
      deleteWorkRecord={p.deleteWorkRecord}
      onMarkDone={() => {
        const { order, item } = p.workDetails!;
        p.closeWorkDetails();
        p.openWorkModal(order, item);
      }}
    />
  )}

  {p.deleteLineItemModal && (
    <DeleteLineItemModal
      modal={p.deleteLineItemModal}
      setModal={p.setDeleteLineItemModal}
      onClose={p.closeDeleteLineItemModal}
      onConfirm={() => void p.submitDeleteLineItem()}
    />
  )}

  {p.editLineItemModal && (
    <EditLineItemModal
      modal={p.editLineItemModal}
      setQuantity={p.setEditLineItemQuantity}
      setTitle={p.setEditLineItemTitle}
      setRestock={p.setEditLineItemRestock}
      onClose={p.closeEditLineItemModal}
      onConfirm={() => void p.submitEditLineItem()}
    />
  )}

  {p.addLineItemModal && (
    <AddLineItemModal
      modal={p.addLineItemModal}
      setMode={p.setAddLineItemMode}
      setQuery={p.setAddLineItemQuery}
      selectVariant={p.selectAddLineItemVariant}
      setQuantity={p.setAddLineItemQuantity}
      setCustomTitle={p.setAddLineItemCustomTitle}
      onClose={p.closeAddLineItemModal}
      onConfirm={() => void p.submitAddLineItem()}
    />
  )}
  {p.invoiceModal && (
    <InvoiceModal
      key={p.invoiceModal.token}
      mode="create"
      initial={p.invoiceModal.initial}
      invoiceId={null}
      stores={p.invoiceStores}
      onSaved={p.closeInvoiceModal}
      onClose={p.closeInvoiceModal}
    />
  )}
      {p.fulfillmentViewOrderId && <FulfilmentsModal p={p} />}
      {p.printModal && <PrintSlipModal orders={p.printModal} setOrders={p.setPrintModal} onClose={() => p.setPrintModal(null)} onPrint={() => void p.printPickingSlips()} />}
      {p.notifyModal && <NotifyPackedModal state={p.notifyModal} setState={p.setNotifyModal} recipients={p.packingRecipients} onClose={() => p.setNotifyModal(null)} onSubmit={() => void p.submitNotifyAction()} />}
      {p.pickerMessages.messageModal && (
        <MessagesDialog
          state={p.pickerMessages.messageModal}
          setState={p.pickerMessages.setMessageModal}
          onClose={p.pickerMessages.closeMessageModal}
          onSubmit={p.pickerMessages.submitMessage}
          onSwitchToNotes={() => {
            const order = p.pickerMessages.messageModal!.order;
            p.pickerMessages.closeMessageModal();
            void p.openNoteModal(order);
          }}
        />
      )}
      {p.createPoForm.createOpen && <CreatePoModal po={p.createPoForm} variants={p.createPoForm.createProduct?.variants ?? []} />}
    </div>
  );
}
