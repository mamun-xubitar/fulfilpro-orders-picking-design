'use client';

import { useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { Field, INPUT } from './fieldStyles';
import type { EmailTarget } from './useInvoiceEmail';

type EmailInvoiceModalProps = {
  target: EmailTarget;
  sending: boolean;
  errors: Record<string, string>;
  onSend: (to: string[], message: string) => void;
  onClose: () => void;
};

const BTN = 'flex-1 rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

const splitEmails = (value: string) => value.split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);

/** Sends the invoice, laid out like the printed one, to the customer's addresses and any others typed in. */
export default function EmailInvoiceModal({ target, sending, errors, onSend, onClose }: EmailInvoiceModalProps) {
  const [checked, setChecked] = useState<string[]>(target.suggestions);
  const [others, setOthers] = useState('');
  const [message, setMessage] = useState('');
  const recipients = [...new Set([...checked, ...splitEmails(others)])];

  const toggle = (email: string) => setChecked((prev) => (prev.includes(email) ? prev.filter((other) => other !== email) : [...prev, email]));

  const footer = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onClose} className={`${BTN} border border-gray-300 bg-white text-gray-600 hover:bg-gray-50`}>Cancel</button>
      <button type="button" onClick={() => onSend(recipients, message)} disabled={sending} className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}>
        {sending ? 'Sending...' : `Send to ${recipients.length || 'nobody'}`}
      </button>
    </div>
  );

  return (
    <ModalShell title={`Email invoice ${target.invoiceNumber}`} onClose={onClose} disableBackdropClose footer={footer}>
      <div className="space-y-4">
        {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}
        {target.suggestions.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-gray-500">Customer addresses</p>
            <div className="space-y-1">
              {target.suggestions.map((email) => (
                <label key={email} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={checked.includes(email)} onChange={() => toggle(email)} className="cursor-pointer" />
                  {email}
                </label>
              ))}
            </div>
          </div>
        )}
        <Field label={target.suggestions.length ? 'Other recipients' : 'Recipients'} error={errors.to} hint="Separate addresses with commas.">
          <input type="text" className={INPUT} value={others} onChange={(event) => setOthers(event.target.value)} placeholder="name@example.com" />
        </Field>
        <Field label="Message" error={errors.message} hint="Shown above the invoice in the email.">
          <textarea className={INPUT} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} />
        </Field>
      </div>
    </ModalShell>
  );
}
