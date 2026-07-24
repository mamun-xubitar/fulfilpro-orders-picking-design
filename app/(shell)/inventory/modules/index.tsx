'use client';

import { useInventoryPage } from './hooks/useInventoryPage';
import InventoryToolbar from './InventoryToolbar';
import InventoryTable from './InventoryTable';
import InventoryPagination from './InventoryPagination';
import InventorySelectionBar from './InventorySelectionBar';
import InventoryBulkModals from './InventoryBulkModals';

export default function InventoryPage() {
  const p = useInventoryPage();
  const hasSelection = p.selectAllFilters || p.selectedIds.length > 0;

  return (
    <main className="flex-1 p-4 md:p-6">
      <InventoryToolbar
        searchInput={p.searchInput}
        setSearchInput={p.setSearchInput}
        searchField={p.searchField}
        setSearchField={p.setSearchField}
        searchDropdownOpen={p.searchDropdownOpen}
        setSearchDropdownOpen={p.setSearchDropdownOpen}
        searchDropdownRef={p.searchDropdownRef}
        stores={p.stores}
        storeIds={p.storeIds}
        storeDropdownOpen={p.storeDropdownOpen}
        setStoreDropdownOpen={p.setStoreDropdownOpen}
        storeDropdownRef={p.storeDropdownRef}
        handleStoreToggle={p.handleStoreToggle}
        status={p.status}
        statusDropdownOpen={p.statusDropdownOpen}
        setStatusDropdownOpen={p.setStatusDropdownOpen}
        statusDropdownRef={p.statusDropdownRef}
        handleStatusToggle={p.handleStatusToggle}
        stockLevel={p.stockLevel}
        stockDropdownOpen={p.stockDropdownOpen}
        setStockDropdownOpen={p.setStockDropdownOpen}
        stockDropdownRef={p.stockDropdownRef}
        handleStockLevelChange={p.handleStockLevelChange}
        hasActiveFilters={p.hasActiveFilters}
        handleClearFilters={p.handleClearFilters}
        syncStoreIds={p.syncStoreIds}
        handleSyncStoreToggle={p.handleSyncStoreToggle}
        syncStoreDropdownOpen={p.syncStoreDropdownOpen}
        setSyncStoreDropdownOpen={p.setSyncStoreDropdownOpen}
        syncStoreDropdownRef={p.syncStoreDropdownRef}
        handleSync={p.handleSync}
        syncing={p.syncing}
        loading={p.loading}
        syncActive={p.syncActive}
        handleRefresh={p.handleRefresh}
        syncRefreshNeeded={p.syncRefreshNeeded}
        refreshRotation={p.refreshRotation}
        syncMessage={p.syncMessage}
      />

      {hasSelection && (
        <InventorySelectionBar
          selectedCount={p.selectedIds.length}
          selectAllFilters={p.selectAllFilters}
          onToggleSelectAllFilters={p.toggleSelectAllFilters}
          isCurrentPageAllSelected={p.isCurrentPageAllSelected}
          onToggleCurrentPage={p.toggleSelectAllOnPage}
          bulkRunning={p.bulkRunning}
          bulkJob={p.bulkJob}
          onArchive={() => p.runBulkAction('archive')}
          onSetDraft={() => p.runBulkAction('set_draft')}
          onOpenTagModal={(mode) => p.setTagModal({ mode, input: '' })}
          onOpenChannelModal={(mode) => p.setChannelModal({ mode, input: '' })}
          onOpenDelete={() => p.setDeleteConfirm({ kind: 'selection' })}
          onClear={p.clearSelection}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <InventoryTable
            products={p.products}
            loading={p.loading}
            error={p.error}
            sort={p.sort}
            dir={p.dir}
            onSortChange={p.handleSortChange}
            selectedIds={p.selectedIds}
            onToggleSelect={p.toggleSelect}
            isCurrentPageAllSelected={p.isCurrentPageAllSelected}
            onToggleSelectAllOnPage={p.toggleSelectAllOnPage}
            onRequestDelete={(id, title) => p.setDeleteConfirm({ kind: 'single', id, title })}
          />
        </div>

        <InventoryPagination
          pagination={p.pagination}
          loading={p.loading}
          pageNumbers={p.pageNumbers}
          onPageChange={p.goToPage}
          itemLabel="products"
        />
      </div>

      <InventoryBulkModals
        tagModal={p.tagModal}
        setTagModal={p.setTagModal}
        onSubmitTagModal={p.submitTagModal}
        channelModal={p.channelModal}
        setChannelModal={p.setChannelModal}
        onSubmitChannelModal={p.submitChannelModal}
        deleteConfirm={p.deleteConfirm}
        setDeleteConfirm={p.setDeleteConfirm}
        onConfirmDelete={p.confirmDelete}
        bulkRunning={p.bulkRunning}
      />
    </main>
  );
}
