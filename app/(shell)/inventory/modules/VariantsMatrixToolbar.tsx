'use client';

import { useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { STATUS_LEGEND } from './constants';
import type { InventoryPage } from './hooks/useInventoryPage';
import { Adjust, Download, Expand, Plus } from './icons';

type VariantsMatrixToolbarProps = { p: InventoryPage };

export default function VariantsMatrixToolbar({ p }: VariantsMatrixToolbarProps) {
  const { matrix } = p;
  const onAction = p.notImplemented;
  const [addColourOpen, setAddColourOpen] = useState(false);
  const [addSizeOpen, setAddSizeOpen] = useState(false);

  const exportCsv = () => p.importExport.exportVariants(matrix.rows);
  const selectedColours = () => {
    const source = matrix.rows.filter((r) => matrix.selectedIds.has(r.id));
    return [...new Set(source.map((r) => r.colour))];
  };
  const applyToSelected = () => p.pricing.applyToColours(selectedColours());
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
            {name}
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
          Export to Excel
        </SecondaryButton>
        <SecondaryButton onClick={matrix.toggleAllRows}>{matrix.allRowsSelected ? 'Deselect all Colours' : 'Select all Colours'}</SecondaryButton>
        <button
          type="button"
          onClick={applyToSelected}
          disabled={matrix.selectedIds.size === 0 || p.pricing.applying}
          title="Applies the pricing panel's current sell/buy price to every variant of the selected colours"
          className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Apply to selected colours
        </button>
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
          onClick={createPo}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
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

      {addColourOpen && (
        <AddColourModal
          onClose={() => setAddColourOpen(false)}
          onAdd={(colour) => {
            p.details.quickAddColour(colour);
            setAddColourOpen(false);
          }}
        />
      )}
      {addSizeOpen && (
        <AddSizeModal
          onClose={() => setAddSizeOpen(false)}
          onAdd={(size) => {
            p.details.quickAddSize(size);
            setAddSizeOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AddColourModal({ onClose, onAdd }: { onClose: () => void; onAdd: (colour: { name: string; hex: string }) => void }) {
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#cbd5e1');

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
            onClick={() => name.trim() && onAdd({ name: name.trim(), hex })}
            disabled={!name.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Add colour
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Black"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Swatch</label>
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-gray-300" />
          <span className="text-xs text-gray-500 tabular-nums">{hex}</span>
        </div>
      </div>
    </ModalShell>
  );
}

function AddSizeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (size: string) => void }) {
  const [size, setSize] = useState('');

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
            onClick={() => size.trim() && onAdd(size.trim())}
            disabled={!size.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Add size
          </button>
        </div>
      }
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Size</label>
        <input
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="e.g. XL or 54"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
    </ModalShell>
  );
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
