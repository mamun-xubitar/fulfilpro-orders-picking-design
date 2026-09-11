'use client';

import { ModalShell } from '@/components/ModalShell';
import { formatDate, variantTitle } from './utils';
import type { useAdjustments } from './hooks/useAdjustments';
import type { VariantRow } from './types';

type AdjustmentModalsProps = { adjustments: ReturnType<typeof useAdjustments>; variants: VariantRow[] };

export default function AdjustmentModals({ adjustments: a, variants }: AdjustmentModalsProps) {
  return (
    <>
      {a.modalOpen && <NewAdjustmentModal a={a} variants={variants} />}
      {a.historyOpen && <AdjustmentHistoryModal a={a} />}
    </>
  );
}

function NewAdjustmentModal({ a, variants }: { a: ReturnType<typeof useAdjustments>; variants: VariantRow[] }) {
  const variantById = new Map(variants.map((v) => [v.id, v]));
  const targetVariants = a.variantIds.map((id) => variantById.get(id)).filter((v): v is VariantRow => !!v);

  return (
    <ModalShell
      title="New stock adjustment"
      onClose={a.closeModal}
      extraWide
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-gray-500">{a.dirtyCount} row{a.dirtyCount === 1 ? '' : 's'} with a pending change</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={a.closeModal}
              className="h-[22px] rounded-[6px] border border-gray-300 bg-white px-[10px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={a.saveAll}
              disabled={a.savingAll || a.dirtyCount === 0}
              className="h-[22px] rounded-[6px] bg-blue-600 px-[10px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {a.savingAll ? 'Saving all...' : `Save all (${a.dirtyCount})`}
            </button>
          </div>
        </div>
      }
    >
      <AdjustmentChipsStrip a={a} />

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-[11px] leading-none">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-200 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-gray-500">
              <th className="w-8 px-2 py-1">
                <input
                  type="checkbox"
                  checked={a.allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = a.someSelected;
                  }}
                  onChange={a.toggleSelectAll}
                  aria-label="Select all rows"
                  className="h-3 w-3 cursor-pointer accent-blue-600"
                />
              </th>
              <th className="px-2 py-1">Variant</th>
              <th className="px-2 py-1 text-right">On hand</th>
              <th className="px-2 py-1">Adjustment</th>
              <th className="px-2 py-1">Reason</th>
              <th className="px-2 py-1">Note</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {targetVariants.map((v) => (
              <AdjustmentRow key={v.id} a={a} v={v} />
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}

/** Preset delta chips, applied to every currently-selected row at once — replaces the old
 * per-row preset dropdown. Disabled (dimmed, non-interactive) until at least one row is
 * selected, so it's never ambiguous which rows a click would affect. */
function AdjustmentChipsStrip({ a }: { a: ReturnType<typeof useAdjustments> }) {
  const disabled = a.selectedIds.size === 0;
  return (
    <div
      aria-disabled={disabled}
      className={`mb-2 rounded-[7px] border border-gray-200 bg-gray-50 p-2 transition-opacity duration-150 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <p className="mb-1.5 text-[11px] font-medium text-gray-600">
        Applies to the {a.selectedIds.size} selected row{a.selectedIds.size === 1 ? '' : 's'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {a.presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => a.applyChip(preset)}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none transition-colors duration-150 cursor-pointer ${
              preset > 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            {preset > 0 ? `+${preset}` : preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => a.applyChip(null)}
          className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-semibold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function AdjustmentRow({ a, v }: { a: ReturnType<typeof useAdjustments>; v: VariantRow }) {
  const row = a.rows[v.id];
  const saving = a.savingIds.has(v.id);
  const error = a.rowErrors[v.id];
  const selected = a.selectedIds.has(v.id);

  return (
    <tr className="border-b border-gray-100 align-top last:border-0">
      <td className="px-2 py-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => a.toggleSelect(v.id)}
          aria-label={`Select ${variantTitle(v)}`}
          className="h-3 w-3 cursor-pointer accent-blue-600"
        />
      </td>
      <td className="px-2 py-1 text-gray-700">{variantTitle(v)}</td>
      <td className="px-2 py-1 text-right tabular-nums text-gray-500">{v.stockOnHand}</td>
      <td className="px-2 py-1">
        <input
          type="number"
          value={row?.delta ?? ''}
          onChange={(e) => a.setRowField(v.id, { delta: e.target.value })}
          placeholder="0"
          className="h-[22px] w-24 rounded-[6px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {error && <p className="mt-1 text-[10px] leading-tight text-red-600">{error}</p>}
      </td>
      <td className="px-2 py-1">
        <select
          value={row?.reason ?? 'CORRECTION'}
          onChange={(e) => a.setRowField(v.id, { reason: e.target.value as typeof row.reason })}
          className="h-[22px] w-32 rounded-[6px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          {a.reasons.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1">
        <textarea
          rows={2}
          value={row?.note ?? ''}
          onChange={(e) => a.setRowField(v.id, { note: e.target.value })}
          className="w-72 resize-none rounded-[6px] border border-gray-300 px-[6px] py-[4px] text-[11px] leading-tight outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </td>
      <td className="px-2 py-1 text-right">
        <button
          type="button"
          onClick={() => a.saveRow(v.id)}
          disabled={saving}
          className="h-[22px] rounded-[6px] border border-gray-300 bg-white px-2 text-[10px] font-bold leading-none text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

function AdjustmentHistoryModal({ a }: { a: ReturnType<typeof useAdjustments> }) {
  return (
    <ModalShell title="Adjustment history" onClose={a.closeHistory} wide>
      {a.loadingHistory ? (
        <p className="py-6 text-center text-[11px] text-gray-400">Loading...</p>
      ) : a.history.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-gray-400">No adjustments recorded yet.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
          {a.history.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 py-1.5 text-[11px]">
              <span className="min-w-0 truncate text-gray-700">
                {variantTitle(row)} · {row.reason.toLowerCase()} {row.note ? `— ${row.note}` : ''}
              </span>
              <span className={`shrink-0 font-semibold tabular-nums ${row.delta > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {row.delta > 0 ? '+' : ''}
                {row.delta} <span className="font-normal text-gray-400">· {formatDate(row.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}
