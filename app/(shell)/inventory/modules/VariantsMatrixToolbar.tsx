'use client';

import { useState } from 'react';
import ColourSizeModal from './colourSize/ColourSizeModal';
import { STATUS_LEGEND } from './constants';
import type { InventoryPage } from './hooks/useInventoryPage';
import { Adjust, Expand, Plus, Trash } from './icons';
import { BTN_XS } from './MainImagePanel';
import VariantSizeDropdown from './VariantSizeDropdown';

type VariantsMatrixToolbarProps = {
  p: InventoryPage;
  /** True when this toolbar is rendered inside the full-screen "Full view" modal — flips the
   * expand button into a "Exit full view" close action instead of opening the modal again. */
  fullView?: boolean;
};

export default function VariantsMatrixToolbar({ p, fullView }: VariantsMatrixToolbarProps) {
  const { matrix } = p;
  const [colourSizeOpen, setColourSizeOpen] = useState(false);

  // Re-enable: uncomment this block and the "Apply to selected colours" button below to restore
  // applying the pricing panel's sell/buy price to every variant of the selected colours.
  // const selectedColours = () => {
  //   const source = matrix.rows.filter((r) => matrix.selectedIds.has(r.id));
  //   return [...new Set(source.map((r) => r.colour))];
  // };
  // const applyToSelected = () => p.pricing.applyToColours(selectedColours());
  const createPo = () => p.po.openCreate(matrix.selectedIds.size > 0 ? [...matrix.selectedIds] : matrix.rows.map((r) => r.id));
  const adjustSelected = () => p.adjustments.openModal([...matrix.selectedIds]);

  const totalVariants = p.product?.variants.length ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-[4px] border-b border-inventory-sec-variants/25 bg-inventory-sec-variants/[7%] px-[8px] py-[4px] shadow-[inset_3px_0_0_0_var(--color-inventory-sec-variants)]">
      <h3 className="mr-[2px] text-[9.5px] font-bold uppercase leading-none tracking-[0.5px] text-inventory-sec-variants">Variants / stock</h3>
      <span className="mr-[2px] whitespace-nowrap rounded-full bg-inventory-surface ring-1 ring-inset ring-inventory-sec-variants/30 px-[6px] py-[1px] text-[9.5px] font-bold leading-none text-inventory-sec-variants">
        {totalVariants} variant{totalVariants === 1 ? '' : 's'}
      </span>

      {/* Full view has its own exit via the modal's own close (×) — no separate "exit" action
          needed here once inside it. */}
      {!fullView && (
        <button type="button" onClick={p.openMatrixFullView} className={BTN_XS}>
          <Expand className="h-3 w-3" />
          Full view
        </button>
      )}

      <span className="mx-[2px] h-[18px] w-px bg-inventory-border" aria-hidden="true" />

      <input
        type="search"
        value={matrix.search}
        onChange={(e) => matrix.setSearch(e.target.value)}
        placeholder="Search SKU, barcode, colour, size…"
        aria-label="Search variants"
        className="h-[22px] w-[210px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[7px] text-[10.5px] leading-none outline-none placeholder:text-inventory-text-subtle focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
      />

      <VariantSizeDropdown size={matrix.sizeFilter} />

      <label className="flex cursor-pointer items-center gap-[4px] text-[10px] font-medium leading-none text-inventory-text-muted">
        <input
          type="checkbox"
          checked={matrix.showZeroStock}
          onChange={(e) => matrix.setShowZeroStock(e.target.checked)}
          className="h-3 w-3 cursor-pointer accent-inventory-primary"
        />
        Zero stock
      </label>

      {/* Status legend, doubling as a filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_LEGEND.map((entry) => {
          const isActive = matrix.statusFilter === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => matrix.setStatusFilter(entry.id)}
              aria-pressed={isActive}
              title={entry.hint}
              className={`whitespace-nowrap rounded-full border px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] transition-colors duration-150 cursor-pointer ${entry.className} ${
                isActive ? 'ring-2 ring-inventory-primary ring-offset-1' : 'opacity-90 hover:opacity-100'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-[6px]">
        <SecondaryButton onClick={matrix.toggleAllRows}>{matrix.allRowsSelected ? 'Deselect all' : 'Select all'}</SecondaryButton>
        {/* Re-enable: uncomment to restore the "Apply to selected colours" action (see selectedColours/applyToSelected above).
        <button
          type="button"
          onClick={applyToSelected}
          disabled={matrix.selectedIds.size === 0 || p.pricing.applying}
          title="Applies the pricing panel's current sell/buy price to every variant of the selected colours"
          className="rounded-lg bg-inventory-primary px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Apply to selected colours
        </button>
        */}
        <button
          type="button"
          onClick={adjustSelected}
          disabled={matrix.selectedIds.size === 0}
          title="Opens the stock adjustment modal for the selected variants"
          className={`flex h-[22px] items-center gap-1 rounded-[6px] bg-inventory-accent px-[6px] text-[10px] font-bold leading-none text-inventory-accent-ink transition-colors duration-150 hover:bg-inventory-accent-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer`}
        >
          <Adjust className="h-3 w-3" />
          Adjust Stock
        </button>
        <button
          type="button"
          onClick={p.bulkLocations.openModal}
          disabled={matrix.selectedIds.size === 0}
          title="Sets the locations of the selected variants"
          className="flex h-[22px] items-center gap-1 rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[10px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Set locations{matrix.selectedIds.size > 0 ? ` (${matrix.selectedIds.size})` : ''}
        </button>
        <button
          type="button"
          onClick={matrix.requestBulkDelete}
          disabled={matrix.selectedIds.size === 0}
          title="Deletes the selected variants"
          className="flex h-[22px] items-center gap-1 rounded-[6px] border border-inventory-danger/30 bg-inventory-danger/10 px-[6px] text-[10px] font-bold leading-none text-inventory-danger transition-colors duration-150 hover:bg-inventory-danger/15 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Trash className="h-3 w-3" />
          Delete{matrix.selectedIds.size > 0 ? ` (${matrix.selectedIds.size})` : ''}
        </button>
        <button
          type="button"
          onClick={createPo}
          disabled={matrix.selectedIds.size === 0 && matrix.rows.length === 0}
          title={matrix.rows.length === 0 ? 'This product has no variants yet' : undefined}
          className="flex h-[22px] items-center gap-1 rounded-[6px] bg-inventory-success px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-success-hover disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          Create PO
        </button>

        <span className="mx-[2px] h-[18px] w-px bg-inventory-border" aria-hidden="true" />

        <SecondaryButton onClick={() => setColourSizeOpen(true)}>
          <Plus className="h-3 w-3" />
          Colour / size
        </SecondaryButton>
        <SecondaryButton onClick={p.locations.openCreate}>
          <Plus className="h-3 w-3" />
          Location
        </SecondaryButton>
      </div>

      {colourSizeOpen && p.product && (
        <ColourSizeModal
          product={p.product}
          optionLibrary={p.optionLibrary}
          onApplied={p.onVariantSaved}
          onClose={() => setColourSizeOpen(false)}
        />
      )}
    </div>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={BTN_XS}>
      {children}
    </button>
  );
}
