'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import type { CurrencyForm, CurrencyRateRow } from './types';

type Props = {
  open: boolean;
  editCurrency: CurrencyRateRow | null;
  form: CurrencyForm;
  set: (field: keyof CurrencyForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
  loading: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

export default function AddEditCurrencyModal({ open, editCurrency, form, set, errors, loading, onSubmit, onClose }: Props) {
  if (!open) return null;

  return (
    <ModalShell
      title={editCurrency ? 'Edit currency' : 'Add currency'}
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={onSubmit}
          confirmLabel={loading ? 'Saving...' : editCurrency ? 'Save changes' : 'Add currency'}
          disabled={loading}
        />
      }
    >
      <div className="space-y-4">
        <Field label="Currency code" error={errors.code} hint="3-letter ISO code, e.g. USD">
          <input
            type="text"
            value={form.code}
            onChange={set('code')}
            maxLength={3}
            disabled={editCurrency !== null}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="USD"
          />
        </Field>

        <Field label={`1 ${form.code || 'XXX'} = ? AUD`} error={errors.rate}>
          <input
            type="number"
            step="0.0001"
            value={form.rate}
            onChange={set('rate')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="1.5200"
          />
        </Field>

        {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}
      </div>
    </ModalShell>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
