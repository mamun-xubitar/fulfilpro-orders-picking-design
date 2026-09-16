'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { ModalShell } from '@/components/ModalShell';

const LINE_HEIGHT_EM = 1.5;
const MAX_LINES = 10;

type ClampedHtmlProps = {
  /** Already-sanitized-on-save HTML — re-sanitized here too since this also feeds the "See
   * more" modal's dangerouslySetInnerHTML. */
  html: string;
  className?: string;
  /** Title for the "See more" modal. */
  title?: string;
};

/** Clamps sanitized HTML to 10 lines and reveals a "See more" button — only when the content
 * actually overflows — that opens the full HTML in a modal. Doesn't use Tailwind's
 * `line-clamp-*`: that needs `display:-webkit-box`, which collapses the block children (`<p>`,
 * `<ul>`) this HTML actually contains. Measures with ResizeObserver so it re-checks on width and
 * content changes instead of only once on mount. */
export default function ClampedHtml({ html, className, title }: ClampedHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const safeHtml = sanitizeHtml(html);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [safeHtml]);

  return (
    <div className="min-w-0">
      <div className="relative">
        <div
          ref={containerRef}
          className={className ?? 'rounded-lg border border-inventory-border bg-inventory-surface-muted px-2.5 py-2 text-[13px] text-inventory-text [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4 [&_a]:text-inventory-secondary [&_a]:underline'}
          style={{ overflow: 'hidden', lineHeight: `${LINE_HEIGHT_EM}em`, maxHeight: `${LINE_HEIGHT_EM * MAX_LINES}em` }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
        {overflowing && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-end justify-end bg-gradient-to-t from-inventory-surface-muted to-transparent pr-2.5 text-[13px] font-semibold text-inventory-text-subtle"
          >
            …
          </span>
        )}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-1 text-[12px] font-semibold text-inventory-secondary hover:text-inventory-secondary-hover cursor-pointer"
        >
          See more
        </button>
      )}
      {modalOpen && (
        <ModalShell disableBackdropClose title={title ?? 'Description'} compact onClose={() => setModalOpen(false)} wide>
          <div
            className="text-[13px] text-inventory-text [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4 [&_a]:text-inventory-secondary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </ModalShell>
      )}
    </div>
  );
}
