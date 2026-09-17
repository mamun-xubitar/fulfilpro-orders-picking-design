'use client';

import { useState } from 'react';
import { deriveColorFromName, resolveSwatch } from '@/lib/inventory/colour';
import { Close, Plus, Search } from '../icons';
import OptionFindPanel from './OptionFindPanel';
import type { OptionItem } from './useColourSizeModal';

type OptionColumnProps = {
  kind: 'colour' | 'size';
  title: string;
  items: OptionItem[];
  input: string;
  setInput: (value: string) => void;
  error: string | null;
  hasNew: boolean;
  saving: boolean;
  onToggle: (name: string) => void;
  onToggleAll: (checked: boolean) => void;
  onAdd: () => void;
  onRemove: (name: string) => void;
  onSave: () => void;
};

/** One column of the Colour & size adjustment modal — the same component renders both the Colour
 * and Size lists (`kind` only changes the swatch and copy). Mirrors the screenshot: a header row
 * with a select-all checkbox, Save and Find, one row per name with a checkbox + remove, and a
 * "More colour/size" + Add row at the bottom. */
export default function OptionColumn({
  kind,
  title,
  items,
  input,
  setInput,
  error,
  hasNew,
  saving,
  onToggle,
  onToggleAll,
  onAdd,
  onRemove,
  onSave,
}: OptionColumnProps) {
  const [findOpen, setFindOpen] = useState(false);
  const allChecked = items.length > 0 && items.every((i) => i.checked);
  const someChecked = items.some((i) => i.checked);

  return (
    <div className="flex max-h-[300px] min-h-0 flex-col rounded-[8px] border border-inventory-border bg-inventory-surface md:h-full md:max-h-none">
      <div className="flex items-center gap-[6px] border-b border-inventory-border px-[8px] py-[6px]">
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => {
            if (el) el.indeterminate = someChecked && !allChecked;
          }}
          onChange={(e) => onToggleAll(e.target.checked)}
          aria-label={`Select all ${title.toLowerCase()}`}
          className="h-3.5 w-3.5 cursor-pointer accent-inventory-primary"
        />
        <h4 className="flex-1 text-[11px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-muted">{title}</h4>
        <button
          type="button"
          onClick={onSave}
          disabled={!hasNew || saving}
          className="h-[20px] rounded-[6px] bg-inventory-primary px-[8px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Save
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFindOpen((v) => !v)}
            aria-label={`Find ${title.toLowerCase()}`}
            className="flex h-[20px] items-center gap-1 rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[7px] text-[10px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
          >
            <Search className="h-3 w-3" />
            Find
          </button>
          {findOpen && (
            <OptionFindPanel kind={kind} items={items} onClose={() => setFindOpen(false)} onSelect={onToggle} onRemove={onRemove} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll px-[6px] py-[4px]">
        {items.length === 0 && <p className="px-[4px] py-[8px] text-[11px] text-inventory-text-subtle">Nothing yet — add one below.</p>}
        {items.map((item) => (
          <div
            key={item.name}
            className={`flex items-center gap-[6px] border-b border-inventory-border px-[4px] py-[5px] last:border-b-0 hover:bg-inventory-surface-hover ${item.isNew ? 'bg-inventory-warning/[6%]' : ''}`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => onToggle(item.name)}
              aria-label={item.name}
              className="h-3.5 w-3.5 cursor-pointer accent-inventory-primary"
            />
            {kind === 'colour' && (
              <span
                className="h-[8px] w-[8px] shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: resolveSwatch(deriveColorFromName(item.name)) }}
              />
            )}
            <span className="flex-1 truncate text-[11.5px] font-medium uppercase tracking-[0.2px] text-inventory-text">{item.name}</span>
            {item.isNew && (
              <span className="rounded-full bg-inventory-warning/15 px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.3px] text-inventory-warning">
                New
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(item.name)}
              aria-label={`Remove ${item.name}`}
              title="Remove from this list"
              className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-danger/10 hover:text-inventory-danger cursor-pointer"
            >
              <Close className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-inventory-border p-[6px]">
        <div className="flex items-center gap-[4px]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
              }
            }}
            placeholder={kind === 'colour' ? 'More colour' : 'More size'}
            aria-label={kind === 'colour' ? 'More colour' : 'More size'}
            className="h-[24px] flex-1 min-w-0 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] uppercase leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={input.trim().length === 0}
            className="flex h-[24px] items-center gap-1 rounded-[6px] bg-inventory-primary px-[8px] text-[11px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
        {error && <p className="mt-[3px] text-[10px] leading-tight text-inventory-danger">{error}</p>}
      </div>
    </div>
  );
}
