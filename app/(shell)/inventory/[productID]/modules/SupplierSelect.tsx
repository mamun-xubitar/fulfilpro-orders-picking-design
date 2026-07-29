'use client';

import type { ProductSuppliers, SupplierOption } from './types';

type SupplierSelectProps = {
  options: SupplierOption[];
  suppliers: ProductSuppliers;
  onSelect: (supplierId: string) => void;
  saving: boolean;
};

export default function SupplierSelect({ options, suppliers, onSelect, saving }: SupplierSelectProps) {
  const attachedIds = new Set(suppliers.attached.map((s) => s.id));
  const viaCollectionById = new Map(suppliers.viaCollection.map((s) => [s.id, s.collectionTitle]));
  const value = suppliers.attached[0]?.id ?? suppliers.viaCollection[0]?.id ?? '';

  return (
    <select
      value={value}
      onChange={(e) => onSelect(e.target.value)}
      disabled={saving}
      className="w-full border border-gray-300 rounded-lg px-2 py-1 text-[13px] outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer disabled:opacity-50"
    >
      <option value="">— Select supplier —</option>
      {options.map((option) => {
        const isAttached = attachedIds.has(option.id);
        const collectionTitle = viaCollectionById.get(option.id);
        const suffix = isAttached ? ' ✓' : collectionTitle ? ` · via ${collectionTitle}` : '';
        return (
          <option key={option.id} value={option.id}>
            {option.name}{suffix}
          </option>
        );
      })}
    </select>
  );
}
