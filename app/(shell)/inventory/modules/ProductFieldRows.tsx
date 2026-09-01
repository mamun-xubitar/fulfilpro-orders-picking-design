'use client';

import { sanitizeHtml } from '@/lib/sanitize-html';

/** Shared label / read-only / input rows for the Product details panel. */

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{children}</span>;
}

/** Read-mode row for `RichTextField` — the Description value is sanitized HTML (imported
 * straight from Shopify's `Body (HTML)` CSV column), so it's rendered rather than escaped. */
export function HtmlField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      {value ? (
        <div
          className="min-h-16 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-[13px] text-gray-900 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4 [&_a]:text-blue-600 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        />
      ) : (
        <p className="min-h-16 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-[13px] text-gray-900">—</p>
      )}
    </div>
  );
}

export function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <p
        className={`rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-[13px] text-gray-900 ${
          multiline ? 'min-h-16 whitespace-pre-line' : 'truncate font-medium'
        }`}
        title={multiline ? undefined : value}
      >
        {value || '—'}
      </p>
    </div>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement> }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        onChange={onChange}
        aria-label={label}
        className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
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
      <select
        value={value}
        onChange={onChange}
        aria-label={label}
        className="w-full truncate rounded-lg border border-gray-300 px-2 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
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
        rows={3}
        aria-label={label}
        className="min-h-16 w-full rounded-lg border border-gray-300 px-2.5 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
