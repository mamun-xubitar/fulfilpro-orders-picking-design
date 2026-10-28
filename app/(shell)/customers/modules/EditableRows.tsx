'use client';

import { Copy, Plus, Trash2 } from '@/components/icons';

export const ROW_INPUT = 'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

type EditableRowsProps<T extends { key: string }> = {
  title: string;
  addLabel: string;
  emptyText: string;
  rows: T[];
  error?: string;
  onChange: (rows: T[]) => void;
  blank: () => T;
  /** Copies a row with a fresh key; used by the per-row Copy button. */
  copy: (row: T) => T;
  renderRow: (row: T, update: (values: Partial<T>) => void) => React.ReactNode;
};

/** A numbered list of editable cards with add, copy and remove — shared by contacts and addresses. */
export default function EditableRows<T extends { key: string }>(props: EditableRowsProps<T>) {
  const { rows, onChange } = props;
  const update = (key: string) => (values: Partial<T>) => onChange(rows.map((row) => (row.key === key ? { ...row, ...values } : row)));
  const insertCopy = (index: number) => onChange([...rows.slice(0, index + 1), props.copy(rows[index]), ...rows.slice(index + 1)]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-1">
        <h4 className="text-sm font-semibold text-gray-900">{props.title}</h4>
        <button type="button" onClick={() => onChange([...rows, props.blank()])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> {props.addLabel}
        </button>
      </div>
      {props.error && <p className="mb-2 text-xs text-red-500">{props.error}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">{props.emptyText}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">{index + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={`Copy ${props.title.toLowerCase()} ${index + 1}`} title="Copy" onClick={() => insertCopy(index)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label={`Remove ${props.title.toLowerCase()} ${index + 1}`} title="Remove" onClick={() => onChange(rows.filter((other) => other.key !== row.key))} className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {props.renderRow(row, update(row.key))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
