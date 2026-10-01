'use client';

import { ModalShell } from '@/components/ModalShell';
import type { useAdjustments } from './hooks/useAdjustments';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import AnimatedStepBody from './newProduct/AnimatedStepBody';
import type { VariantRow } from './types';
import { formatDate, variantTitle } from './utils';

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
    <ModalShell disableBackdropClose
      title="New stock adjustment"
      compact
      onClose={a.closeModal}
      wide
      maxWidthClass="max-w-[720px]"
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-inventory-text-subtle">{a.dirtyCount} row{a.dirtyCount === 1 ? '' : 's'} with a pending change</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={a.closeModal}
              className={WIZARD_BTN_SECONDARY}
            >
              Close
            </button>
            <button
              type="button"
              onClick={a.saveAll}
              disabled={a.savingAll || a.dirtyCount === 0}
              className={WIZARD_BTN_PRIMARY}
            >
              {a.savingAll ? (
                <>
                  {SPINNER}
                  Saving all…
                </>
              ) : (
                `Save all (${a.dirtyCount})`
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className={WIZARD_CARD_CLASS}>
        <AnimatedStepBody minHeightClassName="min-h-0">
          <AdjustmentChipsStrip a={a} />

          <div className="max-h-[calc(60vh/var(--page-zoom,1))] overflow-x-auto overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
            <table className="w-full min-w-[560px] border-collapse text-[11px] leading-none">
              <thead className="sticky top-0 bg-inventory-surface-muted">
                <tr className="border-b border-inventory-border text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                  <th className="w-8 px-2 py-1">
                    <input
                      type="checkbox"
                      checked={a.allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = a.someSelected;
                      }}
                      onChange={a.toggleSelectAll}
                      aria-label="Select all rows"
                      className="h-3 w-3 cursor-pointer accent-inventory-primary"
                    />
                  </th>
                  <th className="whitespace-nowrap px-2 py-1">Variant</th>
                  <th className="whitespace-nowrap px-2 py-1 text-right">On hand</th>
                  <th className="whitespace-nowrap px-2 py-1">Adjustment</th>
                  <th className="whitespace-nowrap px-2 py-1">Reason</th>
                  <th className="whitespace-nowrap px-2 py-1">Note</th>
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
        </AnimatedStepBody>
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
      className={`mb-2 rounded-[7px] border border-inventory-border bg-inventory-surface-muted p-2 transition-opacity duration-150 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <p className="mb-1.5 text-[11px] font-medium text-inventory-text-muted">
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
                ? 'border-inventory-success/30 bg-inventory-success/10 text-inventory-success-hover hover:bg-inventory-success/15'
                : 'border-inventory-danger/30 bg-inventory-danger/10 text-inventory-danger-hover hover:bg-inventory-danger/15'
            }`}
          >
            {preset > 0 ? `+${preset}` : preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => a.applyChip(null)}
          className="rounded-full border border-inventory-border-strong bg-inventory-surface px-2 py-0.5 text-[11px] font-semibold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
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
    <tr className="border-b border-inventory-divider align-top last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover">
      <td className="px-2 py-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => a.toggleSelect(v.id)}
          aria-label={`Select ${variantTitle(v)}`}
          className="h-3 w-3 cursor-pointer accent-inventory-primary"
        />
      </td>
      <td className="px-2 py-1 text-inventory-text-muted">{variantTitle(v)}</td>
      <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{v.stockOnHand}</td>
      <td className="px-2 py-1">
        <input
          type="number"
          value={row?.delta ?? ''}
          onChange={(e) => a.setRowField(v.id, { delta: e.target.value })}
          placeholder="0"
          className="h-[22px] w-16 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
        />
        {error && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{error}</p>}
      </td>
      <td className="px-2 py-1">
        <select
          value={row?.reason ?? 'CORRECTION'}
          onChange={(e) => a.setRowField(v.id, { reason: e.target.value as typeof row.reason })}
          className="h-[22px] w-28 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
        >
          {a.reasons.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1">
        <input
          type="text"
          value={row?.note ?? ''}
          onChange={(e) => a.setRowField(v.id, { note: e.target.value.toUpperCase() })}
          placeholder="Add note..."
          className="h-[22px] w-40 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] uppercase leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:normal-case"
        />
      </td>
      <td className="px-2 py-1 text-right">
        <button
          type="button"
          onClick={() => a.saveRow(v.id)}
          disabled={saving}
          className="h-[22px] rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-2 text-[10px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

function AdjustmentHistoryModal({ a }: { a: ReturnType<typeof useAdjustments> }) {
  return (
    <ModalShell disableBackdropClose title="Adjustment history" compact onClose={a.closeHistory} wide>
      {a.loadingHistory ? (
        <p className="py-6 text-center text-[11px] text-inventory-text-subtle">Loading...</p>
      ) : a.history.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-inventory-text-subtle">No adjustments recorded yet.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-inventory-divider overflow-y-auto thin-scroll">
          {a.history.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 py-1.5 text-[11px]">
              <span className="min-w-0 truncate text-inventory-text-muted">
                {variantTitle(row)} · {row.reason.toLowerCase()} {row.note ? `— ${row.note}` : ''}
              </span>
              <span className={`shrink-0 font-semibold tabular-nums ${row.delta > 0 ? 'text-inventory-success-hover' : 'text-inventory-danger'}`}>
                {row.delta > 0 ? '+' : ''}
                {row.delta} <span className="font-normal text-inventory-text-subtle">· {formatDate(row.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}
