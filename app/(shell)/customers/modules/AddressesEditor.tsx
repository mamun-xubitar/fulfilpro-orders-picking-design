'use client';

import { Truck } from '@/components/icons';
import EditableRows, { CardInput } from './EditableRows';
import { blankAddress } from './hooks/useCustomerForm';
import type { AddressForm } from './types';

type AddressesEditorProps = { addresses: AddressForm[]; error?: string; onChange: (addresses: AddressForm[]) => void };

/** Shipping addresses; the default one fills an invoice's ship-to when the customer is picked. */
export default function AddressesEditor({ addresses, error, onChange }: AddressesEditorProps) {
  const makeDefault = (key: string) => onChange(addresses.map((address) => ({ ...address, isDefault: address.key === key })));

  return (
    <EditableRows
      title="Shipping addresses"
      addLabel="Add address"
      tone="slate"
      icon={Truck}
      rows={addresses}
      error={error}
      onChange={(rows) => onChange(rows.length && !rows.some((row) => row.isDefault) ? rows.map((row, i) => ({ ...row, isDefault: i === 0 })) : rows)}
      blank={blankAddress}
      copy={(row) => ({ ...row, key: blankAddress().key, isDefault: false })}
      headerExtra={(row) => (
        <label className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${row.isDefault ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'}`}>
          <input type="radio" name="default-address" checked={row.isDefault} onChange={() => makeDefault(row.key)} className="h-3 w-3 cursor-pointer" />
          Default shipping address
        </label>
      )}
      renderRow={(row, update) => (
        <div className="grid gap-2 sm:grid-cols-2">
          <CardInput label="Name" value={row.name} onChange={(name) => update({ name })} />
          <CardInput label="Phone" value={row.phone} onChange={(phone) => update({ phone })} />
          <CardInput label="Email" value={row.email} placeholder="name@example.com" className="sm:col-span-2" onChange={(email) => update({ email })} />
          <CardInput label="Address" value={row.address} multiline className="sm:col-span-2" onChange={(address) => update({ address })} />
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <CardInput label="City" value={row.city} onChange={(city) => update({ city })} />
            <CardInput label="State" value={row.state} onChange={(state) => update({ state })} />
            <CardInput label="Zip" value={row.zip} onChange={(zip) => update({ zip })} />
          </div>
          <CardInput label="Country" value={row.country} country className="sm:col-span-2" onChange={(country) => update({ country })} />
        </div>
      )}
    />
  );
}
