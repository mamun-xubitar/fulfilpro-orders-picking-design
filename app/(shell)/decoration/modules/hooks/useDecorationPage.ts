import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import {
  getDecoratorCategories,
  isStaffLikeRole,
  isTestUserRole,
} from "@/lib/roles";
import type { ApiResponse, OrderRow, PackingSlipLabel } from "../../../orders/modules/types";
import {
  buildPackingSlipDocument,
  printDocumentInHiddenFrame,
} from "../../../orders/modules/packingSlipPrint";
import { getApiErrorMessage } from "../../../orders/modules/utils";
import { useOrdersFilters } from "../../../orders/modules/hooks/useOrdersFilters";
import { useOrdersData } from "../../../orders/modules/hooks/useOrdersData";
import { useSync } from "../../../orders/modules/hooks/useSync";
import { useNameAttributes } from "../../../orders/modules/hooks/useNameAttributes";
import { useFulfillment } from "../../../orders/modules/hooks/useFulfillment";
import { useFulfillmentRequests } from "../../../orders/modules/hooks/useFulfillmentRequests";
import { useDecorationWork } from "../../../orders/modules/hooks/useDecorationWork";
import { useOrderDecorationAttachments } from "../../../orders/modules/hooks/useOrderDecorationAttachments";
import { useAssignments } from "../../../orders/modules/hooks/useAssignments";
import { useOrderMessages } from "../../../orders/modules/hooks/useOrderMessages";
import { useOrderNotes } from "../../../orders/modules/hooks/useOrderNotes";
import { useStockRequests } from "../../../orders/modules/hooks/useStockRequests";
import { useStockAdjustment } from "../../../orders/modules/hooks/useStockAdjustment";
import { useTracking } from "../../../orders/modules/hooks/useTracking";

