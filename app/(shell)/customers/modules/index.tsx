"use client";

import Pagination from "@/components/Pagination";
import CustomerDetailsModal from "./CustomerDetailsModal";
import CustomerModal from "./CustomerModal";
import CustomersTable from "./CustomersTable";
import CustomersToolbar from "./CustomersToolbar";
import DeleteCustomerModal from "./DeleteCustomerModal";
import MergeCustomersModal from "./MergeCustomersModal";
import { useCustomersPage } from "./hooks/useCustomersPage";
import { PAGE_SIZE_OPTIONS } from "./types";

export default function CustomersPage() {
  const { stores, list, form, actions, canWrite, isAdmin } = useCustomersPage();

  return (
    <main className="flex-1 p-4 md:p-6">
      <CustomersToolbar
        source={list.source}
        onSourceChange={list.changeSource}
        searchInput={list.searchInput}
        onSearchChange={list.setSearchInput}
        stores={stores}
        storeId={list.storeId}
        onStoreChange={list.setStoreId}
        canWrite={canWrite}
        isAdmin={isAdmin}
        selectedCount={actions.selected.size}
        syncing={actions.syncing}
        onNew={() => form.openCreate(list.storeId)}
        onMerge={() => actions.setMergeOpen(true)}
        onClearSelection={actions.clearSelection}
        onSync={actions.sync}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <CustomersTable
            source={list.source}
            rows={list.rows}
            loading={list.loading}
            searching={Boolean(list.search)}
            sort={list.sort}
            dir={list.dir}
            canWrite={canWrite}
            selected={actions.selected}
            onSortChange={list.changeSort}
            onToggleSelected={actions.toggleSelected}
            onTogglePage={actions.togglePage}
            onView={actions.openDetails}
            onEdit={form.openEdit}
            onDelete={actions.setDeleteTarget}
          />
        </div>
        <Pagination
          pagination={list.pagination}
          loading={list.loading}
          pageNumbers={list.pageNumbers}
          onPageChange={list.goToPage}
          itemLabel="customers"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={list.setPageSize}
        />
      </div>

      {form.open && (
        <CustomerModal
          source={list.source}
          editing={Boolean(form.editing)}
          form={form.form}
          errors={form.errors}
          saving={form.saving}
          stores={stores}
          onChange={form.set}
          onSave={form.save}
          onClose={form.close}
        />
      )}
      {actions.details && <CustomerDetailsModal customer={actions.details} loading={actions.detailsLoading} onClose={actions.closeDetails} />}
      {actions.deleteTarget && (
        <DeleteCustomerModal
          customer={actions.deleteTarget}
          deleting={actions.deleting}
          onConfirm={actions.confirmDelete}
          onClose={() => actions.setDeleteTarget(null)}
        />
      )}
      {actions.mergeOpen && (
        <MergeCustomersModal
          customers={[...actions.selected.values()]}
          merging={actions.merging}
          onMerge={actions.merge}
          onClose={() => actions.setMergeOpen(false)}
        />
      )}
    </main>
  );
}
