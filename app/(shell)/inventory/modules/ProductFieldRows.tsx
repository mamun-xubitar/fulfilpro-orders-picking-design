'use client';

import ClampedHtml from './ClampedHtml';

/** Shared label / read-only / input rows for the Product details panel. Sizing matches the
 * prototype's `.lbl` (label) and `.inp` (24px-tall input) tokens literally — fixed heights +
 * `leading-none` rather than padding/line-height approximations. */

const LABEL_CLASS = 'mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle';
const INPUT_CLASS =
  'h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none text-inventory-text outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className={LABEL_CLASS}>{children}</span>;
}

/** Read-mode row for `RichTextField` — the Description value is sanitized HTML (imported
 * straight from Shopify's `Body (HTML)` CSV column), so it's rendered rather than escaped.
 * Clamped to 10 lines with a "See more" button that only appears when it actually overflows. */
export function HtmlField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      {value ? (
        <ClampedHtml html={value} title={label} />
      ) : (
        <p className="min-h-12 rounded-[7px] border border-inventory-border bg-inventory-surface-muted px-[6px] py-1.5 text-[11px] text-inventory-text">—</p>
      )}
    </div>
  );
}

export function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <p
        className={`rounded-[7px] border border-inventory-border bg-inventory-surface-muted px-[6px] text-[11px] text-inventory-text ${
          multiline ? 'min-h-12 whitespace-pre-line py-1.5' : 'h-[24px] flex items-center truncate font-medium leading-none'
        }`}
        title={multiline ? undefined : value}
      >
        {value || '—'}
      </p>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <input type="text" value={value} onChange={onChange} aria-label={label} placeholder={placeholder} className={`${INPUT_CLASS} uppercase placeholder:text-inventory-text-subtle placeholder:normal-case`} />
      {error && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{error}</p>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={onChange} aria-label={label} className={`${INPUT_CLASS} truncate cursor-pointer`}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLTextAreaElement> }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={onChange}
        rows={2}
        aria-label={label}
        className="min-h-[40px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] py-[4px] text-[11px] leading-tight text-inventory-text outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
      />
    </div>
  );
}
