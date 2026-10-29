'use client';

import { Copy, Plus, Trash2 } from '@/components/icons';
import { SECTION_TONE, type SectionTone } from './sectionTone';

export const ROW_INPUT = 'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export const COUNTRY_LIST_ID = 'customer-country-options';
/** Keeps the datalist suggestions but not the browser's dropdown arrow on hover. */
export const HIDE_LIST_ARROW = 'hide-list-arrow';

type CardInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  /** Offers the country suggestions from the modal's datalist. */
  country?: boolean;
  className?: string;
};

/** A labelled input for the fields inside a contact / address card. */
export function CardInput({ label, value, onChange, placeholder, multiline, country, className = '' }: CardInputProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-0.5 block text-[11px] font-medium uppercase text-gray-500">{label}</span>
      {multiline ? (
        <textarea rows={2} autoComplete="off" className={ROW_INPUT} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type="text" autoComplete="off" list={country ? COUNTRY_LIST_ID : undefined} className={country ? `${ROW_INPUT} ${HIDE_LIST_ARROW}` : ROW_INPUT} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

type EditableRowsProps<T extends { key: string }> = {
  title: string;
  addLabel: string;
  tone: SectionTone;
  icon: React.ComponentType<{ className?: string }>;
  rows: T[];
  error?: string;
  onChange: (rows: T[]) => void;
  blank: () => T;
  /** Copies a row with a fresh key; used by the per-row Copy button. */
  copy: (row: T) => T;
  /** Shown in a card's header, beside its number. */
  headerExtra?: (row: T) => React.ReactNode;
  renderRow: (row: T, update: (values: Partial<T>) => void) => React.ReactNode;
};

const ICON_BTN = 'rounded-lg p-1 text-gray-400 transition-colors duration-150 cursor-pointer';

/** A framed, colour-coded list of numbered cards with add, copy and remove. It never goes empty: removing
 * the last card leaves a blank one, so the inputs are always there. */
export default function EditableRows<T extends { key: string }>(props: EditableRowsProps<T>) {
  const { rows, tone, icon: SectionIcon } = props;
  const colors = SECTION_TONE[tone];
  const commit = (next: T[]) => props.onChange(next.length ? next : [props.blank()]);
  const update = (key: string) => (values: Partial<T>) => commit(rows.map((row) => (row.key === key ? { ...row, ...values } : row)));
  const insertCopy = (index: number) => commit([...rows.slice(0, index + 1), props.copy(rows[index]), ...rows.slice(index + 1)]);

  return (
    <section className={`overflow-hidden rounded-xl border bg-white ${colors.frame}`}>
      <div className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${colors.header}`}>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <SectionIcon className="h-4 w-4" />
          {props.title}
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold tabular-nums">{rows.length}</span>
        </h4>
        <button type="button" onClick={() => commit([...rows, props.blank()])} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors duration-150 cursor-pointer ${colors.add}`}>
          <Plus className="h-3.5 w-3.5" /> {props.addLabel}
        </button>
      </div>
      <div className="space-y-3 p-3">
        {props.error && <p className="text-xs text-red-500">{props.error}</p>}
        {rows.map((row, index) => (
          <div key={row.key} className={`rounded-lg border p-3 ${colors.card}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${colors.badge}`}>{index + 1}</span>
                {props.headerExtra?.(row)}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={`Copy ${props.title.toLowerCase()} ${index + 1}`} title="Copy" onClick={() => insertCopy(index)} className={`${ICON_BTN} hover:bg-white hover:text-gray-600`}>
                  <Copy className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Remove ${props.title.toLowerCase()} ${index + 1}`} title="Remove" onClick={() => commit(rows.filter((other) => other.key !== row.key))} className={`${ICON_BTN} hover:bg-red-50 hover:text-red-600`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {props.renderRow(row, update(row.key))}
          </div>
        ))}
      </div>
    </section>
  );
}
