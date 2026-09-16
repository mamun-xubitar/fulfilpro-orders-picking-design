'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { ModalShell } from '@/components/ModalShell';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { FieldLabel } from './ProductFieldRows';
import RichTextField from './RichTextField';
import { Refresh, Sparkles } from './icons';

/** Gray-bordered AI control sized to sit at the right end of the editor toolbar
 * (same 24px footprint as the formatting buttons) — neutral deep gray so it matches
 * the prototype's monochrome toolbar. */
const AI_BUTTON =
  'flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const AI_GROUP = 'flex items-center gap-0.5 rounded-lg border border-gray-300 bg-gray-50 p-0.5';
const AI_GROUP_ICON_BUTTON =
  'flex h-6 w-6 items-center justify-center rounded-md text-gray-700 transition-colors duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

type AiDescriptionFieldProps = {
  /** The live HTML value this field edits — the caller's own draft/form field. */
  value: string;
  onChange: (html: string) => void;
  /** Everything the generation endpoint needs *except* `description` — built at click time (not
   * memoized) so a generate/regenerate request reflects whatever the caller's draft currently
   * holds rather than a stale snapshot from when this component mounted. This component supplies
   * `description` itself (the field's current text on first generate, or the stowed "Original" on
   * regenerate), since which description to send depends on state only it owns. */
  buildRequestData: () => Record<string, unknown>;
  /** Identifies what `value` belongs to — a product id for the Product details panel, or a
   * `storeId` for a per-store publish/bulk-update draft. The Original/Generated/Regenerate state
   * below is tagged with this the same way useProductDetails tags its own draft with a productId
   * (see saved/draft there), so switching subjects — product navigation, or simply which store's
   * block this instance belongs to — never leaks one subject's AI draft onto another's field. */
  subjectKey: string;
  /** Shows the "Show Details" button in the header and fixes the editor height with an inner
   * scroll. Only for the Product details panel — never the New Product wizard or per-store drafts. */
  showDetailsButton?: boolean;
};

/**
 * Self-contained AI description control: owns its own request, its own Original/Generated draft
 * state, and wraps RichTextField. Nothing here is persisted by itself — whichever draft is active
 * is just the field's live value, saved however the caller's own Save action works. Used by
 * DescriptionField (Product details / New product wizard) and directly by StoreDraftDetails
 * (Online stores & prices / Bulk update) — each mounted instance is independent, so several store
 * blocks can generate concurrently without interfering with each other.
 */
