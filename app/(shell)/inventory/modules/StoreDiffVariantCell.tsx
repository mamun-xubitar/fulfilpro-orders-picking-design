'use client';

import { Check } from './icons';

export const ROW_INPUT_CLASS =
  'h-[22px] w-full min-w-0 rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

/** The small check button that appears beside a cell once it holds something the store doesn't. A
 * fixed-width slot is always reserved, so the input doesn't shift sideways when it shows up. */
export function CellSaveButton({ show, saving, disabled, label, onClick }: { show: boolean; saving: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center">
      {(show || saving) && (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || saving}
          aria-label={label}
          title={label}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-inventory-primary text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {saving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check className="h-3 w-3" />}
        </button>
      )}
    </span>
  );
}

type StoreDiffVariantCellProps = {
  value: string;
  onChange: (value: string) => void;
  /** The store's live value, shown struck through underneath while the input disagrees with it. */
  storeValue: string;
  dirty: boolean;
  saving: boolean;
  /** Another save is in flight — Save stays visible but waits its turn. */
  locked: boolean;
  onSave: () => void;
  ariaLabel: string;
  align?: 'left' | 'right';
  type?: 'text' | 'number';
  min?: string;
  step?: string;
  /** Hub-side value offered as a one-click fill — used by Available, where the system's number is
   * the usual intent but the store's own number is what the input starts at. */
  hint?: { label: string; value: string };
  /** Hide the Save slot entirely (a row that has no store variant to update). */
  readOnlySave?: boolean;
};

/** One editable SKU / Barcode / Available / Price cell of the differences table. */
export default function StoreDiffVariantCell({
  value,
  onChange,
  storeValue,
  dirty,
  saving,
  locked,
  onSave,
  ariaLabel,
  align = 'left',
  type = 'text',
  min,
  step,
  hint,
  readOnlySave,
}: StoreDiffVariantCellProps) {
  const right = align === 'right';
  return (
    <td className="px-2 py-1.5 align-top">
      <div className="flex items-center gap-[4px]">
        <input
          type={type}
          min={min}
          step={step ?? (type === 'number' ? '0.01' : undefined)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && dirty && !locked && !readOnlySave) onSave();
          }}
          className={`${ROW_INPUT_CLASS} ${right ? 'text-right tabular-nums' : ''} ${dirty ? 'border-inventory-primary/60 bg-inventory-primary/[4%]' : ''}`}
        />
        {!readOnlySave && <CellSaveButton show={dirty} saving={saving} disabled={locked} label={`Save ${ariaLabel}`} onClick={onSave} />}
      </div>
      {dirty && storeValue !== value && (
        <div className={`mt-[2px] truncate text-[9.5px] leading-none text-inventory-text-subtle ${right ? 'pr-[26px] text-right' : ''}`} title={`Store: ${storeValue || '(empty)'}`}>
          <span className="line-through decoration-inventory-text-subtle/60">{storeValue || '(empty)'}</span>
        </div>
      )}
      {hint && hint.value !== value && (
        <button
          type="button"
          onClick={() => onChange(hint.value)}
          className={`mt-[2px] block w-full truncate text-[9.5px] leading-none text-inventory-secondary hover:underline cursor-pointer ${right ? 'pr-[26px] text-right' : 'text-left'}`}
        >
          {hint.label} {hint.value}
        </button>
      )}
    </td>
  );
}
