import type { ReactNode } from 'react';

const BTN = 'inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-[9px] text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
/** Dialog buttons (prototype `.btn`: 28px, 11px bold). */
export const dlgBtn = {
  ghost: `${BTN} border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted`,
  pri: `${BTN} border-transparent bg-orders-primary text-white hover:bg-orders-primary-hover`,
  soft: `${BTN} border-orders-primary-ring bg-orders-primary-soft text-orders-primary-ink hover:brightness-95`,
  danger: `${BTN} border-orders-danger-border bg-orders-danger-soft text-orders-danger-ink hover:brightness-95`,
  warn: `${BTN} border-orders-warning-border bg-orders-warning-soft text-orders-warning-ink hover:brightness-95`,
  xs: 'inline-flex h-5 items-center justify-center gap-[3px] whitespace-nowrap rounded-[5px] border px-1.5 text-[9.5px] font-bold disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
};

/** Input / select / textarea look: 28px, 11.5px, primary ring on focus. */
export const dlgInput = 'w-full rounded-lg border border-orders-border-strong bg-orders-surface px-2 text-[11.5px] text-orders-text outline-none placeholder:text-orders-text-subtle focus:border-orders-primary focus:shadow-[0_0_0_2px_var(--orders-primary-ring)] disabled:bg-orders-canvas disabled:text-orders-text-subtle h-7';
export const dlgTextarea = dlgInput.replace('h-7', 'py-1.5 resize-none');

/** Labelled field (prototype `.fr`): 9.5px uppercase label over the control. */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-[3px]">
      <span className="text-[9.5px] font-bold uppercase tracking-[.4px] text-orders-text-subtle">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-orders-text-subtle">{hint}</span>}
    </label>
  );
}

export const FormError = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-orders-danger-border bg-orders-danger-soft px-2.5 py-1.5 text-[11px] text-orders-danger-ink">{children}</div>
);

export const Hint = ({ children }: { children: ReactNode }) => <div className="py-8 text-center text-[11px] text-orders-text-subtle">{children}</div>;

/** Note | Message to admin toggle shown at the top of both dialogs (prototype `.seg2`). */
export function SegSwitch({ active, onNote, onMessage }: { active: 'note' | 'message'; onNote: () => void; onMessage: () => void }) {
  const tab = (on: boolean) => `h-6 flex-1 rounded-md px-2 text-[11px] font-bold cursor-pointer ${on ? 'bg-orders-surface text-orders-text shadow-orders' : 'text-orders-text-muted hover:text-orders-text'}`;
  return (
    <div role="tablist" className="mb-2.5 flex gap-0.5 rounded-lg border border-orders-border bg-orders-divider p-0.5">
      <button type="button" role="tab" aria-selected={active === 'note'} onClick={onNote} className={tab(active === 'note')}>Note</button>
      <button type="button" role="tab" aria-selected={active === 'message'} onClick={onMessage} className={tab(active === 'message')}>Message to admin</button>
    </div>
  );
}