export function useDecorationPage() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role as string) ?? "";
  const userIsAdmin = userRole === "admin";
  const decoratorUnscoped = userIsAdmin;
  const ordersColSpan = 11;
  const userIsStaff = isStaffLikeRole(userRole);
  const userIsTest = isTestUserRole(userRole);

  const blockTestModeAction = () => {
    if (!userIsTest) return false;
    toast.error("This action is not allowed in test mode.");
    return true;
  };

  const [error, setError] = useState("");

  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const printPackingSlipLabel = async (order: OrderRow) => {
    setPrintingOrderId(order.id);

    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(order.id)}/packing-slip`,
      );
      const json = (await res.json()) as ApiResponse<PackingSlipLabel>;

      if (!res.ok || !json.success) {
        throw new Error(
          getApiErrorMessage(json, "Failed to load packing slip label"),
        );
      }

      const printHtml = buildPackingSlipDocument(
        json.data,
        window.location.origin,
      );
      await printDocumentInHiddenFrame(printHtml);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load packing slip label.",
      );
    } finally {
      setPrintingOrderId(null);
    }
  };

  const filters = useOrdersFilters({ userIsDecorator: true, decorationView: true });

  const data = useOrdersData({
    queryString: filters.queryString,
    search: filters.search,
    setPagination: filters.setPagination,
    blockTestModeAction,
    setError,
  });

  const decoratorCategories = getDecoratorCategories(userRole, data.crossDecorationVisibility);

  const sync = useSync({ blockTestModeAction, setError });

  const nameAttrs = useNameAttributes({
    orders: data.orders,
    queryString: filters.queryString,
    period: filters.period,
    search: filters.search,
    storeIds: filters.storeIds,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    fulfillmentStatuses: filters.fulfillmentStatuses,
    packingStatuses: filters.packingStatuses,
  });

  const fulfillment = useFulfillment({
    orders: data.orders,
    setOrders: data.setOrders,
    blockTestModeAction,
  });

  const fulfillmentRequests = useFulfillmentRequests({
    setOrders: data.setOrders,
    blockTestModeAction,
    userIsAdmin,
  });

  const decorWork = useDecorationWork({
    setOrders: data.setOrders,
    blockTestModeAction,
    bumpRefresh: data.bumpRefresh,
  });

  const decorAttachments = useOrderDecorationAttachments({
    setOrders: data.setOrders,
    blockTestModeAction,
  });

  const assignments = useAssignments({
    setOrders: data.setOrders,
    blockTestModeAction,
  });

  const messages = useOrderMessages({
    setOrders: data.setOrders,
    blockTestModeAction,
  });

  const notes = useOrderNotes({
    setOrders: data.setOrders,
    blockTestModeAction,
  });

  const stock = useStockRequests({
    setOrders: data.setOrders,
    blockTestModeAction,
  });

  const stockAdj = useStockAdjustment({
    setOrders: data.setOrders,
    blockTestModeAction,
    userIsAdmin,
  });

  const tracking = useTracking({ orders: data.orders, setOrders: data.setOrders });

  return {
    // role flags
    userRole,
    userIsAdmin,
    userIsDecorator: true as const,
    decoratorCategories,
    decoratorUnscoped,
    ordersColSpan,
    userIsStaff,
    userIsTest,
    session,
    // data
    orders: data.orders,
    setOrders: data.setOrders,
    stores: data.stores,
    loading: data.loading,
    error,
    expandedIds: data.expandedIds,
    setExpandedIds: data.setExpandedIds,
    expandAll: data.expandAll,
    refreshingOrderIds: data.refreshingOrderIds,
    refreshSingleOrder: data.refreshSingleOrder,
    handleToggleExpandAll: data.handleToggleExpandAll,
    toggleExpanded: data.toggleExpanded,
    blockTestModeAction,
    // sync (not exposed in toolbar but needed for internal wiring)
    syncing: sync.syncing,
    syncActive: sync.syncActive,
    syncRefreshNeeded: sync.syncRefreshNeeded,
    // filters
    searchInput: filters.searchInput,
    setSearchInput: filters.setSearchInput,
    searchField: filters.searchField,
    setSearchField: filters.setSearchField,
    searchDropdownOpen: filters.searchDropdownOpen,
    setSearchDropdownOpen: filters.setSearchDropdownOpen,
    searchDropdownRef: filters.searchDropdownRef,
    storeIds: filters.storeIds,
    setStoreIds: filters.setStoreIds,
    storeDropdownOpen: filters.storeDropdownOpen,
    setStoreDropdownOpen: filters.setStoreDropdownOpen,
    storeDropdownRef: filters.storeDropdownRef,
    handleStoreToggle: filters.handleStoreToggle,
    dateFrom: filters.dateFrom,
    setDateFrom: filters.setDateFrom,
    dateTo: filters.dateTo,
    setDateTo: filters.setDateTo,
    hoverDate: filters.hoverDate,
    setHoverDate: filters.setHoverDate,
    fulfillmentStatuses: filters.fulfillmentStatuses,
    setFulfillmentStatuses: filters.setFulfillmentStatuses,
    statusDropdownOpen: filters.statusDropdownOpen,
    setStatusDropdownOpen: filters.setStatusDropdownOpen,
    statusDropdownRef: filters.statusDropdownRef,
    packingStatuses: filters.packingStatuses,
    packingStatusDropdownOpen: filters.packingStatusDropdownOpen,
    setPackingStatusDropdownOpen: filters.setPackingStatusDropdownOpen,
    packingStatusDropdownRef: filters.packingStatusDropdownRef,
    handlePackingStatusToggle: filters.handlePackingStatusToggle,
    handleStatusToggle: filters.handleStatusToggle,
    handleClearFilters: filters.handleClearFilters,
    hasActiveFilters: filters.hasActiveFilters,
    period: filters.period,
    setPeriod: filters.setPeriod,
    periodDropdownOpen: filters.periodDropdownOpen,
    setPeriodDropdownOpen: filters.setPeriodDropdownOpen,
    periodDropdownRef: filters.periodDropdownRef,
    calendarNav: filters.calendarNav,
    setCalendarNav: filters.setCalendarNav,
    handlePeriodChange: filters.handlePeriodChange,
    handleCalendarDateClick: filters.handleCalendarDateClick,
    pagination: filters.pagination,
    setPagination: filters.setPagination,
    pageNumbers: filters.pageNumbers,
    goToPage: filters.goToPage,
    // name attributes / export
    selectedNameCount: nameAttrs.selectedNameCount,
    isCurrentPageAllChecked: nameAttrs.isCurrentPageAllChecked,
    nameCountLoading: nameAttrs.nameCountLoading,
    selectAllFilters: nameAttrs.selectAllFilters,
    handleToggleSelectAllFilters: nameAttrs.handleToggleSelectAllFilters,
    handleToggleCurrentPage: nameAttrs.handleToggleCurrentPage,
    isNameChecked: nameAttrs.isNameChecked,
    setNamesChecked: nameAttrs.setNamesChecked,
    isOrderAllNamesChecked: nameAttrs.isOrderAllNamesChecked,
    toggleOrderNames: nameAttrs.toggleOrderNames,
    exportLoading: nameAttrs.exportLoading,
    exportDropdownOpen: nameAttrs.exportDropdownOpen,
    setExportDropdownOpen: nameAttrs.setExportDropdownOpen,
    exportDropdownRef: nameAttrs.exportDropdownRef,
    runExport: nameAttrs.runExport,
    // fulfillment line helpers
    isLineFullChecked: fulfillment.isLineFullChecked,
    toggleFull: fulfillment.toggleFull,
    toggleAllFull: fulfillment.toggleAllFull,
    validPartial: fulfillment.validPartial,
    getFulfillmentLines: fulfillment.getFulfillmentLines,
    partialValues: fulfillment.partialValues,
    fulSaving: fulfillment.fulSaving,
    fulMessages: fulfillment.fulMessages,
    fullSelectBtnRef: fulfillment.fullSelectBtnRef,
    // pending fulfillment confirmation
    pendingFulfillment: fulfillment.pendingFulfillment,
    setPendingFulfillment: fulfillment.setPendingFulfillment,
    openFulfillmentConfirmation: fulfillment.openFulfillmentConfirmation,
    closeFulfillmentConfirmation: fulfillment.closeFulfillmentConfirmation,
    confirmFul: fulfillment.confirmFul,
    carrierDropdownOpen: fulfillment.carrierDropdownOpen,
    setCarrierDropdownOpen: fulfillment.setCarrierDropdownOpen,
    carrierSearch: fulfillment.carrierSearch,
    setCarrierSearch: fulfillment.setCarrierSearch,
    filteredTrackingCarriers: fulfillment.filteredTrackingCarriers,
    trackingNumInputRef: fulfillment.trackingNumInputRef,
    // decoration work
    toggleLineItemDecoration: decorWork.toggleLineItemDecoration,
    openWorkModal: decorWork.openWorkModal,
    openWorkDetails: decorWork.openWorkDetails,
    getWorkDraft: decorWork.getWorkDraft,
    setDraftQuantity: decorWork.setDraftQuantity,
    addDraftCommentRow: decorWork.addDraftCommentRow,
    removeDraftCommentRow: decorWork.removeDraftCommentRow,
    updateDraftCommentField: decorWork.updateDraftCommentField,
    submitDraftWork: decorWork.submitDraftWork,
    // assignments
    assignModal: assignments.assignModal,
    setAssignModal: assignments.setAssignModal,
    openAssignModal: assignments.openAssignModal,
    closeAssignModal: assignments.closeAssignModal,
    submitAssignment: assignments.submitAssignment,
    removeAssignment: assignments.removeAssignment,
    decoratorUsers: assignments.decoratorUsers,
    decoratorUsersLoaded: assignments.decoratorUsersLoaded,
    // work modal
    workModal: decorWork.workModal,
    closeWorkModal: decorWork.closeWorkModal,
    updateWorkQuantity: decorWork.updateWorkQuantity,
    addCommentRow: decorWork.addCommentRow,
    removeCommentRow: decorWork.removeCommentRow,
    updateCommentField: decorWork.updateCommentField,
    uploadCommentFiles: decorWork.uploadCommentFiles,
    removeCommentFile: decorWork.removeCommentFile,
    submitWork: decorWork.submitWork,
    workDetails: decorWork.workDetails,
    closeWorkDetails: decorWork.closeWorkDetails,
    deleteWorkRecord: decorWork.deleteWorkRecord,
    requestEditAccess: decorWork.requestEditAccess,
    requestingAccessKey: decorWork.requestingAccessKey,
    // order-wide decoration attachments
    getUploadingAttachmentFields: decorAttachments.getUploadingFields,
    isSavingAttachmentRemarks: decorAttachments.isSavingRemarks,
    uploadAttachmentFiles: decorAttachments.uploadAttachmentFiles,
    removeAttachmentFile: decorAttachments.removeAttachmentFile,
    getAttachmentRemarksValue: decorAttachments.getRemarksValue,
    setAttachmentRemarksDraft: decorAttachments.setRemarksDraft,
    commitAttachmentRemarks: decorAttachments.commitRemarks,
    // fulfillment view / requests
    fulfillmentViewOrderId: fulfillmentRequests.fulfillmentViewOrderId,
    setFulfillmentViewOrderId: fulfillmentRequests.setFulfillmentViewOrderId,
    getActiveFulfillmentRequest: fulfillmentRequests.getActiveFulfillmentRequest,
    openEditFulModal: fulfillmentRequests.openEditFulModal,
    openCancelFulModal: fulfillmentRequests.openCancelFulModal,
    openRequestPermModal: fulfillmentRequests.openRequestPermModal,
    editFulModal: fulfillmentRequests.editFulModal,
    setEditFulModal: fulfillmentRequests.setEditFulModal,
    submitEditFulfillment: fulfillmentRequests.submitEditFulfillment,
    cancelFulModal: fulfillmentRequests.cancelFulModal,
    setCancelFulModal: fulfillmentRequests.setCancelFulModal,
    submitCancelFulfillment: fulfillmentRequests.submitCancelFulfillment,
    requestPermModal: fulfillmentRequests.requestPermModal,
    setRequestPermModal: fulfillmentRequests.setRequestPermModal,
    submitPermissionRequest: fulfillmentRequests.submitPermissionRequest,
    pendingRequests: fulfillmentRequests.pendingRequests,
    pendingRequestsPanelOpen: fulfillmentRequests.pendingRequestsPanelOpen,
    setPendingRequestsPanelOpen: fulfillmentRequests.setPendingRequestsPanelOpen,
    handleAdminApproveRequest: fulfillmentRequests.handleAdminApproveRequest,
    handleAdminRejectRequest: fulfillmentRequests.handleAdminRejectRequest,
    // packing slip / printing
    printPackingSlipLabel,
    printingOrderId,
    // messages
    messageModal: messages.messageModal,
    setMessageModal: messages.setMessageModal,
    openMessageModal: messages.openMessageModal,
    closeMessageModal: messages.closeMessageModal,
    submitAdminMessage: messages.submitAdminMessage,
    // notes
    noteModal: notes.noteModal,
    setNoteModal: notes.setNoteModal,
    openNoteModal: notes.openNoteModal,
    closeNoteModal: notes.closeNoteModal,
    startEditNote: notes.startEditNote,
    cancelEditNote: notes.cancelEditNote,
    submitOrderNote: notes.submitOrderNote,
    deleteOrderNote: notes.deleteOrderNote,
    // stock
    stockModal: stock.stockModal,
    setStockModal: stock.setStockModal,
    openStockModal: stock.openStockModal,
    closeStockModal: stock.closeStockModal,
    updateStockItem: stock.updateStockItem,
    addStockItem: stock.addStockItem,
    removeStockItem: stock.removeStockItem,
    submitStockRequest: stock.submitStockRequest,
    // stock adjustment
    stockAdjustmentModal: stockAdj.stockAdjustmentModal,
    setStockAdjustmentModal: stockAdj.setStockAdjustmentModal,
    openStockAdjustmentModal: stockAdj.openStockAdjustmentModal,
    closeStockAdjustmentModal: stockAdj.closeStockAdjustmentModal,
    toggleManagedStockAdjustmentItem: stockAdj.toggleManagedStockAdjustmentItem,
    submitStockAdjustment: stockAdj.submitStockAdjustment,
    // tracking
    trackingModal: tracking.trackingModal,
    openTrackingModal: tracking.openTrackingModal,
    closeTrackingModal: tracking.closeTrackingModal,
    submitTrackingAction: tracking.submitTrackingAction,
  };
}
