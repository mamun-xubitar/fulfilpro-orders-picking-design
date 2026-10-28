'use client';

import EditableRows, { ROW_INPUT } from './EditableRows';
import { blankAddress } from './hooks/useCustomerForm';
import type { AddressForm } from './types';

type AddressesEditorProps = { addresses: AddressForm[]; error?: string; onChange: (addresses: AddressForm[]) => void };

type TextField = keyof Omit<AddressForm, 'key' | 'isDefault'>;

const FIELDS: Array<{ field: TextField; label: string; wide?: boolean }> = [
  { field: 'label', label: 'Label (e.g. Warehouse)' },
  { field: 'name', label: 'Recipient name' },
  { field: 'address', label: 'Address', wide: true },
  { field: 'address2', label: 'Address 2', wide: true },
  { field: 'city', label: 'City' },
  { field: 'state', label: 'State' },
  { field: 'zip', label: 'Postcode' },
  { field: 'country', label: 'Country' },
  { field: 'phone', label: 'Phone' },
];

/** Shipping addresses; the default one fills an invoice's ship-to when the customer is picked. */
export default function AddressesEditor({ addresses, error, onChange }: AddressesEditorProps) {
  const makeDefault = (key: string) => onChange(addresses.map((address) => ({ ...address, isDefault: address.key === key })));

  return (
    <EditableRows
      title="Shipping addresses"
      addLabel="Add address"
      emptyText="No shipping addresses. Invoices will ship to the billing address."
      rows={addresses}
      error={error}
      onChange={(rows) => onChange(rows.length && !rows.some((row) => row.isDefault) ? rows.map((row, i) => ({ ...row, isDefault: i === 0 })) : rows)}
      blank={blankAddress}
      copy={(row) => ({ ...row, key: blankAddress().key, isDefault: false })}
      renderRow={(row, update) => (
        <div className="grid gap-2 sm:grid-cols-2">
          {FIELDS.map(({ field, label, wide }) => (
            <input
              key={field}
              type="text"
              aria-label={label}
              placeholder={label}
              className={`${ROW_INPUT} ${wide ? 'sm:col-span-2' : ''}`}
              value={row[field]}
              onChange={(event) => update({ [field]: event.target.value })}
            />
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
            <input type="radio" name="default-address" checked={row.isDefault} onChange={() => makeDefault(row.key)} className="cursor-pointer" />
            Default shipping address
          </label>
        </div>
      )}
    />
  );
}
