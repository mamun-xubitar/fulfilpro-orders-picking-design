'use client';

export function ModalShell({
  title,
  onClose,
  children,
  footer,
  allowOverflow,
  wide,
  extraWide,
  fullScreen,
  elevated,
  bodyClassName,
  disableBackdropClose,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  allowOverflow?: boolean;
  wide?: boolean;
  /** For content that needs more than `wide`'s max-w-2xl — e.g. a table of rows. */
  extraWide?: boolean;
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
}) {
  return (
    <div
      className={`fixed inset-0 ${elevated ? 'z-[60]' : 'z-50'} flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0`}
      role="dialog"
      aria-modal="true"
      onClick={disableBackdropClose ? undefined : onClose}
    >
      <div
        className={`w-full ${fullScreen ? 'max-w-[95vw]' : extraWide ? 'max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-md'} rounded-lg border border-gray-200 bg-white shadow-xl ${allowOverflow ? 'overflow-visible' : `overflow-hidden flex flex-col ${fullScreen ? 'h-[92dvh]' : 'max-h-[calc(100dvh-2rem)]'}`}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
