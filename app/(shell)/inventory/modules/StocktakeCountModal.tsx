'use client';

import { ModalShell } from '@/components/ModalShell';
import { formatStocktakeNumber } from '@/lib/inventory/stocktake-number';
import { locationChipClass } from './LocationPickerMenu';
import { STOCKTAKE_STATUS_LABELS } from './StocktakesTable';
import { Bone, SkeletonRows } from './Skeleton';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_FINISH, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import type { StocktakeDetailState } from './hooks/useStocktakeDetail';
import { formatDate, variantTitle } from './utils';

/** One stocktake: enter or review the counts; the admin also sees the comparison and syncs. */
export default function StocktakeCountModal({ detail }: { detail: StocktakeDetailState }) {
  const { record } = detail;
  if (!detail.open) return null;

  const canSync = detail.isAdmin && record?.status === 'COUNTED' && !detail.dirty;

  return (
    <ModalShell
      disableBackdropClose
      title={record ? `${formatStocktakeNumber(record.number)} — ${record.productName}` : 'Stocktake'}
      compact
      wide
      onClose={detail.close}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={detail.close} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Close
          </button>
          {detail.editable && detail.locked && (
            <button type="button" onClick={detail.startEdit} className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
              Edit count
            </button>
          )}
          {detail.editable && !detail.locked && (
            <button type="button" onClick={detail.save} disabled={detail.saving || !detail.dirty} className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
              {detail.saving && SPINNER}
              {detail.saving ? 'Saving...' : 'Save counts'}
            </button>
          )}
          {detail.isAdmin && record?.status === 'COUNTED' && (
            <button
              type="button"
              onClick={detail.openSync}
              disabled={!canSync}
              title={detail.dirty ? 'Save the counts first' : 'Set stock on hand to the counted quantities'}
              className={`flex-1 ${WIZARD_BTN_FINISH}`}
            >
              Sync to system
            </button>
          )}
        </div>
      }
    >
      {!record ? (
        <div className={WIZARD_CARD_CLASS} aria-busy="true" aria-label="Loading stocktake">
          <Bone className="mb-3 h-[10px] w-[70%] max-w-[420px]" />
          <div className="overflow-hidden rounded-lg border border-inventory-border">
            <table className="w-full border-collapse text-[11px] leading-none">
              <thead>
                <tr className="border-b border-inventory-border bg-inventory-surface-muted text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                  <th className="px-2 py-1">Colour / Size</th>
                  <th className="px-2 py-1">SKU</th>
                  <th className="px-2 py-1">Location</th>
                  {detail.isAdmin && <th className="px-2 py-1 text-right">Quantity</th>}
                  <th className="px-2 py-1 text-right">Counted</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonRows rows={6} cellClassName="px-2 py-1" cells={detail.isAdmin ? ['text', 'text', 'badge', 'num', 'input'] : ['text', 'text', 'badge', 'input']} />
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={WIZARD_CARD_CLASS}>
          <p className="mb-2 text-[12px] text-inventory-text-muted">
            <span className="font-semibold text-inventory-text">{STOCKTAKE_STATUS_LABELS[record.status]}</span> · {record.itemNo} · created {formatDate(record.createdAt)} by {record.startedByName}
            {detail.editable && !detail.locked && ' — enter what was counted on each line. Lines left blank stay uncounted.'}
          </p>
          <div className="max-h-80 overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
            <table className="w-full border-collapse text-[11px] leading-none">
              <thead>
                <tr className="border-b border-inventory-border bg-inventory-surface-muted text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                  <th className="px-2 py-1">Colour / Size</th>
                  <th className="px-2 py-1">SKU</th>
                  <th className="px-2 py-1">Location</th>
                  {detail.isAdmin && <th className="px-2 py-1 text-right">Quantity</th>}
                  <th className="px-2 py-1 text-right">Counted</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item) => (
                  <tr key={item.id} className="border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover">
                    <td className="px-2 py-1 text-inventory-text">{variantTitle(item)}</td>
                    <td className="px-2 py-1 text-inventory-text-subtle">{item.sku ?? '—'}</td>
                    <td className="px-2 py-1">
                      {item.locationName ? (
                        <span className={`inline-flex items-center rounded-[4px] border px-[4px] py-[1px] text-[9px] font-semibold ${locationChipClass(item.locationId ?? item.locationName)}`}>{item.locationName}</span>
                      ) : (
                        <span className="text-inventory-text-subtle">—</span>
                      )}
                    </td>
                    {detail.isAdmin && (
                      <td title={item.locationName ? `Stock at ${item.locationName} now` : 'Unassigned stock on hand now'} className="px-2 py-1 text-right tabular-nums text-inventory-text-muted">
                        {item.systemQty ?? '—'}
                      </td>
                    )}
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        min={0}
                        value={detail.counts[item.id] ?? ''}
                        onChange={(e) => detail.setCount(item.id, e.target.value)}
                        disabled={!detail.editable || detail.locked}
                        aria-label={`Counted for ${variantTitle(item)}${item.locationName ? ` at ${item.locationName}` : ''}`}
                        className="h-[22px] w-20 rounded-[7px] border border-inventory-border-strong pl-[6px] pr-[10px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring disabled:cursor-not-allowed disabled:bg-inventory-surface-muted"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
