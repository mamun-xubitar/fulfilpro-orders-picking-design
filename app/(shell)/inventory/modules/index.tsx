'use client';

import { useInventoryPage } from './hooks/useInventoryPage';
import InventoryToolbar from './InventoryToolbar';
import InventoryTable from './InventoryTable';
import InventoryPagination from './InventoryPagination';

export default function InventoryPage() {
  const p = useInventoryPage();

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <InventoryTable
            products={p.products}
            loading={p.loading}
            error={p.error}
            sort={p.sort}
            dir={p.dir}
            onSortChange={p.handleSortChange}
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
    </main>
  );
}
