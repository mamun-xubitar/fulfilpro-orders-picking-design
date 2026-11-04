'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon } from '../queue/icons';

type DialogShellProps = {
  title: string;
  /** Small grey line under the title (order number, line count …). */
  sub?: ReactNode;
  /** Card width in px (the prototype sizes each dialog to its content: 300 – 520). */
  width?: number;
  onClose: () => void;
  /** Block closing (Escape, backdrop, ✕) while a request is running. */
  busy?: boolean;
  footer?: ReactNode;
  /** Let a dropdown inside the body extend past the card (the variant picker). */
  allowOverflow?: boolean;
  children: ReactNode;
};

/** Shell of every dialog opened from the Orders page (prototype `.dlg` / `.dh` / `.db` / `.df`): 12px radius card,
 * 13px bold title with a grey sub line, 11.5px body, grey footer with right-aligned actions. */
export default function DialogShell({ title, sub, width = 460, onClose, busy = false, footer, allowOverflow = false, children }: DialogShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);
  const close = () => { if (!busy) onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-4" role="dialog" aria-modal="true" aria-label={title} onClick={close}>
      <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-xl border border-orders-border-strong bg-orders-surface text-[11.5px] text-orders-text-body shadow-orders-md" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-orders-divider px-3 py-2.5">
          <div className="min-w-0">
            <b className="block truncate text-[13px] text-orders-text">{title}</b>
            {sub && <span className="block text-[10.5px] text-orders-text-subtle">{sub}</span>}
          </div>
          <button type="button" aria-label="Close" disabled={busy} onClick={close} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-orders-text-subtle hover:bg-orders-divider hover:text-orders-text disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"><Icon name="close" className="h-3.5 w-3.5" /></button>
        </div>
        <div className={`allow-copy min-h-0 flex-1 px-3 py-2.5 ${allowOverflow ? 'overflow-visible' : 'overflow-y-auto'}`}>{children}</div>
        {footer && <div className="flex shrink-0 justify-end gap-1.5 rounded-b-xl border-t border-orders-border bg-orders-surface-muted px-3 py-[9px]">{footer}</div>}
      </div>
    </div>
  );
}
