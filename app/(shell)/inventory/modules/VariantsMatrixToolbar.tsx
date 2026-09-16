'use client';

import { useState } from 'react';
import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import { deriveColorFromName, formatColourName, formatColoursInput, parseColoursInput, resolveSwatch } from '@/lib/inventory/colour';
import PresetComboField from './PresetComboField';
import { STATUS_LEGEND } from './constants';
import type { InventoryPage } from './hooks/useInventoryPage';
import type { InventoryPresetsState } from './hooks/useInventoryPresets';
import { Adjust, Download, Expand, Plus, Trash } from './icons';
import { BTN_XS } from './MainImagePanel';
import { capitaliseFirst, formatSizesInput, parseSizesInput } from './utils';

type VariantsMatrixToolbarProps = {
  p: InventoryPage;
  /** True when this toolbar is rendered inside the full-screen "Full view" modal — flips the
   * expand button into a "Exit full view" close action instead of opening the modal again. */
  fullView?: boolean;
};

export default function VariantsMatrixToolbar({ p, fullView }: VariantsMatrixToolbarProps) {
  const { matrix } = p;
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
        className="h-[22px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[10.5px] leading-none text-inventory-text-muted shadow-sm outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
      >
        <option value="">All sizes</option>
        {matrix.sizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

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
        <SecondaryButton onClick={exportCsv}>
          <Download className="h-3 w-3" />
          Export CSV
        </SecondaryButton>
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

        <SecondaryButton onClick={() => setAddColourOpen(true)}>
          <Plus className="h-3 w-3" />
          Colour
        </SecondaryButton>
        <SecondaryButton onClick={() => setAddSizeOpen(true)}>
          <Plus className="h-3 w-3" />
          Size
        </SecondaryButton>
      </div>

      {addColourOpen && <AddColourModal onClose={() => setAddColourOpen(false)} onAdd={p.details.quickAddColours} presets={p.presets} />}
      {addSizeOpen && <AddSizeModal onClose={() => setAddSizeOpen(false)} onAdd={p.details.quickAddSizes} presets={p.presets} />}
    </div>
  );
}

/** Both quick-add modals reuse PresetComboField — same badge dropdown, comma parsing, instant
 * duplicate validation and preset write-back-on-blur as the Colours/Sizes fields in Product
 * details. "Add colour(s)" here is a separate action from that write-back: it appends the parsed
 * names onto *this product's* colour/size list via quickAddColours/quickAddSizes, while the field
 * itself independently persists any brand-new name as a global preset on blur. */
function AddColourModal({
  onClose,
  onAdd,
  presets,
}: {
  onClose: () => void;
  onAdd: (names: string[]) => string | null;
  presets: InventoryPresetsState;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const names = parseColoursInput(value).map((c) => c.name);

  const handleAdd = () => {
    if (names.length === 0) return;
    const err = onAdd(names);
    if (err) setError(err);
    else onClose();
  };

  return (
    <ModalShell disableBackdropClose
      title="Add colour"
      compact
      onClose={onClose}
      wide
      allowOverflow
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={names.length === 0}
            className={`flex-1 ${MODAL_FOOTER_BTN_PRIMARY}`}
          >
            Add colour{names.length > 1 ? 's' : ''}
          </button>
        </div>
      }
    >
      <PresetComboField
        label="Name"
        kind="colour"
        value={value}
        editing
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onValueChange={(next) => {
          setValue(next);
          setError(null);
        }}
        error={error ?? undefined}
        presets={presets}
        placeholder="e.g. Black, Hot Pink, Navy"
        parse={parseColoursInput}
        format={formatColoursInput}
        renderReadOnly={() => null}
        renderChips={(entries) => <ModalChips names={entries.map((e) => e.name)} kind="colour" />}
      />
    </ModalShell>
  );
}

function AddSizeModal({
  onClose,
  onAdd,
  presets,
}: {
  onClose: () => void;
  onAdd: (sizes: string[]) => string | null;
  presets: InventoryPresetsState;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sizes = parseSizesInput(value);

  const handleAdd = () => {
    if (sizes.length === 0) return;
    const err = onAdd(sizes);
    if (err) setError(err);
    else onClose();
  };

  return (
    <ModalShell disableBackdropClose
      title="Add size"
      compact
      onClose={onClose}
      wide
      allowOverflow
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={sizes.length === 0}
            className={`flex-1 ${MODAL_FOOTER_BTN_PRIMARY}`}
          >
            Add size{sizes.length > 1 ? 's' : ''}
          </button>
        </div>
      }
    >
      <PresetComboField
        label="Size"
        kind="size"
        value={value}
        editing
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onValueChange={(next) => {
          setValue(next);
          setError(null);
        }}
        error={error ?? undefined}
        presets={presets}
        placeholder="e.g. XL, XXL, 54"
        parse={(v) => parseSizesInput(v).map((name) => ({ name }))}
        format={(entries) => formatSizesInput(entries.map((e) => e.name))}
        renderReadOnly={() => null}
        renderChips={(entries) => <ModalChips names={entries.map((e) => e.name)} kind="size" />}
      />
    </ModalShell>
  );
}

/** Chip preview inside the quick-add modals — mirrors ColourChips/SizeChips: a swatch dot for a
 * colour (derived from the name, same as PresetPicker's badges — nothing is stored) and
 * first-letter-capitalised display text, consistent with the Colours/Sizes fields in Product
 * details and the New Product wizard. */
function ModalChips({ names, kind }: { names: string[]; kind: 'colour' | 'size' }) {
  return (
    <>
      {names.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-inventory-border bg-inventory-surface px-2 py-0.5 text-[11px] font-semibold text-inventory-text-muted"
        >
          {kind === 'colour' && (
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: resolveSwatch(deriveColorFromName(name)) }}
            />
          )}
          {kind === 'colour' ? formatColourName(name) : capitaliseFirst(name)}
        </span>
      ))}
    </>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border px-[7px] text-[10px] font-semibold leading-none transition-colors duration-150 cursor-pointer ${
        active ? 'border-inventory-primary bg-inventory-primary text-white' : 'border-inventory-border-strong bg-inventory-surface text-inventory-text-muted hover:bg-inventory-surface-hover'
      }`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={BTN_XS}>
      {children}
    </button>
  );
}
