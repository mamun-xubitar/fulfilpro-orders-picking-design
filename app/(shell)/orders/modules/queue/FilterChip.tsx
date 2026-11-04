'use client';

import type { ReactNode, RefObject } from 'react';
import { Icon } from './icons';

type FilterChipProps = {
  label: string;
  value: string;
  active?: boolean;
  open: boolean;
  onToggle: () => void;
  dropdownRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  align?: 'left' | 'right';
};

/** A compact "Label  Value ▾" filter button with its dropdown. The owning hook closes the menu on outside click. */
export default function FilterChip({ label, value, active = false, open, onToggle, dropdownRef, children, align = 'left' }: FilterChipProps) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-7 items-center gap-[5px] whitespace-nowrap rounded-lg border pl-2 pr-[7px] text-[11px] cursor-pointer ${active ? 'border-orders-primary-ring bg-orders-primary-soft' : 'border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted'}`}
      >
        {label && <span className="font-normal text-orders-text-muted">{label}</span>}
        <b className={`font-bold ${active ? 'text-orders-primary-ink' : 'text-orders-text'}`}>{value}</b>
        <Icon name="chevronDown" className="h-[11px] w-[11px] text-[#9ca3af]" />
      </button>
      {open && (
        <div role="menu" className={`absolute top-full z-30 mt-1 min-w-44 rounded-xl border border-orders-border bg-orders-surface py-1 shadow-orders-md ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-orders-text-subtle">{children}</div>;
}

export function MenuCheck({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="menuitemcheckbox" aria-checked={checked} onClick={onClick} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-orders-text-body hover:bg-orders-surface-muted cursor-pointer">
      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${checked ? 'border-orders-primary bg-orders-primary text-white' : 'border-orders-border-strong'}`}>
        {checked && <Icon name="check" className="h-2.5 w-2.5" />}
      </span>
      {children}
    </button>
  );
}

export function MenuOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={selected} onClick={onClick} className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] hover:bg-orders-surface-muted cursor-pointer ${selected ? 'font-semibold text-orders-primary-ink' : 'text-orders-text-body'}`}>
      {children}
      {selected && <Icon name="check" className="h-3 w-3" />}
    </button>
  );
}
