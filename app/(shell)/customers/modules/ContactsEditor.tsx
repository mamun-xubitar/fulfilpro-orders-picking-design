'use client';

import { Users } from '@/components/icons';
import EditableRows, { CardInput } from './EditableRows';
import { blankContact } from './hooks/useCustomerForm';
import type { ContactForm } from './types';

type ContactsEditorProps = { contacts: ContactForm[]; error?: string; onChange: (contacts: ContactForm[]) => void };

/** The customer's company contacts. The first one is the customer's main email, phone and billing address. */
export default function ContactsEditor({ contacts, error, onChange }: ContactsEditorProps) {
  return (
    <EditableRows
      title="Company contacts"
      addLabel="Add contact"
      tone="blue"
      icon={Users}
      rows={contacts}
      error={error}
      onChange={onChange}
      blank={blankContact}
      copy={(row) => ({ ...row, key: blankContact().key })}
      renderRow={(row, update) => (
        <div className="grid gap-2 sm:grid-cols-2">
          <CardInput label="Name" value={row.name} onChange={(name) => update({ name })} />
          <CardInput label="Job title" value={row.jobTitle} onChange={(jobTitle) => update({ jobTitle })} />
          <CardInput label="Email" value={row.email} placeholder="name@example.com" onChange={(email) => update({ email })} />
          <CardInput label="Phone" value={row.phone} onChange={(phone) => update({ phone })} />
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
