'use client';

import { useEffect, useRef, useState } from 'react';
import type { UserOption } from './types';

type Props = {
  users: UserOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  error?: string;
};

const DROPDOWN_MAX_HEIGHT = 192; // px, matches max-h-48 below

export default function AssigneeMultiSelect({ users, selectedIds, onToggle, error }: Props) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Flip only when there's too little room below AND more room above — otherwise keep
      // the default downward placement (e.g. both directions are tight, or it fits below).
      setDropUp(spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow);
    }
    setOpen((o) => !o);
  }

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));
  const label = selectedUsers.length === 0
    ? 'Select assignees...'
    : selectedUsers.map((u) => u.name || u.email).join(', ');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.75 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white flex items-center justify-between gap-2"
        >
          <span className={`truncate ${selectedUsers.length === 0 ? 'text-gray-400' : 'text-gray-800'}`}>{label}</span>
          <svg className={`w-4 h-4 text-black shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className={`absolute z-10 w-full border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 ${dropUp ? 'bottom-full mb-1' : 'mt-1'}`}>
            {users.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No users available</p>
            ) : (
              users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => onToggle(u.id)}
                    className="cursor-pointer"
                  />
                  <span className="text-gray-800">
                    {u.name || u.email} <span className="text-gray-400">({u.role})</span>
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
