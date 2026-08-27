'use client';

import { ModalShell } from '@/components/ModalShell';
import { formatDate } from './utils';
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
  const dirtyCount = a.variantIds.filter((id) => Number(a.rows[id]?.delta) !== 0 && a.rows[id]?.delta).length;

  return (
    <ModalShell
      title="New stock adjustment"
      onClose={a.closeModal}
      extraWide
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">{dirtyCount} row{dirtyCount === 1 ? '' : 's'} with a pending change</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={a.closeModal}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={a.saveAll}
              disabled={a.savingAll || dirtyCount === 0}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {a.savingAll ? 'Saving all...' : `Save all (${dirtyCount})`}
            </button>
          </div>
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2">Variant</th>
              <th className="px-3 py-2 text-right">On hand</th>
              <th className="px-3 py-2">Delta</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {targetVariants.map((v) => {
              const row = a.rows[v.id];
              const saving = a.savingIds.has(v.id);
              const error = a.rowErrors[v.id];
              return (
                <tr key={v.id} className="border-b border-gray-100 align-top last:border-0">
                  <td className="px-3 py-2 text-gray-700">
                    {v.colour} / {v.size}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">{v.stockOnHand}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={a.presets.includes(Number(row?.delta)) ? row?.delta : ''}
                        onChange={(e) => a.applyPreset(v.id, Number(e.target.value))}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                      >
                        <option value="" disabled>
                          Preset...
                        </option>
                        {a.presets.map((preset) => (
                          <option key={preset} value={preset}>
                            {preset > 0 ? `+${preset}` : preset}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={row?.delta ?? ''}
                        onChange={(e) => a.setRowField(v.id, { delta: e.target.value })}
                        placeholder="or type"
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row?.reason ?? 'CORRECTION'}
                      onChange={(e) => a.setRowField(v.id, { reason: e.target.value as typeof row.reason })}
                      className="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {a.reasons.map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0) + r.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      rows={2}
                      value={row?.note ?? ''}
                      onChange={(e) => a.setRowField(v.id, { note: e.target.value })}
                      className="w-72 resize-none rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => a.saveRow(v.id)}
                      disabled={saving}
                      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}

function AdjustmentHistoryModal({ a }: { a: ReturnType<typeof useAdjustments> }) {
  return (
    <ModalShell title="Adjustment history" onClose={a.closeHistory} wide>
      {a.loadingHistory ? (
        <p className="py-6 text-center text-sm text-gray-400">Loading...</p>
      ) : a.history.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No adjustments recorded yet.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
          {a.history.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0 truncate text-gray-700">
                {row.colour} / {row.size} · {row.reason.toLowerCase()} {row.note ? `— ${row.note}` : ''}
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
