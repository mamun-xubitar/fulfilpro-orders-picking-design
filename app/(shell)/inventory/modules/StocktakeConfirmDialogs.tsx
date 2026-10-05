'use client';

import { MODAL_FOOTER_BTN_DANGER, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import { formatStocktakeNumber } from '@/lib/inventory/stocktake-number';
import { SPINNER, WIZARD_BTN_FINISH } from './modalStyles';
import type { StocktakeDetailState } from './hooks/useStocktakeDetail';

/** The two "are you sure?" dialogs of the count modal — sync into stock, and cancel. */
export default function StocktakeConfirmDialogs({ detail }: { detail: StocktakeDetailState }) {
  const syncable = detail.tallies.filter((t) => !t.partial);
  const adjusting = syncable.filter((t) => t.counted !== t.system).length;
  const skipped = detail.tallies.length - syncable.length;

  return (
    <>
      {detail.syncOpen && detail.record && (
        <ModalShell
          title={`Sync ${formatStocktakeNumber(detail.record.number)} to system?`}
          onClose={detail.closeSync}
          compact
          elevated
          maxWidthClass="max-w-[440px]"
          disableBackdropClose={detail.syncing}
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={detail.closeSync} disabled={detail.syncing} className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}>
                Cancel
              </button>
              <button type="button" onClick={detail.sync} disabled={detail.syncing} className={`flex-1 ${WIZARD_BTN_FINISH}`}>
                {detail.syncing && SPINNER}
                {detail.syncing ? 'Syncing...' : 'Sync to system'}
              </button>
            </div>
          }
        >
          <p className="text-[12px] text-inventory-text-muted">
            Stock on hand is set to the counted total for{' '}
            <strong className="font-semibold text-inventory-text">
              {adjusting} variant{adjusting === 1 ? '' : 's'}
            </strong>
            . This replaces the current system quantity and can&apos;t be undone from here.
          </p>
          {skipped > 0 && (
            <p className="mt-2 text-[11px] text-inventory-warning-ink">
              {skipped} partial variant{skipped === 1 ? '' : 's'} will be skipped — every location must be counted to sync a variant.
            </p>
          )}
        </ModalShell>
      )}

      {detail.cancelTarget && (
        <ModalShell
          title={`Cancel ${formatStocktakeNumber(detail.cancelTarget.number)}?`}
          onClose={detail.closeCancel}
          compact
          elevated
          maxWidthClass="max-w-[420px]"
          disableBackdropClose={detail.cancelling}
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={detail.closeCancel} disabled={detail.cancelling} className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}>
                Keep it
              </button>
              <button type="button" onClick={detail.confirmCancel} disabled={detail.cancelling} className={`flex-1 ${MODAL_FOOTER_BTN_DANGER}`}>
                {detail.cancelling ? 'Cancelling...' : 'Cancel stocktake'}
              </button>
            </div>
          }
        >
          <p className="text-[12px] text-inventory-text-muted">The counts entered so far are kept for the record, but nothing will be synced to stock.</p>
        </ModalShell>
      )}
    </>
  );
}
