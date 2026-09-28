'use client';

import { ModalShell } from '@/components/ModalShell';
import { useEffect, useRef, useState } from 'react';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import type { StoreListingResult } from './types';
import { formatNumber } from './utils';

type DraftPrices = Record<string, string>;

type StorePricesModalProps = {
  listing: StoreListingResult;
  onClose: () => void;
  onSaveOne: (variantId: string, price: number) => Promise<boolean>;
  onSaveAll: (variants: { id: string; price: number }[]) => Promise<boolean>;
  saving: boolean;
};

export default function StorePricesModal({ listing, onClose, onSaveOne, onSaveAll, saving }: StorePricesModalProps) {
  const [drafts, setDrafts] = useState<DraftPrices>(() => Object.fromEntries(listing.variants.map((v) => [v.id, String(v.price)])));
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  // Nothing selected by default — the admin opts in to exactly what "Save selected" should touch.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const setDraft = (variantId: string, value: string) => setDrafts((prev) => ({ ...prev, [variantId]: value }));

  const parsed = (variantId: string) => {
    const raw = drafts[variantId] ?? '';
    const value = Number(raw);
    return { value, invalid: raw.trim() === '' || !Number.isFinite(value) || value < 0 };
  };

  const toggleRow = (variantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const allSelected = listing.variants.length > 0 && selectedIds.size === listing.variants.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(listing.variants.map((v) => v.id)));

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const selectedVariants = listing.variants.filter((v) => selectedIds.has(v.id));
  const anySelectedInvalid = selectedVariants.some((v) => parsed(v.id).invalid);

  const saveRow = async (variantId: string) => {
    const { value, invalid } = parsed(variantId);
    if (invalid) return;
    setSavingRowId(variantId);
    try {
      await onSaveOne(variantId, value);
    } finally {
      setSavingRowId(null);
    }
  };

  const saveSelected = async () => {
    if (selectedVariants.length === 0 || anySelectedInvalid) return;
    const ok = await onSaveAll(selectedVariants.map((v) => ({ id: v.id, price: parsed(v.id).value })));
    if (ok) setSelectedIds(new Set());
  };

  return (
    <ModalShell disableBackdropClose
      title={`Edit prices — ${listing.storeName}`}
      compact
      onClose={onClose}
      wide
      maxWidthClass="max-w-[720px]"
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className={WIZARD_BTN_SECONDARY}
          >
            Close
          </button>
          <button
            type="button"
            onClick={saveSelected}
            disabled={saving || anySelectedInvalid || selectedVariants.length === 0}
            className={`ml-auto ${WIZARD_BTN_PRIMARY}`}
          >
            {saving && SPINNER}
            {saving ? 'Saving…' : `Save selected${selectedVariants.length > 0 ? ` (${selectedVariants.length})` : ''}`}
          </button>
        </div>
      }
    >
      <div className={WIZARD_CARD_CLASS}>
        <p className="mb-2 text-[12px] font-semibold text-inventory-text">{listing.productTitle ?? listing.storeName}</p>

        <div className="thin-scroll overflow-x-auto rounded-lg border border-inventory-border">
          <table className="w-full text-[11px] leading-none">
            <thead>
              <tr className="border-b border-inventory-border bg-inventory-surface-muted">
                <th className="w-10 px-2 py-1 text-left">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all variants"
                    className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
                  />
                </th>
                <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Variant</th>
                <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">SKU</th>
                <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Inventory</th>
                <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Price</th>
                <th className="w-20 py-1 pr-2 text-right text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listing.variants.map((variant) => {
                const { invalid } = parsed(variant.id);
                const isRowSaving = saving && savingRowId === variant.id;
                const isSelected = selectedIds.has(variant.id);
                return (
                  <tr key={variant.id} className={`border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover ${isSelected ? 'bg-inventory-secondary/10' : ''}`}>
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(variant.id)}
                        aria-label={`Select ${variant.title}`}
                        className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
                      />
                    </td>
                    <td className="min-w-40 px-2 py-1 text-[11px] font-medium text-inventory-text">{variant.title}</td>
                    <td className="px-2 py-1 text-[11px] text-inventory-text-subtle">{variant.sku ?? '—'}</td>
                    <td className="px-2 py-1 text-right text-[11px] tabular-nums text-inventory-text-muted">
                      {variant.inventoryQuantity !== null ? formatNumber(variant.inventoryQuantity) : '—'}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={drafts[variant.id] ?? ''}
                        onChange={(e) => setDraft(variant.id, e.target.value)}
                        aria-label={`Price for ${variant.title}`}
                        className={`ml-auto h-[22px] w-24 rounded-[6px] border px-[6px] text-right text-[11px] leading-none tabular-nums outline-none focus:ring-2 ${
                          invalid ? 'border-inventory-danger/35 focus:border-inventory-danger focus:ring-inventory-danger/20' : 'border-inventory-border-strong focus:border-inventory-primary focus:ring-inventory-primary-ring'
                        }`}
                      />
                    </td>
                    <td className="py-1 pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => saveRow(variant.id)}
                        disabled={saving || invalid}
                        className="h-[22px] rounded-[6px] border border-inventory-border-strong px-2 text-[10px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        {isRowSaving ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}
