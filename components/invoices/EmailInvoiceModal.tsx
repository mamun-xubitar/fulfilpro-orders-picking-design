'use client';

import { useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { Field, INPUT } from './fieldStyles';
import type { EmailTarget } from './useInvoiceEmail';

type EmailInvoiceModalProps = {
  /** The invoice being emailed; omitted when emailing a selection (`bulkCount`). */
  target?: EmailTarget;
  /** How many selected invoices are being emailed, each to its own customer. */
  bulkCount?: number;
  sending: boolean;
  errors: Record<string, string>;
  onSend: (to: string[], message: string, includeInvoice: boolean) => void;
  onClose: () => void;
};

const BTN = 'flex-1 rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

const splitEmails = (value: string) => value.split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);

/** Sends the invoice, laid out like the printed one, to the customer's addresses and any others typed in. */
export default function EmailInvoiceModal({ target, bulkCount = 0, sending, errors, onSend, onClose }: EmailInvoiceModalProps) {
  const bulk = !target;
  const suggestions = target?.suggestions ?? [];
  const [checked, setChecked] = useState<string[]>(suggestions);
  const [others, setOthers] = useState('');
  const [message, setMessage] = useState('');
  const [includeInvoice, setIncludeInvoice] = useState(true);
  const recipients = [...new Set([...checked, ...splitEmails(others)])];

  const toggle = (email: string) => setChecked((prev) => (prev.includes(email) ? prev.filter((other) => other !== email) : [...prev, email]));

  const sendLabel = bulk ? `Send to ${bulkCount} invoice${bulkCount === 1 ? '' : 's'}` : `Send to ${recipients.length || 'nobody'}`;

  const footer = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onClose} className={`${BTN} border border-gray-300 bg-white text-gray-600 hover:bg-gray-50`}>Cancel</button>
      <button type="button" onClick={() => onSend(bulk ? [] : recipients, message, includeInvoice)} disabled={sending} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}>
        {sending ? 'Sending...' : sendLabel}
      </button>
    </div>
  );

  return (
    <ModalShell title={bulk ? `Email ${bulkCount} invoice${bulkCount === 1 ? '' : 's'}` : `Email invoice ${target.invoiceNumber}`} onClose={onClose} disableBackdropClose footer={footer}>
      <div className="space-y-4">
        {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}
        {bulk && <p className="text-sm text-gray-700">{bulkCount} selected. Each invoice is sent to its own customer&apos;s email addresses; invoices without one are skipped.</p>}
        {suggestions.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-gray-500">Customer addresses</p>
            <div className="space-y-1">
              {suggestions.map((email) => (
                <label key={email} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={checked.includes(email)} onChange={() => toggle(email)} className="cursor-pointer" />
                  {email}
                </label>
              ))}
            </div>
          </div>
        )}
        {!bulk && (
          <Field label={suggestions.length ? 'Other recipients' : 'Recipients'} error={errors.to} hint="Separate addresses with commas.">
            <input type="text" className={INPUT} value={others} onChange={(event) => setOthers(event.target.value)} placeholder="name@example.com" />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={includeInvoice} onChange={(event) => setIncludeInvoice(event.target.checked)} className="cursor-pointer" />
          Include the invoice in the email
        </label>
        <Field label="Message" error={errors.message} hint={includeInvoice ? 'Shown above the invoice in the email.' : 'Required when the invoice is not included.'}>
          <textarea className={INPUT} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} />
        </Field>
      </div>
    </ModalShell>
  );
}
