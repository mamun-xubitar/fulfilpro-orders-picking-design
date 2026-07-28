'use client';

import { useEffect, useRef, useState } from 'react';

type VariantBulkMenuProps = {
  className?: string;
  canSetMargin: boolean;
  onSetMargin: (marginPercent: number) => void;
  onSetContinueSelling: (policy: 'DENY' | 'CONTINUE') => void;
  onRequestDelete: () => void;
};

export default function VariantBulkMenu({
  className,
  canSetMargin,
  onSetMargin,
  onSetContinueSelling,
  onRequestDelete,
}: VariantBulkMenuProps) {
  const [open, setOpen] = useState(false);
  const [showMarginInput, setShowMarginInput] = useState(false);
  const [marginInput, setMarginInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowMarginInput(false);
        setMarginInput('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const submitMargin = () => {
    const value = Number(marginInput);
    if (!marginInput || Number.isNaN(value)) return;
    onSetMargin(value);
    setOpen(false);
    setShowMarginInput(false);
    setMarginInput('');
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-gray-500 hover:text-gray-700 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 right-0 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {canSetMargin && !showMarginInput && (
            <button
              type="button"
              onClick={() => setShowMarginInput(true)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            >
              Margin %
            </button>
          )}

          {canSetMargin && showMarginInput && (
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                autoFocus
                type="number"
                step="0.1"
                value={marginInput}
                onChange={(e) => setMarginInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitMargin()}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none"
              />
              <button type="button" onClick={submitMargin} className="text-xs text-blue-600 hover:underline cursor-pointer">
                Apply
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onSetContinueSelling('CONTINUE');
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
          >
            Continue selling
          </button>
          <button
            type="button"
            onClick={() => {
              onSetContinueSelling('DENY');
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
          >
            Stop selling
          </button>
          <button
            type="button"
            onClick={() => {
              onRequestDelete();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
