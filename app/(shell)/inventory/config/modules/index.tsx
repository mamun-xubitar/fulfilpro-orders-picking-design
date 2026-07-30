'use client';

import { useInventorySettingsPage } from './hooks/useInventorySettingsPage';
import MarginCard from './MarginCard';
import LowStockCard from './LowStockCard';
import CurrencyRatesCard from './CurrencyRatesCard';
import AddEditCurrencyModal from './AddEditCurrencyModal';
import DeleteCurrencyModal from './DeleteCurrencyModal';

export default function InventorySettingsPage() {
  const p = useInventorySettingsPage();

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl space-y-5">
        {p.error && <p className="text-sm text-red-600">{p.error}</p>}

        <MarginCard
          marginInput={p.marginInput}
          setMarginInput={p.setMarginInput}
          savingMargin={p.savingMargin}
          marginErrors={p.marginErrors}
          onSave={p.saveMargin}
        />

        <LowStockCard
          lowStockInput={p.lowStockInput}
          setLowStockInput={p.setLowStockInput}
          savingLowStock={p.savingLowStock}
          lowStockErrors={p.lowStockErrors}
          onSave={p.saveLowStock}
        />

        <CurrencyRatesCard
          currencies={p.currencies}
          loading={p.loading}
          onAdd={p.openAdd}
          onEdit={p.openEdit}
          onDelete={p.requestDelete}
        />
      </div>

      <AddEditCurrencyModal
        open={p.modalOpen}
        editCurrency={p.editCurrency}
        form={p.form}
        set={p.set}
        errors={p.errors}
        loading={p.savingCurrency}
        onSubmit={p.submitForm}
        onClose={p.closeModal}
      />

      <DeleteCurrencyModal target={p.deleteTarget} loading={p.savingCurrency} onConfirm={p.confirmDelete} onCancel={p.cancelDelete} />
    </main>
  );
}
