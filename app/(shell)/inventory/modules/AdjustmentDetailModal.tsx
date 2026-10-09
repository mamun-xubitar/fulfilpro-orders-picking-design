'use client';

import { ModalShell } from '@/components/ModalShell';
import { formatAdjustmentNumber } from '@/lib/inventory/adjustment-number';
import { AdjustmentNumber, NetQty, ReasonBadge, REASON_LABELS } from './AdjustmentBits';
import { locationChipClass } from './LocationPickerMenu';
import type { AdjustmentDetailState } from './hooks/useAdjustmentDetail';
import { Bone, SkeletonRows } from './Skeleton';
import { WIZARD_BODY_CLASS, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import { formatDate, variantTitle } from './utils';

type AdjustmentDetailModalProps = { detail: AdjustmentDetailState; onOpenProduct: (productId: string) => void };

/** One adjustment in full: who made it and when, and every variant line it changed. */
export default function AdjustmentDetailModal({ detail, onOpenProduct }: AdjustmentDetailModalProps) {
  if (!detail.open) return null;
  const adjustment = detail.detail;
  // Old adjustments and non-admins have no stock-on-hand figure, so the Before / After columns drop out.
  const showStock = !!adjustment?.lines.some((l) => l.stockBefore !== null);

  return (
    <ModalShell
      disableBackdropClose
      elevated
      compact
      wide
      maxWidthClass="max-w-[720px]"
      title={adjustment ? `Adjustment ${formatAdjustmentNumber(adjustment.number)}` : 'Adjustment'}
      onClose={detail.close}
      bodyClassName={`${WIZARD_BODY_CLASS} !overflow-y-hidden`}
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={detail.close} className={WIZARD_BTN_SECONDARY}>
            Close
          </button>
        </div>
      }
    >
      <div className={WIZARD_CARD_CLASS}>
        {!adjustment ? (
          <DetailSkeleton />
        ) : (
          <>
            <dl className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-4">
              <Field label="Adjustment">
                <AdjustmentNumber adjustment={adjustment} />
              </Field>
              <Field label="Date">{formatDate(adjustment.createdAt)}</Field>
              <Field label="By">{adjustment.actorName}</Field>
              <Field label="Net change">
                <NetQty value={adjustment.netQty} />
              </Field>
              <Field label="Product">
                <button
                  type="button"
                  onClick={() => {
                    detail.close();
                    onOpenProduct(adjustment.supplierProductId);
                  }}
                  title={`Open ${adjustment.productName} in Variants`}
                  className="block max-w-full truncate text-left font-medium text-inventory-secondary underline-offset-2 hover:underline cursor-pointer"
                >
                  {adjustment.productName}
                </button>
                <span className="block text-[9.5px] text-inventory-text-subtle">{adjustment.itemNo}</span>
              </Field>
              <Field label="Reason">
                <ReasonBadge reason={adjustment.reason} />
              </Field>
            </dl>

            <div className="max-h-[calc((100dvh_-_20rem)/var(--page-zoom,1))] overflow-auto thin-scroll rounded-lg border border-inventory-border">
              <table className="w-full min-w-[520px] border-collapse text-[11px] leading-none">
                <thead className="sticky top-0 bg-inventory-surface-muted">
                  <tr className="border-b border-inventory-border text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                    <th className="whitespace-nowrap px-2 py-1">Variant</th>
                    <th className="whitespace-nowrap px-2 py-1">SKU</th>
                    <th className="whitespace-nowrap px-2 py-1">Location</th>
                    {showStock && <th className="whitespace-nowrap px-2 py-1 text-right">Before</th>}
                    <th className="whitespace-nowrap px-2 py-1 text-right">Change</th>
                    {showStock && <th className="whitespace-nowrap px-2 py-1 text-right">After</th>}
                    <th className="whitespace-nowrap px-2 py-1">Reason</th>
                    <th className="whitespace-nowrap px-2 py-1">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustment.lines.map((line) => (
                    <tr key={line.id} className="border-b border-inventory-divider last:border-0 hover:bg-inventory-surface-hover">
                      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text">{variantTitle(line)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{line.sku ?? '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        {line.locationName ? (
                          <span className={`inline-flex items-center rounded-[4px] border px-[4px] py-[1px] text-[9px] font-semibold ${locationChipClass(line.locationId ?? line.locationName)}`}>
                            {line.locationName}
                          </span>
                        ) : (
                          <span className="text-inventory-text-subtle">—</span>
                        )}
                      </td>
                      {showStock && <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{line.stockBefore ?? '—'}</td>}
                      <td className="px-2 py-1.5 text-right">
                        <NetQty value={line.delta} />
                      </td>
                      {showStock && <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{line.stockBefore === null ? '—' : line.stockBefore + line.delta}</td>}
                      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-muted">{REASON_LABELS[line.reason] ?? line.reason}</td>
                      <td className="max-w-[200px] px-2 py-1.5 text-inventory-text-muted">
                        <span className="block truncate" title={line.note ?? undefined}>
                          {line.note || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-[2px] text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">{label}</dt>
      <dd className="text-inventory-text">{children}</dd>
    </div>
  );
}

/** Mirrors the loaded modal: the six-field header grid, then the lines table (Before / After are
 * left out because whether they exist is only known once the adjustment arrives). */
function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading adjustment">
      <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-[6px]">
            <Bone className="h-[8px] w-14" />
            <Bone className="h-[11px] w-[70%] max-w-[140px]" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-inventory-border">
        <table className="w-full min-w-[520px] border-collapse text-[11px] leading-none">
          <thead className="bg-inventory-surface-muted">
            <tr className="border-b border-inventory-border text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
              <th className="px-2 py-1">Variant</th>
              <th className="px-2 py-1">SKU</th>
              <th className="px-2 py-1">Location</th>
              <th className="px-2 py-1 text-right">Change</th>
              <th className="px-2 py-1">Reason</th>
              <th className="px-2 py-1">Note</th>
            </tr>
          </thead>
          <tbody>
            <SkeletonRows rows={4} cells={['text', 'text', 'badge', 'num', 'text', 'text']} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
