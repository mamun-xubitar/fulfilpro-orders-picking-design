'use client';

export function ModalShell({
  title,
  onClose,
  children,
  footer,
  allowOverflow,
  wide,
  extraWide,
  maxWidthClass,
  fullScreen,
  elevated,
  bodyClassName,
  disableBackdropClose,
  compact,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  allowOverflow?: boolean;
  wide?: boolean;
  /** For content that needs more than `wide`'s max-w-2xl — e.g. a table of rows. */
  extraWide?: boolean;
  /** Exact max-width override (e.g. "max-w-[712px]") — wins over `wide`/`extraWide`/`fullScreen`
   * when a modal needs just a little more room than a preset gives. */
  maxWidthClass?: string;
  /** Near-viewport-filling — for editable, full-product-detail forms like the store publish and
   * bulk-update modals, which need more room than even `extraWide`. */
  fullScreen?: boolean;
  /** For a modal that can be opened from inside another ModalShell (e.g. "Add supplier" launched
   * from a supplier picker) — bumps the backdrop above the standard z-50 layer so it stacks on
   * top instead of behind. Stays under the shell's z-[65] blocking overlay. */
  elevated?: boolean;
  /** Extra classes appended to the scrolling body div — e.g. `thin-scroll` for a modal with a
   * long, densely-scrolled body (a large image gallery). */
  bodyClassName?: string;
  /** Suppresses the backdrop-click close — for multi-step flows holding unsaved work (e.g. the
   * New Product wizard), where an accidental click outside shouldn't discard progress. The header
   * close button and any explicit Cancel action still close normally. */
  disableBackdropClose?: boolean;
  /** Compact title bar for dense hub surfaces (inventory) — shorter padding, smaller
   * title and close button. */
  compact?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 ${elevated ? 'z-[60]' : 'z-50'} flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0`}
      role="dialog"
      aria-modal="true"
      onClick={disableBackdropClose ? undefined : onClose}
    >
      <div
        className={`w-full ${maxWidthClass ?? (fullScreen ? 'max-w-[95vw]' : extraWide ? 'max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-md')} rounded-lg border border-gray-200 bg-white shadow-xl ${allowOverflow ? 'overflow-visible' : `overflow-hidden flex flex-col ${fullScreen ? 'h-[92dvh]' : 'max-h-[calc(100dvh-2rem)]'}`}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 ${compact ? 'px-4 py-2' : 'px-5 py-4'}`}>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>{title}</h3>
          <button type="button" onClick={onClose} className={`rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer ${compact ? 'p-1' : 'p-1.5'}`} aria-label="Close">
            <svg className={compact ? 'h-4 w-4' : 'h-5 w-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`${allowOverflow ? 'px-5 py-4' : 'flex-1 overflow-y-auto px-5 py-4'} ${bodyClassName ?? ''}`}>{children}</div>
        {footer && <div className="shrink-0 border-t border-gray-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  danger,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
          danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

/** Shared inventory-modal footer buttons — one size everywhere (28px tall, 11px bold),
 * so footers stay consistent without per-file class duplication. Layouts stay with each
 * caller (split pairs, left/right alignment, extra labels) — only these sizing/skin
 * classes are shared. */
const MODAL_FOOTER_BTN_BASE =
  'h-[28px] rounded-[7px] px-3 text-[11px] font-bold leading-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

export const MODAL_FOOTER_BTN_SECONDARY =
  `${MODAL_FOOTER_BTN_BASE} border border-gray-300 bg-white text-gray-600 hover:bg-gray-50`;

export const MODAL_FOOTER_BTN_PRIMARY =
  `${MODAL_FOOTER_BTN_BASE} bg-blue-600 text-white hover:bg-blue-700`;

export const MODAL_FOOTER_BTN_DANGER =
  `${MODAL_FOOTER_BTN_BASE} bg-red-600 text-white hover:bg-red-700`;
