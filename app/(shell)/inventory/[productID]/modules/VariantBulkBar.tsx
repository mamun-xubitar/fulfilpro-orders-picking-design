'use client';

import { useState } from 'react';
import type { VariantDetail } from './types';

type PopoverKind = 'price' | 'cost' | 'margin' | null;

type VariantBulkBarProps = {
  selectedVariants: VariantDetail[];
  bulkSaving: boolean;
  onSetPrice: (price: number) => void;
  onSetCost: (cost: number) => void;
  onSetMargin: (marginPercent: number) => void;
  onSetContinueSelling: (policy: 'DENY' | 'CONTINUE') => void;
  onRequestDelete: () => void;
  onClear: () => void;
};

export default function VariantBulkBar({
  selectedVariants,
  bulkSaving,
  onSetPrice,
  onSetCost,
  onSetMargin,
  onSetContinueSelling,
  onRequestDelete,
  onClear,
}: VariantBulkBarProps) {
  const [openPopover, setOpenPopover] = useState<PopoverKind>(null);
  const [inputValue, setInputValue] = useState('');

  if (selectedVariants.length === 0) return null;

  const canSetMargin = selectedVariants.every((v) => v.cost != null);

  const submit = (apply: (value: number) => void) => {
    const value = Number(inputValue);
    if (!inputValue || Number.isNaN(value)) return;
    apply(value);
    setOpenPopover(null);
    setInputValue('');
  };

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3 text-sm">
      <span className="text-blue-800 font-medium">{selectedVariants.length} selected</span>

      <BulkPopoverButton label="Price" open={openPopover === 'price'} onOpen={() => setOpenPopover('price')} onClose={() => setOpenPopover(null)}>
        <input
          autoFocus
          type="number"
          step="0.01"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit(onSetPrice)}
          className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none"
        />
        <button type="button" onClick={() => submit(onSetPrice)} className="text-xs text-blue-600 hover:underline cursor-pointer">
          Apply
        </button>
      </BulkPopoverButton>

      <BulkPopoverButton label="Cost" open={openPopover === 'cost'} onOpen={() => setOpenPopover('cost')} onClose={() => setOpenPopover(null)}>
        <input
          autoFocus
          type="number"
          step="0.01"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit(onSetCost)}
          className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none"
        />
        <button type="button" onClick={() => submit(onSetCost)} className="text-xs text-blue-600 hover:underline cursor-pointer">
          Apply
        </button>
      </BulkPopoverButton>

      {canSetMargin && (
        <BulkPopoverButton label="Margin %" open={openPopover === 'margin'} onOpen={() => setOpenPopover('margin')} onClose={() => setOpenPopover(null)}>
          <input
            autoFocus
            type="number"
            step="0.1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit(onSetMargin)}
            className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none"
          />
          <button type="button" onClick={() => submit(onSetMargin)} className="text-xs text-blue-600 hover:underline cursor-pointer">
            Apply
          </button>
        </BulkPopoverButton>
      )}

      <button type="button" onClick={() => onSetContinueSelling('CONTINUE')} className="text-blue-700 hover:underline cursor-pointer">
        Continue selling
      </button>
      <button type="button" onClick={() => onSetContinueSelling('DENY')} className="text-blue-700 hover:underline cursor-pointer">
        Stop selling
      </button>
      <button type="button" onClick={onRequestDelete} className="text-red-600 hover:underline cursor-pointer">
        Delete
      </button>

      {bulkSaving && <span className="text-xs text-gray-400">Saving…</span>}
      <button type="button" onClick={onClear} className="ml-auto text-gray-400 hover:text-gray-600 cursor-pointer">
        Clear
      </button>
    </div>
  );
}

function BulkPopoverButton({
  label,
  open,
  onOpen,
  onClose,
  children,
}: {
  label: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button type="button" onClick={open ? onClose : onOpen} className="text-blue-700 hover:underline cursor-pointer">
        {label}
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
