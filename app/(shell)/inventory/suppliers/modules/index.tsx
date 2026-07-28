'use client';

import { useSuppliersPage } from './hooks/useSuppliersPage';
import SuppliersToolbar from './SuppliersToolbar';
import SuppliersTable from './SuppliersTable';
import AddEditSupplierModal from './AddEditSupplierModal';
import DeleteSupplierModal from './DeleteSupplierModal';
import SupplierConnectionsModal from './SupplierConnectionsModal';

export default function SuppliersPage() {
  const p = useSuppliersPage();

  return (
    <main className="flex-1 p-4 md:p-6">
      <SuppliersToolbar searchInput={p.searchInput} setSearchInput={p.setSearchInput} onAdd={p.openAdd} />

      <SuppliersTable
        suppliers={p.suppliers}
        loading={p.loading}
        pagination={p.pagination}
        pageNumbers={p.pageNumbers}
        onPageChange={p.goToPage}
        onEdit={p.openEdit}
        onConnections={p.openConnections}
        onDelete={p.requestDelete}
      />

      <AddEditSupplierModal
        open={p.modalOpen}
        editSupplier={p.editSupplier}
        form={p.form}
        set={p.set}
        errors={p.errors}
        loading={p.loading}
        onSubmit={p.submitForm}
        onClose={p.closeModal}
      />

      <DeleteSupplierModal target={p.deleteTarget} loading={p.loading} onConfirm={p.confirmDelete} onCancel={p.cancelDelete} />

      <SupplierConnectionsModal connections={p.connections} onClose={p.connections.close} />
    </main>
  );
}
