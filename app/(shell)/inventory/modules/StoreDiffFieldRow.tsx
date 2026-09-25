'use client';

export type DiffTone = 'details' | 'pricing' | 'variants' | 'missing' | 'extra' | 'add';

/** Same accent-per-section idea as the panel headings (MainImagePanel's TONE_CLASSES) — reusing
 * the app's existing `--color-inventory-sec-*` tokens rather than inventing new colors, plus the
 * problem/action tones (missing/extra/add) borrowed from the danger/warning/success badge
 * palette already used on the store cards. Exported so StoreDiffModal's group headers, and the
 * variants table's row tints, can tint consistently too. */
export const DIFF_TONE_CLASSES: Record<DiffTone, { border: string; tint: string; text: string; ring: string }> = {
  details: { border: 'border-inventory-sec-details/35', tint: 'bg-inventory-sec-details/[6%]', text: 'text-inventory-sec-details', ring: 'focus:ring-inventory-sec-details/30 focus:border-inventory-sec-details' },
  pricing: { border: 'border-inventory-sec-pricing/35', tint: 'bg-inventory-sec-pricing/[6%]', text: 'text-inventory-sec-pricing', ring: 'focus:ring-inventory-sec-pricing/30 focus:border-inventory-sec-pricing' },
  variants: { border: 'border-inventory-sec-variants/35', tint: 'bg-inventory-sec-variants/[6%]', text: 'text-inventory-sec-variants', ring: 'focus:ring-inventory-sec-variants/30 focus:border-inventory-sec-variants' },
  missing: { border: 'border-inventory-danger/35', tint: 'bg-inventory-danger/[6%]', text: 'text-inventory-danger-hover', ring: 'focus:ring-inventory-danger/30 focus:border-inventory-danger' },
  extra: { border: 'border-inventory-warning/35', tint: 'bg-inventory-warning/[8%]', text: 'text-inventory-warning-ink', ring: 'focus:ring-inventory-warning/30 focus:border-inventory-warning' },
  add: { border: 'border-inventory-success/35', tint: 'bg-inventory-success/[8%]', text: 'text-inventory-success-hover', ring: 'focus:ring-inventory-success/30 focus:border-inventory-success' },
};

type StoreDiffFieldRowProps = {
  tone: DiffTone;
  label: string;
  /** The store's current value for this field, already styled by the caller — a struck-through
   * text line for a plain field, a dimmed HTML preview for description. */
  preview: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
  children: React.ReactNode;
};

/**
 * One editable difference row (item 4) — the current store value (`preview`) and the system's
 * editable value (via `children`, whatever input shape the field needs), tinted by which group it
 * belongs to so a long list of differences stays scannable at a glance, with its own Save button
 * to push just this field. Shared by every product-level field kind.
 */
export default function StoreDiffFieldRow({ tone, label, preview, onSave, saving, disabled, children }: StoreDiffFieldRowProps) {
  const t = DIFF_TONE_CLASSES[tone];

  return (
    <div className={`rounded-[8px] border ${t.border} ${t.tint} p-[8px]`}>
      <div className="flex items-center justify-between gap-[8px]">
        <span className={`text-[10px] font-bold uppercase leading-none tracking-[0.3px] ${t.text}`}>{label}</span>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled}
          className="flex h-[22px] shrink-0 items-center rounded-[6px] bg-inventory-primary px-[8px] text-[10px] font-bold text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="mt-[4px]">{preview}</div>
      <div className="mt-[4px]">{children}</div>
    </div>
  );
}

/** Struck-through, muted single-line preview for a plain-text field's current store value —
 * shared by every field kind except description (see ClampedHtml at the call site instead). */
export function StoreValuePreview({ value }: { value: string }) {
  return (
    <div className="truncate text-[10px] leading-tight text-inventory-text-subtle line-through decoration-inventory-text-subtle/60" title={value || '(empty)'}>
      {value || '(empty)'}
    </div>
  );
}
