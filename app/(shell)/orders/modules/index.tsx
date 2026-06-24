'use client';

import { useOrdersPage } from './hooks/useOrdersPage';
import PendingRequestsPanel from './PendingRequestsPanel';
import OrdersPagination from './OrdersPagination';
import OrdersToolbar from './OrdersToolbar';
import OrderModals from './OrderModals';
import OrdersSelectionBar from './OrdersSelectionBar';
import OrdersTable from './OrdersTable';
import AssignModal from './AssignModal';
import WorkModal from './WorkModal';
import WorkDetailsModal from './WorkDetailsModal';
import { formatStockStatus, getAvailableStockItemsForRow, getBackInStockEligibleItems, hasStockItemAvailableToAdd } from './utils';

export default function OrdersPage() {
  const p = useOrdersPage();

  return (
    <main className="flex-1 p-4 md:p-6">
      {p.userIsAdmin && (
        <PendingRequestsPanel
          pendingRequests={p.pendingRequests}
          open={p.pendingRequestsPanelOpen}
          onToggle={() => p.setPendingRequestsPanelOpen((prev) => !prev)}
          onApprove={(requestId) => void p.handleAdminApproveRequest(requestId)}
          onReject={(requestId) => void p.handleAdminRejectRequest(requestId)}
        />
      )}
      <OrdersToolbar
        searchInput={p.searchInput}
        setSearchInput={p.setSearchInput}
        searchField={p.searchField}
        setSearchField={p.setSearchField}
        searchDropdownOpen={p.searchDropdownOpen}
        setSearchDropdownOpen={p.setSearchDropdownOpen}
        searchDropdownRef={p.searchDropdownRef}
        stores={p.stores}
        storeIds={p.storeIds}
        setStoreIds={p.setStoreIds}
        storeDropdownOpen={p.storeDropdownOpen}
        setStoreDropdownOpen={p.setStoreDropdownOpen}
        storeDropdownRef={p.storeDropdownRef}
        period={p.period}
        dateFrom={p.dateFrom}
        dateTo={p.dateTo}
        periodDropdownOpen={p.periodDropdownOpen}
        setPeriodDropdownOpen={p.setPeriodDropdownOpen}
        periodDropdownRef={p.periodDropdownRef}
        calendarNav={p.calendarNav}
        setCalendarNav={p.setCalendarNav}
        setHoverDate={p.setHoverDate}
        handlePeriodChange={p.handlePeriodChange}
        handleCalendarDateClick={p.handleCalendarDateClick}
        fulfillmentStatuses={p.fulfillmentStatuses}
        setFulfillmentStatuses={p.setFulfillmentStatuses}
        statusDropdownOpen={p.statusDropdownOpen}
        setStatusDropdownOpen={p.setStatusDropdownOpen}
        statusDropdownRef={p.statusDropdownRef}
        packingStatuses={p.packingStatuses}
        packingStatusDropdownOpen={p.packingStatusDropdownOpen}
        setPackingStatusDropdownOpen={p.setPackingStatusDropdownOpen}
        packingStatusDropdownRef={p.packingStatusDropdownRef}
        handlePackingStatusToggle={p.handlePackingStatusToggle}
        hasActiveFilters={p.hasActiveFilters}
        handleClearFilters={p.handleClearFilters}
        handleStoreToggle={p.handleStoreToggle}
        handleStatusToggle={p.handleStatusToggle}
        syncStoreDropdownRef={p.syncStoreDropdownRef}
        syncStoreDropdownOpen={p.syncStoreDropdownOpen}
        setSyncStoreDropdownOpen={p.setSyncStoreDropdownOpen}
        handleSync={p.handleSync}
        syncing={p.syncing}
        loading={p.loading}
        syncActive={p.syncActive}
        syncStoreIds={p.syncStoreIds}
        setSyncStoreIds={p.setSyncStoreIds}
        handleSyncStoreToggle={p.handleSyncStoreToggle}
        handleRefresh={p.handleRefresh}
        syncRefreshNeeded={p.syncRefreshNeeded}
        refreshRotation={p.refreshRotation}
        syncMessage={p.syncMessage}
        setPagination={p.setPagination}
        hoverDate={p.hoverDate}
        setDateFrom={p.setDateFrom}
        setDateTo={p.setDateTo}
        setPeriod={p.setPeriod}
        selectedNameCount={p.selectedNameCount}
        exportLoading={p.exportLoading}
        exportDropdownOpen={p.exportDropdownOpen}
        setExportDropdownOpen={p.setExportDropdownOpen}
        exportDropdownRef={p.exportDropdownRef}
        onExportCsv={() => void p.runExport('csv')}
        onExportPrint={() => void p.runExport('print')}
        canSync={!p.userIsDecorator}
        userIsDecorator={p.userIsDecorator}
      />


      <OrdersSelectionBar
        selectAllFilters={p.selectAllFilters}
        handleToggleSelectAllFilters={p.handleToggleSelectAllFilters}
        isCurrentPageAllChecked={p.isCurrentPageAllChecked}
        handleToggleCurrentPage={p.handleToggleCurrentPage}
        nameCountLoading={p.nameCountLoading}
        selectedNameCount={p.selectedNameCount}
        expandAll={p.expandAll}
        handleToggleExpandAll={p.handleToggleExpandAll}
      />


      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <OrdersTable p={p} />
        </div>

        <OrdersPagination
          pagination={p.pagination}
          loading={p.loading}
          pageNumbers={p.pageNumbers}
          onPageChange={p.goToPage}
        />
      </div>

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
        />
      )}
    </main>
  );
}
