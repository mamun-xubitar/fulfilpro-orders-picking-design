'use client';

import { ModalShell } from '@/components/ModalShell';
import type { useAdjustments } from './hooks/useAdjustments';
import { SkeletonRows } from './Skeleton';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import AnimatedStepBody from './newProduct/AnimatedStepBody';
import { AdjustmentNumber, NetQty, ReasonBadge, VIEW_BTN } from './AdjustmentBits';
import type { VariantRow } from './types';
import { adjustTarget, formatDate, variantTitle } from './utils';

type AdjustmentModalsProps = { adjustments: ReturnType<typeof useAdjustments>; variants: VariantRow[]; onView: (id: string) => void };

export default function AdjustmentModals({ adjustments: a, variants, onView }: AdjustmentModalsProps) {
  return (
    <>
      {a.modalOpen && <NewAdjustmentModal a={a} variants={variants} />}
      {a.historyOpen && <AdjustmentHistoryModal a={a} onView={onView} />}
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
      maxWidthClass="max-w-[820px]"
      bodyClassName={`${WIZARD_BODY_CLASS} !overflow-y-hidden`}
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
          <AdjustmentLocationField a={a} />
          <AdjustmentChipsStrip a={a} />

          <div className="max-h-[calc((100dvh_-_20rem)/var(--page-zoom,1))] overflow-x-auto overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
            <table className="w-full min-w-[660px] border-collapse text-[11px] leading-none">
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
                  <th className="whitespace-nowrap px-2 py-1">Location</th>
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

/** The one location every row in the modal adjusts. Variants kept only elsewhere are disabled in
 * the table; variants with no location adjust their unassigned stock whatever is picked. */
function AdjustmentLocationField({ a }: { a: ReturnType<typeof useAdjustments> }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label htmlFor="adjustment-location" className="text-[11px] font-semibold text-inventory-text-muted">
        Location
      </label>
      {a.locationOptions.length > 0 ? (
        <select
          id="adjustment-location"
          value={a.locationId}
          onChange={(e) => a.setLocationId(e.target.value)}
          className="h-[22px] w-44 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
        >
          {a.locationOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-[11px] text-inventory-text-subtle">Unassigned stock — these variants have no location</span>
      )}
    </div>
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
  // "On hand" is the stock at the modal's location; a variant kept elsewhere only can't be adjusted.
  const target = adjustTarget(v, a.locationId);
  const absent = target.kind === 'absent';
  const locationName = a.locationOptions.find((l) => l.id === a.locationId)?.name;

  return (
    <tr className={`border-b border-inventory-divider align-top last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover ${absent ? 'opacity-50' : ''}`}>
      <td className="px-2 py-1">
        <input
          type="checkbox"
          checked={selected}
          disabled={absent}
          onChange={() => a.toggleSelect(v.id)}
          aria-label={`Select ${variantTitle(v)}`}
          className="h-3 w-3 cursor-pointer accent-inventory-primary"
        />
      </td>
      <td className="px-2 py-1 text-inventory-text-muted">{variantTitle(v)}</td>
      <td className="whitespace-nowrap px-2 py-1 text-inventory-text-subtle">
        {target.kind === 'location' ? target.name : target.kind === 'unassigned' ? <span title="No location — adjusts the unassigned stock">Unassigned</span> : `Not at ${locationName ?? 'this location'}`}
      </td>
      <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{target.kind === 'location' ? target.quantity : target.kind === 'unassigned' ? v.stockOnHand : '—'}</td>
      <td className="px-2 py-1">
        <input
          type="number"
          value={row?.delta ?? ''}
          onChange={(e) => a.setRowField(v.id, { delta: e.target.value })}
          disabled={absent}
          placeholder="0"
          className="h-[22px] w-16 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
        />
        {error && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{error}</p>}
      </td>
      <td className="px-2 py-1">
        <select
          value={row?.reason ?? 'CORRECTION'}
          disabled={absent}
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
          disabled={absent}
          onChange={(e) => a.setRowField(v.id, { note: e.target.value.toUpperCase() })}
          placeholder="Add note..."
          className="h-[22px] w-40 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] uppercase leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:normal-case"
        />
      </td>
      <td className="px-2 py-1 text-right">
        <button
          type="button"
          onClick={() => a.saveRow(v.id)}
          disabled={saving || absent}
          className="h-[22px] rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-2 text-[10px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

function AdjustmentHistoryModal({ a, onView }: { a: ReturnType<typeof useAdjustments>; onView: (id: string) => void }) {
  return (
    <ModalShell disableBackdropClose title="Adjustment history" compact onClose={a.closeHistory} wide>
      {!a.loadingHistory && a.history.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-inventory-text-subtle">No adjustments recorded yet.</p>
      ) : (
        <div className="max-h-96 overflow-auto thin-scroll rounded-lg border border-inventory-border">
          <table className="w-full min-w-[460px] border-collapse text-[11px] leading-none">
            <thead className="sticky top-0 bg-inventory-surface-muted">
              <tr className="border-b border-inventory-border text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                <th className="px-2 py-1">Adjustment</th>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1 text-right">Variants</th>
                <th className="px-2 py-1 text-right">Net change</th>
                <th className="px-2 py-1">Reason</th>
                <th className="px-2 py-1">By</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody aria-busy={a.loadingHistory}>
              {a.loadingHistory ? (
                <SkeletonRows rows={5} cells={['text', 'text', 'num', 'num', 'badge', 'text', { kind: 'actions', count: 1 }]} />
              ) : (
                a.history.map((row) => (
                  <tr key={row.id} className="border-b border-inventory-divider last:border-0 hover:bg-inventory-surface-hover">
                    <td className="whitespace-nowrap px-2 py-1.5">
                      <AdjustmentNumber adjustment={row} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{formatDate(row.createdAt)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{row.lineCount}</td>
                    <td className="px-2 py-1.5 text-right">
                      <NetQty value={row.netQty} />
                    </td>
                    <td className="px-2 py-1.5">
                      <ReasonBadge reason={row.reason} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{row.actorName}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button type="button" onClick={() => onView(row.id)} aria-label={`View adjustment ${row.number}`} className={VIEW_BTN}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </ModalShell>
  );
}
