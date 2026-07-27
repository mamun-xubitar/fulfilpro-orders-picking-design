'use client';

import { ModalShell, ModalActions } from './ModalShell';
import { STATUS_OPTIONS } from './constants';
import CategoryPicker from './CategoryPicker';
import ProductTypePicker from './ProductTypePicker';
import TagChipsInput from './TagChipsInput';
import type { useFieldEdit } from './hooks/useFieldEdit';
import type { ProductStatusValue } from './types';

const TITLES: Record<string, string> = {
  title: 'Edit title',
  status: 'Edit status',
  category: 'Edit category',
  productType: 'Edit product type',
  tags: 'Edit tags',
  price: 'Update price for all variants',
  cost: 'Update cost for all variants',
};

export default function EditFieldModal({ edit }: { edit: ReturnType<typeof useFieldEdit> }) {
  const { editing } = edit;
  if (!editing) return null;

  const isMoney = editing.field === 'price' || editing.field === 'cost';
  const moneyInvalid = isMoney && (!editing.value || Number.isNaN(Number(editing.value)));

  return (
    <ModalShell title={TITLES[editing.field]} onClose={edit.closeEdit} allowOverflow={editing.field === 'category' || editing.field === 'productType'}>
      {editing.field === 'title' && (
        <input
          type="text"
          value={editing.value}
          onChange={(e) => edit.setValue(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
      )}

      {editing.field === 'status' && (
        <select
          value={editing.value}
          onChange={(e) => edit.setValue(e.target.value as ProductStatusValue)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {editing.field === 'category' && <CategoryPicker storeId={edit.storeId} value={editing.value} onChange={edit.setValue} />}

      {editing.field === 'productType' && <ProductTypePicker value={editing.value} onChange={edit.setValue} />}

      {editing.field === 'tags' && <TagChipsInput tags={editing.value} onChange={edit.setValue} />}

      {isMoney && (
        <>
          <p className="text-sm text-gray-600 mb-4">This sets every variant&apos;s {editing.field}. This cannot be undone.</p>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={editing.value}
            onChange={(e) => edit.setValue(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </>
      )}

      <div className="mt-4">
        <ModalActions
          onCancel={edit.closeEdit}
          onConfirm={edit.save}
          confirmLabel={edit.saving ? (isMoney ? 'Applying...' : 'Saving...') : isMoney ? 'Apply to all' : 'Save'}
          disabled={edit.saving || moneyInvalid}
        />
      </div>
    </ModalShell>
  );
}
