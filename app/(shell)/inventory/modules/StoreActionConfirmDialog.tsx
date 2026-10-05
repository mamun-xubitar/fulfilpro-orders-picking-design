'use client';

import { ModalShell } from '@/components/ModalShell';
import type { StoreActionConfirm } from './hooks/useStoreActionConfirm';

/** The "are you sure?" for a bulk or destructive store edit (delete a colour's images, every image,
 * a variant; replace the whole gallery). Stacks above the differences modal (`elevated`). Stays open
 * and busy until the action settles, so the admin sees it finish rather than the dialog vanishing
 * mid-request. */
export default function StoreActionConfirmDialog({ confirm }: { confirm: StoreActionConfirm }) {
  const { pending, running } = confirm;
  if (!pending) return null;
  const danger = pending.tone === 'danger';

  return (
    <ModalShell
      title={pending.title}
      onClose={confirm.cancel}
      compact
      elevated
      maxWidthClass="max-w-[420px]"
      disableBackdropClose={running}
      footer={
        <div className="flex justify-end gap-[6px]">
          <button
            type="button"
            onClick={confirm.cancel}
            disabled={running}
            className="flex h-[26px] items-center rounded-[7px] border border-inventory-border-strong px-[12px] text-[11px] font-bold text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm.confirm}
            disabled={running}
            autoFocus
            className={`flex h-[26px] items-center gap-[6px] rounded-[7px] px-[12px] text-[11px] font-bold text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
              danger ? 'bg-inventory-danger hover:bg-inventory-danger-hover' : 'bg-inventory-primary hover:bg-inventory-primary-hover'
            }`}
          >
            {running && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {running ? 'Working…' : pending.confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-[12px] leading-relaxed text-inventory-text-muted">{pending.body}</p>
    </ModalShell>
  );
}
