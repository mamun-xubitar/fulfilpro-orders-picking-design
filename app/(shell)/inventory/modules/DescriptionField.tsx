'use client';

import { FieldLabel } from './ProductFieldRows';
import RichTextField from './RichTextField';
import type { useProductDetails } from './hooks/useProductDetails';
import { Refresh, Sparkles } from './icons';

type DescriptionFieldProps = {
  details: ReturnType<typeof useProductDetails>;
};

/** One dark palette shared by every AI control here, so the standalone generate button and the
 * Original / Generated / Regenerate group read as the same feature. */
const AI_BUTTON =
  'flex h-7 w-7 items-center justify-center rounded-md border border-transparent bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm transition-colors duration-150 hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const AI_GROUP = 'flex items-center gap-0.5 rounded-lg border border-gray-300 bg-gray-50 p-0.5';
const AI_GROUP_ICON_BUTTON =
  'flex h-6 w-6 items-center justify-center rounded-md text-indigo-600 transition-colors duration-150 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

/**
 * Wraps RichTextField and owns the header row: a single AI icon before any generation, replaced
 * by an Original / Generated / Regenerate segmented group once a description has been generated.
 * Nothing here is persisted by itself — whichever draft is active is just the field's live value,
 * saved the normal way by the panel's own Save button.
 */
export default function DescriptionField({ details: d }: DescriptionFieldProps) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <FieldLabel>Description</FieldLabel>
        {!d.ai && (
          <button
            type="button"
            onClick={d.generateDescription}
            disabled={d.aiGenerating}
            title="Generate a description with AI"
            aria-label="Generate a description with AI"
            className={AI_BUTTON}
          >
            {d.aiGenerating ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </button>
        )}
        {d.ai && (
          <div className={AI_GROUP}>
            <SegmentButton active={d.ai.active === 'original'} onClick={() => d.setAiActive('original')}>
              Original
            </SegmentButton>
            <SegmentButton active={d.ai.active === 'generated'} onClick={() => d.setAiActive('generated')}>
              Generated
            </SegmentButton>
            <button
              type="button"
              onClick={d.regenerateDescription}
              disabled={d.aiGenerating}
              title="Regenerate"
              aria-label="Regenerate description"
              className={AI_GROUP_ICON_BUTTON}
            >
              {d.aiGenerating ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              ) : (
                <Refresh className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
      <div className="relative">
        <RichTextField label="Description" value={d.form.description} onChange={d.setDescription} hideLabel />
        {d.aiGenerating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 shadow-sm">
              <span className="h-3 w-3 animate-pulse rounded-full bg-indigo-500" />
              Generating…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors duration-150 cursor-pointer ${
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}
