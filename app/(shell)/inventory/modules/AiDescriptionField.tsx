'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { FieldLabel } from './ProductFieldRows';
import RichTextField from './RichTextField';
import { Collapse, Expand, Refresh, Sparkles } from './icons';

/** Gray-bordered AI control sized to sit at the right end of the editor toolbar
 * (same 24px footprint as the formatting buttons) — neutral deep gray so it matches
 * the prototype's monochrome toolbar. Compact mode (`compactChrome`) shrinks it to the
 * toolbar's own 20px buttons so it still fits alongside the formatting controls. */
const AI_BUTTON =
  'flex items-center justify-center rounded-md border border-inventory-border-strong bg-inventory-surface text-inventory-text-muted shadow-sm transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const AI_GROUP = 'flex items-center gap-0.5 rounded-lg border border-inventory-border-strong bg-inventory-surface-muted p-0.5';
const AI_GROUP_ICON_BUTTON =
  'flex items-center justify-center rounded-md text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

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
  /** Collapses to a one-line toolbar + one-line body with an Expand button, which opens the full
   * editor over the panel. Only for the Product details panel — never the New Product wizard or
   * per-store drafts. */
  compact?: boolean;
  /** Suppresses the field's own "Description" label row — for a caller (e.g. StoreDiffFieldRow)
   * that already renders its own label alongside the store's current value. */
  hideLabel?: boolean;
};

/**
 * Self-contained AI description control: owns its own request, its own Original/Generated draft
 * state, and wraps RichTextField. Nothing here is persisted by itself — whichever draft is active
 * is just the field's live value, saved however the caller's own Save action works. Used by
 * DescriptionField (Product details / New product wizard) and directly by StoreDraftDetails
 * (Online stores & prices / Bulk update) — each mounted instance is independent, so several store
 * blocks can generate concurrently without interfering with each other.
 */
export default function AiDescriptionField({ value, onChange, buildRequestData, subjectKey, compact, hideLabel }: AiDescriptionFieldProps) {
  const { request: requestAi, loading: aiGenerating } = useRequest<{ description: string }>();
  const [expanded, setExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // A subject switch (product navigation) always starts collapsed, so an expanded editor never
  // carries over onto a different product's description — adjusted during render rather than in
  // an effect, per React's "adjusting state when a prop changes" pattern.
  const [prevSubjectKey, setPrevSubjectKey] = useState(subjectKey);
  if (subjectKey !== prevSubjectKey) {
    setPrevSubjectKey(subjectKey);
    setExpanded(false);
  }

  // Collapses back on Escape or a click outside the expanded editor — the link modal and colour
  // popover render inside this same wrapper, so using them doesn't count as "outside".
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [expanded]);

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

  // Compact's collapsed toolbar has 20px buttons throughout (see RichTextField); the AI control
  // and the expand toggle match that size so the row lines up.
  const compactChrome = compact && !expanded;
  const aiButtonSize = compactChrome ? 'h-5 w-5' : 'h-6 w-6';

  const toolbarEnd = (
    <span className="flex shrink-0 items-center gap-1">
      {!effectiveAi ? (
        <button
          type="button"
          onClick={generate}
          disabled={aiGenerating}
          title="Generate a description with AI"
          aria-label="Generate a description with AI"
          className={`${AI_BUTTON} ${aiButtonSize}`}
        >
          {aiGenerating ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-inventory-border-strong border-t-inventory-text-muted" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </button>
      ) : (
        <div className={AI_GROUP}>
          <SegmentButton active={effectiveAi.active === 'original'} disabled={aiGenerating} compact={compactChrome} onClick={() => setActive('original')}>
            Original
          </SegmentButton>
          <SegmentButton active={effectiveAi.active === 'generated'} disabled={aiGenerating} compact={compactChrome} onClick={() => setActive('generated')}>
            Generated
          </SegmentButton>
          <button
            type="button"
            onClick={regenerate}
            disabled={aiGenerating}
            title="Regenerate"
            aria-label="Regenerate description"
            className={`${AI_GROUP_ICON_BUTTON} ${aiButtonSize}`}
          >
            {aiGenerating ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-inventory-border-strong border-t-inventory-text-muted" />
            ) : (
              <Refresh className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
      {compact && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse description' : 'Expand description'}
          aria-label={expanded ? 'Collapse description' : 'Expand description'}
          className={`${AI_BUTTON} ${aiButtonSize}`}
        >
          {expanded ? <Collapse className="h-3 w-3" /> : <Expand className="h-3 w-3" />}
        </button>
      )}
    </span>
  );

  return (
    <div className={compact ? 'h-[48px] min-w-0' : 'min-w-0'}>
      {!compact && !hideLabel && (
        <div className="mb-1">
          <FieldLabel>Description</FieldLabel>
        </div>
      )}
      <div
        ref={wrapperRef}
        className={
          compact && expanded
            ? 'absolute inset-[6px] z-20 flex flex-col xl:min-w-[540px] rounded-lg border border-inventory-border-strong bg-inventory-surface shadow-inventory-md'
            : 'relative'
        }
      >
        <RichTextField
          label="Description"
          value={value}
          onChange={onChange}
          hideLabel
          toolbarStart={
            compact ? (
              <span className="text-[9.5px] font-bold uppercase leading-[10px] tracking-[0.4px] text-inventory-text-subtle">Description</span>
            ) : undefined
          }
          toolbarEnd={toolbarEnd}
          compact={compact}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
        />
        {aiGenerating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-inventory-surface/60">
            <div className="flex items-center gap-2 rounded-full bg-inventory-surface px-3 py-1.5 text-[12px] font-semibold text-inventory-text-muted shadow-sm">
              <span className="h-3 w-3 animate-pulse rounded-full bg-inventory-text-subtle" />
              Generating…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SegmentButton({
  active,
  disabled,
  compact,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  /** Shrinks padding/text to fit the collapsed compact toolbar's 20px-button row. */
  compact?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-md font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
      } ${active ? 'bg-inventory-text text-white shadow-sm' : 'text-inventory-text-muted hover:bg-inventory-surface hover:text-inventory-text'}`}
    >
      {children}
    </button>
  );
}