export default function AiDescriptionField({ value, onChange, buildRequestData, subjectKey, showDetailsButton }: AiDescriptionFieldProps) {
  const { request: requestAi, loading: aiGenerating } = useRequest<{ description: string }>();
  // Original/Generated are two independent drafts of the description, tagged with the subject
  // they belong to so switching subjects drops them without an effect having to reset anything —
  // same pattern as useProductDetails' own `draft`/`ai` state. Switching the active slot stows the
  // other draft's edits rather than discarding them (see setActive). `generatedBaseline` is the
  // raw AI output, untouched by stowing/hand-edits, so regenerate can detect an unsaved edit
  // regardless of which tab is active.
  const [ai, setAi] = useState<{
    subjectKey: string;
    active: 'original' | 'generated';
    original: string;
    generated: string;
    generatedBaseline: string;
  } | null>(null);
  const effectiveAi = ai && ai.subjectKey === subjectKey ? ai : null;

  // Latest-subject ref for the request callbacks below, which are created at click time but must
  // check whether the admin has since switched subjects (product navigation, or a different
  // store's block) before acting — a response for a subject that's no longer showing must not
  // clobber whatever's now on screen. Kept current via effect rather than during render, per
  // react-hooks/refs rules; effectively synchronous for this purpose since it only needs to be
  // current by the time a network response lands. Mirrors useProductDetails' productRef.
  const subjectRef = useRef(subjectKey);
  useEffect(() => {
    subjectRef.current = subjectKey;
  }, [subjectKey]);

  /** First generation — snapshots the description on screen as "Original", writes the AI result
   * into both "Generated" and the live field, and switches the icon into the Original/Generated/
   * Regenerate group. */
  const generate = () => {
    const key = subjectKey;
    const original = value;
    requestAi({
      url: '/api/inventory/ai/product-description',
      method: 'POST',
      showToast: false,
      data: { ...buildRequestData(), description: original },
      onSuccess: ({ data }) => {
        if (subjectRef.current !== key) return; // admin switched subjects while this was in flight
        setAi({ subjectKey: key, active: 'generated', original, generated: data.description, generatedBaseline: data.description });
        onChange(data.description);
      },
      onError: (err) => toast.error(err.general || 'Failed to generate description'),
    });
  };

  /** Switches which draft is live in the field. Stows the outgoing draft's current text (which
   * may have been hand-edited since generation) before swapping in the other one, so neither
   * draft loses edits by switching back and forth. */
  const setActive = (next: 'original' | 'generated') => {
    if (!effectiveAi || effectiveAi.active === next) return;
    const stowed = { ...effectiveAi, [effectiveAi.active]: value, active: next };
    setAi(stowed);
    onChange(stowed[next]);
  };

  /** Re-requests a Generated draft from the current Original text. Confirms first if the admin
   * has hand-edited the Generated draft since it was last produced, since this overwrites it. */
  const regenerate = () => {
    if (!effectiveAi) return;
    const currentGenerated = effectiveAi.active === 'generated' ? value : effectiveAi.generated;
    const hasUnsavedEdit = currentGenerated !== effectiveAi.generatedBaseline;
    if (hasUnsavedEdit && !window.confirm('Regenerating will discard your edits to the generated description. Continue?')) return;
    const key = subjectKey;
    const original = effectiveAi.active === 'original' ? value : effectiveAi.original;
    requestAi({
      url: '/api/inventory/ai/product-description',
      method: 'POST',
      showToast: false,
      data: { ...buildRequestData(), description: original },
      onSuccess: ({ data }) => {
        if (subjectRef.current !== key) return; // admin switched subjects while this was in flight
        setAi({ subjectKey: key, active: 'generated', original, generated: data.description, generatedBaseline: data.description });
        onChange(data.description);
      },
      onError: (err) => toast.error(err.general || 'Failed to regenerate description'),
    });
  };

  const [detailsOpen, setDetailsOpen] = useState(false);

  const toolbarEnd = !effectiveAi ? (
    <button
      type="button"
      onClick={generate}
      disabled={aiGenerating}
      title="Generate a description with AI"
      aria-label="Generate a description with AI"
      className={AI_BUTTON}
    >
      {aiGenerating ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
    </button>
  ) : (
    <div className={AI_GROUP}>
      <SegmentButton active={effectiveAi.active === 'original'} disabled={aiGenerating} onClick={() => setActive('original')}>
        Original
      </SegmentButton>
      <SegmentButton active={effectiveAi.active === 'generated'} disabled={aiGenerating} onClick={() => setActive('generated')}>
        Generated
      </SegmentButton>
      <button
        type="button"
        onClick={regenerate}
        disabled={aiGenerating}
        title="Regenerate"
        aria-label="Regenerate description"
        className={AI_GROUP_ICON_BUTTON}
      >
        {aiGenerating ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        ) : (
          <Refresh className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <FieldLabel>Description</FieldLabel>
        {showDetailsButton && (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="shrink-0 text-[11px] font-semibold leading-none text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Show Details
          </button>
        )}
      </div>
      <div className="relative">
        <RichTextField label="Description" value={value} onChange={onChange} hideLabel toolbarEnd={toolbarEnd} fixedHeight={showDetailsButton} />
        {aiGenerating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 shadow-sm">
              <span className="h-3 w-3 animate-pulse rounded-full bg-gray-500" />
              Generating…
            </div>
          </div>
        )}
      </div>
      {detailsOpen && (
        <ModalShell title="Description" compact wide onClose={() => setDetailsOpen(false)}>
          {value ? (
            <div
              className="text-[13px] text-gray-900 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4 [&_a]:text-blue-600 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
            />
          ) : (
            <p className="text-[13px] text-gray-400">—</p>
          )}
        </ModalShell>
      )}
    </div>
  );
}

function SegmentButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}
