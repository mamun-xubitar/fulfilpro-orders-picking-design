'use client';

import { useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { formatColourName } from '@/lib/inventory/colour';
import { STATUS_LEGEND } from './constants';
import type { InventoryPage } from './hooks/useInventoryPage';
import { Adjust, Download, Expand, Plus, Trash } from './icons';

type VariantsMatrixToolbarProps = { p: InventoryPage };

export default function VariantsMatrixToolbar({ p }: VariantsMatrixToolbarProps) {
  const { matrix } = p;
  const onAction = p.notImplemented;
  const [addColourOpen, setAddColourOpen] = useState(false);
  const [addSizeOpen, setAddSizeOpen] = useState(false);

  // Always the whole product, not the matrix's active colour/size/status filter — "Export
  // product CSV" means the full product, and filtering the rows here used to also mis-pair
  // images against variants (buildShopifyProductCsv zips images positionally over the full pool).
  const exportCsv = () => p.importExport.exportVariants(p.product?.variants ?? []);
  // Re-enable: uncomment this block and the "Apply to selected colours" button below to restore
  // applying the pricing panel's sell/buy price to every variant of the selected colours.
  // const selectedColours = () => {
  //   const source = matrix.rows.filter((r) => matrix.selectedIds.has(r.id));
  //   return [...new Set(source.map((r) => r.colour))];
  // };
  // const applyToSelected = () => p.pricing.applyToColours(selectedColours());
  const createPo = () => p.po.openCreate(matrix.selectedIds.size > 0 ? [...matrix.selectedIds] : matrix.rows.map((r) => r.id));
  const adjustSelected = () => p.adjustments.openModal([...matrix.selectedIds]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3">
      <h3 className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Variants / stock matrix</h3>

      <button
        type="button"
        onClick={() => onAction('Full view')}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
      >
        <Expand className="h-3.5 w-3.5" />
        Full view
      </button>

      <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />

      {/* Colour filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill active={matrix.allColoursSelected} onClick={matrix.selectAllColours}>
          All colours
        </Pill>
        {matrix.colourNames.map((name) => (
          <Pill key={name} active={matrix.isColourActive(name)} onClick={() => matrix.toggleColour(name)}>
            <span className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: matrix.swatchOf(name) }} />
            {formatColourName(name)}
          </Pill>
        ))}
      </div>

      <select
        value={matrix.sizeFilter}
        onChange={(e) => matrix.setSizeFilter(e.target.value)}
        aria-label="Filter by size"
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        <option value="">All sizes</option>
        {matrix.sizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-700">
        <input
          type="checkbox"
          checked={matrix.showZeroStock}
          onChange={(e) => matrix.setShowZeroStock(e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
        />
        Show zero stock
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
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors duration-150 cursor-pointer ${entry.className} ${
                isActive ? 'ring-2 ring-blue-400 ring-offset-1' : 'opacity-90 hover:opacity-100'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <SecondaryButton onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" />
          Export product CSV
        </SecondaryButton>
        <SecondaryButton onClick={matrix.toggleAllRows}>{matrix.allRowsSelected ? 'Deselect all Colours' : 'Select all Colours'}</SecondaryButton>
        {/* Re-enable: uncomment to restore the "Apply to selected colours" action (see selectedColours/applyToSelected above).
        <button
          type="button"
          onClick={applyToSelected}
          disabled={matrix.selectedIds.size === 0 || p.pricing.applying}
          title="Applies the pricing panel's current sell/buy price to every variant of the selected colours"
          className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Apply to selected colours
        </button>
        */}
        <button
          type="button"
          onClick={adjustSelected}
          disabled={matrix.selectedIds.size === 0}
          title="Opens the stock adjustment modal for the selected variants"
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Adjust className="h-3.5 w-3.5" />
          Adjust Stock
        </button>
        <button
          type="button"
          onClick={matrix.requestBulkDelete}
          disabled={matrix.selectedIds.size === 0}
          title="Deletes the selected variants"
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors duration-150 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Trash className="h-3.5 w-3.5" />
          Delete selected{matrix.selectedIds.size > 0 ? ` (${matrix.selectedIds.size})` : ''}
        </button>
        <button
          type="button"
          onClick={createPo}
          disabled={matrix.selectedIds.size === 0 && matrix.rows.length === 0}
          title={matrix.rows.length === 0 ? 'This product has no variants yet' : undefined}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Create purchase order
        </button>

        <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />

        <SecondaryButton onClick={() => setAddColourOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add colour
        </SecondaryButton>
        <SecondaryButton onClick={() => setAddSizeOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add size
        </SecondaryButton>
      </div>

      {addColourOpen && <AddColourModal onClose={() => setAddColourOpen(false)} onAdd={p.details.quickAddColours} />}
      {addSizeOpen && <AddSizeModal onClose={() => setAddSizeOpen(false)} onAdd={p.details.quickAddSizes} />}
    </div>
  );
}

function AddColourModal({ onClose, onAdd }: { onClose: () => void; onAdd: (names: string[]) => string | null }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const names = splitCommaList(name);
    if (names.length === 0) return;
    const err = onAdd(names);
    if (err) setError(err);
    else onClose();
  };

  return (
    <ModalShell
      title="Add colour"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Add colour{splitCommaList(name).length > 1 ? 's' : ''}
          </button>
        </div>
      }
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Black, Hot Pink, Navy"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </ModalShell>
  );
}

function AddSizeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (sizes: string[]) => string | null }) {
  const [size, setSize] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const sizes = splitCommaList(size);
    if (sizes.length === 0) return;
    const err = onAdd(sizes);
    if (err) setError(err);
    else onClose();
  };

  return (
    <ModalShell
      title="Add size"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!size.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Add size{splitCommaList(size).length > 1 ? 's' : ''}
          </button>
        </div>
      }
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Size</label>
        <input
          type="text"
          value={size}
          onChange={(e) => {
            setSize(e.target.value);
            setError(null);
          }}
          placeholder="e.g. XL, XXL, 54"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </ModalShell>
  );
}

/** Splits a comma-separated input into trimmed, non-empty values. */
function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 cursor-pointer ${
        active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
    >
      {children}
    </button>
  );
}
