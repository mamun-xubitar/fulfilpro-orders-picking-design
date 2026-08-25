'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
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
  return (
    <ModalShell
      title="New stock adjustment"
      onClose={a.closeModal}
      footer={<ModalActions onCancel={a.closeModal} onConfirm={a.submit} confirmLabel={a.saving ? 'Saving...' : 'Save adjustment'} disabled={a.saving} />}
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Variant</label>
          <select
            value={a.variantId}
            onChange={(e) => a.setVariantId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.colour} / {v.size} — {v.stockOnHand} on hand
              </option>
            ))}
          </select>
          {a.errors.variantId && <p className="mt-1 text-xs text-red-600">{a.errors.variantId}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Quantity change</label>
          <input
            type="number"
            value={a.delta}
            onChange={(e) => a.setDelta(e.target.value)}
            placeholder="e.g. -3 or 5"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          {a.errors.delta && <p className="mt-1 text-xs text-red-600">{a.errors.delta}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
          <select
            value={a.reason}
            onChange={(e) => a.setReason(e.target.value as typeof a.reason)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          >
            {a.reasons.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
          <textarea
            rows={2}
            value={a.note}
            onChange={(e) => a.setNote(e.target.value)}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
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
