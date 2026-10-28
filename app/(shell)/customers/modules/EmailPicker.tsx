'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown } from '@/components/icons';

type EmailPickerProps = {
  options: string[];
  picked: string[];
  onToggle: (email: string) => void;
};

const MENU_ROOM = 220;

/** Where the menu goes: fixed to the button, so the table's overflow (and the pagination below it)
 * can't clip it. It opens upwards when there isn't room below. */
function menuPosition(button: HTMLElement): CSSProperties {
  const rect = button.getBoundingClientRect();
  const right = window.innerWidth - rect.right;
  return window.innerHeight - rect.bottom < MENU_ROOM
    ? { position: 'fixed', right, bottom: window.innerHeight - rect.top + 4 }
    : { position: 'fixed', right, top: rect.bottom + 4 };
}

/** "Select N emails": a popover of the customer's addresses to tick for the Email button. */
export default function EmailPicker({ options, picked, onToggle }: EmailPickerProps) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const open = position !== null;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const onMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) close();
    };
    // A fixed menu would drift away from its row, so scrolling or resizing closes it.
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (options.length === 0) return <span className="text-sm text-gray-400">No email</span>;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        onClick={(event) => setPosition(open ? null : menuPosition(event.currentTarget))}
        className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
      >
        Select {picked.length} email{picked.length === 1 ? '' : 's'}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <ul style={position} className="z-50 max-h-52 min-w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((email) => (
            <li key={email}>
              <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={picked.includes(email)} onChange={() => onToggle(email)} className="cursor-pointer" />
                {email}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
