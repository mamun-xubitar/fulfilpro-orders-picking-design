'use client';

import { useSession } from 'next-auth/react';
import Pagination from '@/components/Pagination';
import NotesModal from '@/components/NotesModal';
import MessagesModal from '@/components/MessagesModal';
import { isOrderPickerRole } from '@/lib/roles';
import { usePickingListPage } from './usePickingListPage';
import PickingListFilters from './PickingListFilters';
import OrderRow from './OrderRow';
import NotifyModal from './NotifyModal';
import PrintModal from './PrintModal';

export default function PickingListPage() {
  const { data: session } = useSession();
  const isPicker = isOrderPickerRole(session?.user?.role);
  const isAdmin = session?.user?.role === 'admin';
  const d = usePickingListPage();

  return (
    <main className="flex-1 p-4 md:p-6">
      <PickingListFilters
        isPicker={isPicker}
        stores={d.stores}
        storeIds={d.storeIds}
        storeDropdownOpen={d.storeDropdownOpen}
        setStoreDropdownOpen={d.setStoreDropdownOpen}
        storeDropdownRef={d.storeDropdownRef}
        packedStatuses={d.packedStatuses}
        setPackedStatuses={d.setPackedStatuses}
        packedStatusDropdownOpen={d.packedStatusDropdownOpen}
        setPackedStatusDropdownOpen={d.setPackedStatusDropdownOpen}
        packedStatusDropdownRef={d.packedStatusDropdownRef}
        printStatuses={d.printStatuses}
        setPrintStatuses={d.setPrintStatuses}
        printStatusDropdownOpen={d.printStatusDropdownOpen}
        setPrintStatusDropdownOpen={d.setPrintStatusDropdownOpen}
        printStatusDropdownRef={d.printStatusDropdownRef}
        period={d.period}
        dateFrom={d.dateFrom}
        dateTo={d.dateTo}
        periodDropdownOpen={d.periodDropdownOpen}
        setPeriodDropdownOpen={d.setPeriodDropdownOpen}
        periodDropdownRef={d.periodDropdownRef}
        calendarNav={d.calendarNav}
        setCalendarNav={d.setCalendarNav}
        hoverDate={d.hoverDate}
        setHoverDate={d.setHoverDate}
        syncStoreIds={d.syncStoreIds}
        setSyncStoreIds={d.setSyncStoreIds}
        syncStoreDropdownOpen={d.syncStoreDropdownOpen}
        setSyncStoreDropdownOpen={d.setSyncStoreDropdownOpen}
        syncStoreDropdownRef={d.syncStoreDropdownRef}
        searchInput={d.searchInput}
        setSearchInput={d.setSearchInput}
        hasActiveFilters={d.hasActiveFilters}
        syncing={d.syncing}
        loading={d.loading}
        syncActive={d.syncActive}
        syncRefreshNeeded={d.syncRefreshNeeded}
        syncMessage={d.syncMessage}
        refreshRotation={d.refreshRotation}
        toggleStore={d.toggleStore}
        toggleFilter={d.toggleFilter}
        toggleSyncStore={d.toggleSyncStore}
        handlePeriodChange={d.handlePeriodChange}
        handleCalendarDateClick={d.handleCalendarDateClick}
        clearFilters={d.clearFilters}
        refreshList={d.refreshList}
        handleSync={d.handleSync}
        setPagination={d.setPagination}
      />

      {d.selectedIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-900">{d.selectedIds.length} order{d.selectedIds.length === 1 ? '' : 's'} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => d.toggleBulkView(d.selectedIds)} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">{d.allSelectedExpanded ? 'Collapse' : 'Expand'}</button>
            <button onClick={() => d.openPrintModal(d.selectedOrders)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Print picking slip</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-3 text-left"><input type="checkbox" checked={d.allPageSelected} onChange={d.toggleAllPage} className="rounded border-gray-300 text-blue-600" /></th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Order</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Store</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Ordered At</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Packed Qty</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Packed Date</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-gray-500">Note</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {d.loading && <tr><td colSpan={10} className="py-12 text-center text-gray-400">Loading picking list...</td></tr>}
              {!d.loading && d.error && <tr><td colSpan={10} className="py-12 text-center text-red-500">{d.error}</td></tr>}
              {!d.loading && !d.error && d.orders.length === 0 && <tr><td colSpan={10} className="py-16 text-center text-gray-400">No picking orders found.</td></tr>}
              {!d.loading && !d.error && d.orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isAdmin={isAdmin}
                  isPicker={isPicker}
                  isExpanded={d.expandedIds.includes(order.id)}
                  isSelected={d.selectedIds.includes(order.id)}
                  fullChecks={d.fullChecks}
                  partialValues={d.partialValues}
                  refreshingIds={d.refreshingIds}
                  setFullChecks={d.setFullChecks}
                  setPartialValues={d.setPartialValues}
                  setOrderFullChecks={d.setOrderFullChecks}
                  onSelect={() => d.setSelectedIds((prev) => prev.includes(order.id) ? prev.filter((id) => id !== order.id) : [...prev, order.id])}
                  onToggleExpand={() => d.setExpandedIds((prev) => prev.includes(order.id) ? prev.filter((id) => id !== order.id) : [...prev, order.id])}
                  onOpenNote={d.openNoteModal}
                  onOpenMessage={d.openMessageModal}
                  onOpenPrint={d.openPrintModal}
                  onRefresh={d.refreshOrder}
                  onConfirmPacked={d.openConfirmPacked}
                  onCancelPacked={d.openCancelPacked}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination pagination={d.pagination} loading={d.loading} pageNumbers={d.pageNumbers} onPageChange={d.goToPage} itemLabel="orders" />
      </div>

      {d.printModal && <PrintModal orders={d.printModal} setOrders={d.setPrintModal} onClose={() => d.setPrintModal(null)} onPrint={() => void d.printPickingSlips()} />}
      {d.notifyModal && <NotifyModal state={d.notifyModal} setState={d.setNotifyModal} packingRecipients={d.packingRecipients} onClose={() => d.setNotifyModal(null)} onSubmit={() => void d.submitNotifyAction()} />}
      {d.noteModal && <NotesModal state={d.noteModal} setState={d.setNoteModal} onClose={d.closeNoteModal} onSubmit={() => void d.submitNote()} onStartEdit={d.startEditNote} onCancelEdit={d.cancelEditNote} onDelete={(noteId) => void d.deleteNote(noteId)} />}
      {d.messageModal && <MessagesModal state={d.messageModal} setState={d.setMessageModal} onClose={d.closeMessageModal} onSubmit={() => void d.submitMessage()} />}
    </main>
  );
}
