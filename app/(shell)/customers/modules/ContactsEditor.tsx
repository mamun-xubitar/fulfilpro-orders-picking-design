'use client';

import EditableRows, { ROW_INPUT } from './EditableRows';
import { blankContact } from './hooks/useCustomerForm';
import type { ContactForm } from './types';

type ContactsEditorProps = { contacts: ContactForm[]; error?: string; onChange: (contacts: ContactForm[]) => void };

const FIELDS: Array<{ field: keyof Omit<ContactForm, 'key'>; label: string; placeholder?: string }> = [
  { field: 'name', label: 'Name' },
  { field: 'jobTitle', label: 'Job title' },
  { field: 'email', label: 'Email', placeholder: 'name@example.com' },
  { field: 'phone', label: 'Phone' },
];

/** The customer's company contacts: name, job title, email and phone each. */
export default function ContactsEditor({ contacts, error, onChange }: ContactsEditorProps) {
  return (
    <EditableRows
      title="Contacts"
      addLabel="Add contact"
      emptyText="No extra contacts. Add the people you deal with at this customer."
      rows={contacts}
      error={error}
      onChange={onChange}
      blank={blankContact}
      copy={(row) => ({ ...row, key: blankContact().key })}
      renderRow={(row, update) => (
        <div className="grid gap-2 sm:grid-cols-2">
          {FIELDS.map(({ field, label, placeholder }) => (
            <input
              key={field}
              type="text"
              aria-label={label}
              placeholder={placeholder ?? label}
              className={ROW_INPUT}
              value={row[field]}
              onChange={(event) => update({ [field]: event.target.value })}
            />
          ))}
        </div>
      )}
    />
  );
}
