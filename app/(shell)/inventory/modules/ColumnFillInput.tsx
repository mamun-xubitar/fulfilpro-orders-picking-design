'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalActions, ModalShell } from '@/components/ModalShell';

type ColumnFillInputProps = {
  /** Used in the confirm dialog's copy and the input's aria-label — e.g. "Stock on hand". */
  label: string;
  rowCount: number;
  step?: string;
  /** When set, rejects values below it with an inline error instead of opening confirm. */
  min?: number;
  /** When true, rejects decimals with an inline error (e.g. Receive qty must be whole units). */
  integerOnly?: boolean;
  /** Optional warning shown inside the confirm modal (e.g. capped to outstanding). Return null for no warning. */
  getConfirmWarning?: (pending: number) => string | null;
  /** When true, greys out the header input and blocks the confirm modal (e.g. while rows have errors). */
  disabled?: boolean;
  onApply: (value: number) => void;
};

/**
 * A compact number input dropped into a table header cell — typing a value and blurring opens a
 * confirmation before writing it to every visible row (items 8 and 9: bulk-set a whole column in
 * one action instead of editing each row by hand). Cancelling, or blurring with the value
 * unchanged from what was last applied, does nothing.
 */
export default function ColumnFillInput({ label, rowCount, step, min, integerOnly, getConfirmWarning, disabled, onApply }: ColumnFillInputProps) {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBlur = () => {
    if (disabled) return;
    const trimmed = value.trim();
    if (trimmed === '') {
      setError(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setError('Enter a valid number');
      return;
    }
    if (min !== undefined && parsed < min) {
      setError(`Must be at least ${min}`);
      return;
    }
    if (integerOnly && !Number.isInteger(parsed)) {
      setError('Must be a whole number');
      return;
    }
    setError(null);
    setPending(parsed);
  };

  return (
    <>
      <input
        type="number"
        step={step}
        min={min}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        placeholder="Set all"
        aria-label={`Set ${label} for every row`}
        aria-invalid={error !== null}
        title={disabled ? 'Fix row errors first' : (error ?? `Set ${label} for every visible row`)}
        className={`h-[16px] w-full min-w-0 rounded-[4px] border bg-inventory-surface px-[3px] text-right text-[9px] font-normal normal-case leading-none tracking-normal text-inventory-text-muted outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-inventory-surface-muted disabled:text-inventory-text-subtle ${error ? 'border-inventory-danger/45 bg-inventory-danger/8 focus:border-inventory-danger focus:ring-inventory-danger/20' : 'border-inventory-border-strong focus:border-inventory-primary focus:ring-inventory-primary-ring'}`}
      />
      {error && <p className="mt-[2px] whitespace-normal break-words text-right text-[9px] font-normal normal-case leading-tight text-inventory-danger">{error}</p>}
      {typeof document !== 'undefined' &&
        pending !== null &&
        createPortal(
          (() => {
            const warning = getConfirmWarning?.(pending) ?? null;
            return (
              // `normal-case text-left` + `whitespace-normal break-words` reset inherited header
              // styles: the header cells this input lives in (matrix `<th>`, PO grid headers) are
              // uppercase + whitespace-nowrap + text-right, which would otherwise cascade straight
              // through this modal since it used to be a DOM descendant (now portalled, kept as
              // defence). Portal escapes sticky/overflow stacking contexts (table header/footer
              // z-10, inventory header z-30) so overlay + modal always sit on top.
              <div className="normal-case whitespace-normal break-words text-left">
                <ModalShell
                  disableBackdropClose
                  elevated
                  compact
                  title={`Set ${label} for every row?`}
                  onClose={() => {
                    setPending(null);
                    setValue('');
                  }}
                  footer={
                    <ModalActions
                      onCancel={() => {
                        setPending(null);
                        setValue('');
                      }}
                      onConfirm={() => {
                        onApply(pending);
                        setPending(null);
                        setValue('');
                      }}
                      confirmLabel="Set all"
                      disabled={warning !== null}
                    />
                  }
                >
                  <p className="text-left text-[12px] text-inventory-text-muted whitespace-normal break-words">
                    Set <span className="font-semibold text-inventory-text">{label}</span> to <span className="font-semibold text-inventory-text">{pending}</span> for all{' '}
                    {rowCount} row{rowCount === 1 ? '' : 's'}?
                  </p>
                  {warning && (
                    <p className="mt-2 max-w-full rounded-[6px] border border-inventory-danger/30 bg-inventory-danger/10 px-2 py-1.5 text-left text-[11px] leading-snug whitespace-normal break-words text-inventory-danger-hover">
                      {warning}
                    </p>
                  )}
                </ModalShell>
              </div>
            );
          })(),
          document.body
        )}
    </>
  );
}
