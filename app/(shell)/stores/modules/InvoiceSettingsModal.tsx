'use client';

import { ModalShell } from '@/components/ModalShell';
import InvoiceLogoField from './InvoiceLogoField';
import type { InvoiceFormValues, InvoiceStoreRef } from './useInvoiceSettings';

type InvoiceSettingsModalProps = {
  store: InvoiceStoreRef | null;
  form: InvoiceFormValues;
  loading: boolean;
  saving: boolean;
  errors: Record<string, string>;
  logoPath: string | null;
  logoBusy: boolean;
  logoError: string;
  onChange: (field: keyof InvoiceFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onAccentChange: (value: string) => void;
  onUploadLogo: (file: File) => void;
  onRemoveLogo: () => void;
  onSave: () => void;
  onClose: () => void;
};

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL = 'block text-xs font-medium text-gray-500 uppercase mb-1';

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="border-b border-gray-100 pb-1 text-sm font-semibold text-gray-900">{children}</h4>;
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-200" />)}
    </div>
  );
}

export default function InvoiceSettingsModal(props: InvoiceSettingsModalProps) {
  const { store, form, loading, saving, errors, onChange, onAccentChange, onSave, onClose } = props;
  if (!store) return null;

  const colorValid = /^#[0-9a-fA-F]{6}$/.test(form.accentColor);
  const text = (field: keyof InvoiceFormValues, placeholder = '') => (
    <input type="text" className={INPUT} value={form[field]} onChange={onChange(field)} placeholder={placeholder} />
  );

  return (
    <ModalShell
      title={`Tax invoice — ${store.name ?? store.storeDomain}`}
      onClose={onClose}
      wide
      disableBackdropClose
      footer={
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading || saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      {loading ? <Skeleton /> : (
        <div className="space-y-5">
          {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

          <SectionTitle>Branding</SectionTitle>
          <InvoiceLogoField
            storeName={form.storeName}
            logoPath={props.logoPath}
            busy={props.logoBusy}
            error={props.logoError}
            onUpload={props.onUploadLogo}
            onRemove={props.onRemoveLogo}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name" error={errors.storeName} hint="Printed in the logo spot when there is no logo, and in the footer.">
              {text('storeName', 'e.g. MADHATS')}
            </Field>
            <Field label="Accent color" error={errors.accentColor} hint="Title bar, table rule and footer band.">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick accent color"
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
                  value={colorValid ? form.accentColor : '#000000'}
                  onChange={(event) => onAccentChange(event.target.value)}
                />
                <input type="text" className={`${INPUT} font-mono`} value={form.accentColor} onChange={onChange('accentColor')} maxLength={7} />
              </div>
            </Field>
          </div>

          <SectionTitle>Business details</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">{text('businessName', 'e.g. NF FAMILY PTY LTD')}</Field>
            <Field label="ABN" error={errors.abn}>{text('abn', '11 digits')}</Field>
            <Field label="Email" error={errors.email}>{text('email', 'sales@example.com')}</Field>
            <Field label="Website" error={errors.websiteUrl}>{text('websiteUrl', 'www.example.com')}</Field>
          </div>

          <SectionTitle>Tax</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Australia tax %" error={errors.ausTaxRate} hint="Included in prices for Australian (and domestic) invoices; the total never changes.">
              <input type="number" min={0} max={100} step="0.01" className={INPUT} value={form.ausTaxRate} onChange={onChange('ausTaxRate')} />
            </Field>
            <Field label="New Zealand tax %" error={errors.nzTaxRate} hint="Included in prices for New Zealand invoices.">
              <input type="number" min={0} max={100} step="0.01" className={INPUT} value={form.nzTaxRate} onChange={onChange('nzTaxRate')} />
            </Field>
          </div>

          <SectionTitle>Invoice</SectionTitle>
          <Field
            label="Invoice number prefix"
            error={errors.invoicePrefix}
            hint="Overrides the global prefix from Settings. Leave blank to use the global prefix. Numbers already issued don't change."
          >
            {text('invoicePrefix', 'e.g. MH')}
          </Field>
          <Field label="Payment instructions" error={errors.paymentInstructions} hint="Printed under PAYMENT METHOD on Bank Deposit / manual-payment orders. Card and PayPal orders show the method Shopify recorded instead. Line breaks are kept.">
            <textarea
              className={`${INPUT} min-h-28`}
              value={form.paymentInstructions}
              onChange={onChange('paymentInstructions')}
              placeholder={'EFT NF FAMILY PTY LTD\nBSB CODE 000-000 ACCOUNT NUMBER 000 000 000\nPLEASE EMAIL YOUR RECEIPT ONCE PAID'}
            />
          </Field>
          <Field label="Invoice terms" error={errors.defaultTerms} hint="Default terms printed at the bottom of every invoice for this store. Manual invoices start with this text and can change it.">
            <textarea
              className={`${INPUT} min-h-24`}
              value={form.defaultTerms}
              onChange={onChange('defaultTerms')}
              placeholder="e.g. Payment due within 14 days. Goods remain our property until paid in full."
            />
          </Field>
        </div>
      )}
    </ModalShell>
  );
}
