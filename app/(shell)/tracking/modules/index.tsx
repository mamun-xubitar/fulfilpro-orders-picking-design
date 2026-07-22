'use client';

import { useSession } from 'next-auth/react';
import { useTrackingPage } from './hooks/useTrackingPage';
import TrackingToolbar from './TrackingToolbar';
import TrackingTable from './TrackingTable';
import BulkRegisterModal from './BulkRegisterModal';
import SingleRegisterModal from './SingleRegisterModal';

export default function TrackingPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const userIsAdmin = role === 'admin';
  const canAddTracking = userIsAdmin || role === 'staff';
  const p = useTrackingPage();

  return (
    <main className="flex-1 p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">Shipment Tracking</h1>
        {p.pagination.total > 0 && (
          <span className="text-xs text-gray-500">{p.pagination.total} record{p.pagination.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      <TrackingToolbar
        searchInput={p.searchInput}
        onSearchChange={p.handleSearchChange}
        stores={p.stores}
        storeIds={p.storeIds}
        storeDropdownOpen={p.storeDropdownOpen}
        setStoreDropdownOpen={p.setStoreDropdownOpen}
        storeDropdownRef={p.storeDropdownRef}
        handleStoreToggle={p.handleStoreToggle}
        statuses={p.statuses}
        statusDropdownOpen={p.statusDropdownOpen}
        setStatusDropdownOpen={p.setStatusDropdownOpen}
        statusDropdownRef={p.statusDropdownRef}
        handleStatusToggle={p.handleStatusToggle}
        period={p.period}
        dateFrom={p.dateFrom}
        dateTo={p.dateTo}
        hoverDate={p.hoverDate}
        setHoverDate={p.setHoverDate}
        setDateFrom={p.setDateFrom}
        setDateTo={p.setDateTo}
        setPeriod={p.setPeriod}
        periodDropdownOpen={p.periodDropdownOpen}
        setPeriodDropdownOpen={p.setPeriodDropdownOpen}
        periodDropdownRef={p.periodDropdownRef}
        calendarNav={p.calendarNav}
        setCalendarNav={p.setCalendarNav}
        handlePeriodChange={p.handlePeriodChange}
        handleCalendarDateClick={p.handleCalendarDateClick}
        hasActiveFilters={p.hasActiveFilters}
        handleClearFilters={p.handleClearFilters}
        userIsAdmin={userIsAdmin}
        canAddTracking={canAddTracking}
        onAddTracking={p.openSingleModal}
        onBulkRegister={() => void p.openBulkModal()}
        syncActive={p.syncActive}
        syncMenuOpen={p.syncMenuOpen}
        setSyncMenuOpen={p.setSyncMenuOpen}
        syncMenuRef={p.syncMenuRef}
        syncDays={p.syncDays}
        setSyncDays={p.setSyncDays}
        syncStoreIds={p.syncStoreIds}
        handleSyncStoreToggle={p.handleSyncStoreToggle}
        onSync={() => void p.handleSync()}
      />

      {p.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{p.error}</div>
      )}

      <TrackingTable
        rows={p.rows}
        loading={p.loading}
        expandedIds={p.expandedIds}
        onToggle={p.toggleExpand}
        pagination={p.pagination}
        onPageChange={p.goToPage}
      />

      {p.bulkModal && (
        <BulkRegisterModal
          modal={p.bulkModal}
          stores={p.stores}
          onClose={p.closeBulkModal}
          onSubmit={() => void p.submitBulkRegister()}
          onDateClick={p.handleBulkDateClick}
          onStoreToggle={p.handleBulkStoreToggle}
          onSetHoverDate={(date) => p.setBulkModal((prev) => prev ? { ...prev, hoverDate: date } : null)}
          onSetStoreDropdownOpen={(open) => p.setBulkModal((prev) => prev ? { ...prev, storeDropdownOpen: open } : null)}
          onNavPrev={p.handleBulkNavPrev}
          onNavNext={p.handleBulkNavNext}
          onClearDates={p.handleBulkClearDates}
        />
      )}

      {p.singleModal && (
        <SingleRegisterModal
          modal={p.singleModal}
          onClose={p.closeSingleModal}
          onSubmit={() => void p.submitSingleRegister()}
          onFocusSearch={p.focusSearch}
          onBlurSearch={p.blurSearch}
          onSearchChange={p.setSearch}
          onSelectOrder={(order) => void p.selectOrder(order)}
          onTrackingNumberChange={p.setTrackingNumber}
          onClearOrder={p.clearSelectedOrder}
          onCarrierSearchChange={p.setCarrierSearch}
          onSelectCarrier={p.selectCarrier}
          onFocusCarrierSearch={p.focusCarrierSearch}
          onBlurCarrierSearch={p.blurCarrierSearch}
          onClearCarrier={p.clearCarrier}
        />
      )}
    </main>
  );
}
