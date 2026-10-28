"use client";

import Pagination from "@/components/Pagination";
import { ModalActions, ModalShell } from "@/components/ModalShell";
import InvoiceModal from "@/components/invoices/InvoiceModal";
import InvoicesTable from "./InvoicesTable";
import InvoicesToolbar from "./InvoicesToolbar";
import { useInvoicesPage } from "./hooks/useInvoicesPage";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function InvoicesPage() {
  const p = useInvoicesPage();
  const { list, modal, deleteTarget } = p;

  return (
    <main className="flex-1 p-4 md:p-6">
      <InvoicesToolbar
        searchInput={list.searchInput}
        onSearchChange={list.setSearchInput}
        stores={p.stores}
        storeId={list.storeId}
        onStoreChange={list.setStoreId}
        status={list.status}
        onStatusChange={list.setStatus}
        canWrite={p.canWrite}
        onNew={p.openCreate}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <InvoicesTable
            rows={list.rows}
            loading={list.loading || p.loadingDetail}
            searching={Boolean(list.search || list.storeId || list.status)}
            sort={list.sort}
            dir={list.dir}
            canWrite={p.canWrite}
            printingId={p.printer.printingId}
            onSortChange={list.changeSort}
            onView={(row) => p.openFromRow(row, "view")}
            onEdit={(row) => p.openFromRow(row, "edit")}
            onCopy={(row) => p.openFromRow(row, "copy")}
            onPrint={(row) => void p.printer.print(row.id)}
            onDelete={p.setDeleteTarget}
          />
        </div>
        <Pagination
          pagination={list.pagination}
          loading={list.loading}
          pageNumbers={list.pageNumbers}
          onPageChange={list.goToPage}
          itemLabel="invoices"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={list.setPageSize}
        />
      </div>

      {modal && (
        <InvoiceModal
          key={modal.token}
          mode={modal.mode}
          initial={modal.initial}
          invoiceId={modal.invoiceId}
          stores={p.stores}
          printing={p.printer.printingId === modal.invoiceId}
          onSaved={p.onSaved}
          onPrint={modal.invoiceId ? () => void p.printer.print(modal.invoiceId as string) : undefined}
          onEdit={p.canWrite ? p.switchToEdit : undefined}
          onClose={p.closeModal}
        />
      )}
      {deleteTarget && (
        <ModalShell
          title="Delete invoice"
          onClose={() => p.setDeleteTarget(null)}
          footer={<ModalActions onCancel={() => p.setDeleteTarget(null)} onConfirm={p.confirmDelete} confirmLabel={p.deleting ? "Deleting..." : "Delete"} disabled={p.deleting} danger />}
        >
          <p className="text-sm text-gray-700">
            Delete invoice <span className="font-semibold">{deleteTarget.invoiceNumber}</span> for {deleteTarget.billToName}? Its number is not reused.
          </p>
        </ModalShell>
      )}
    </main>
  );
}
