'use client';

import { useMemo } from 'react';
import { DIFF_TONE_CLASSES } from './StoreDiffFieldRow';
import StoreImageTile, { StoreImageAddTile } from './StoreImageTile';
import { groupImagesByColour, storeImageColours, type ImageColourGroup, type StoreVariantTableRow } from './storeDiff';
import type { StoreImageActions } from './hooks/useStoreImageActions';
import { Trash } from './icons';
import type { ProductImage, ProductRecord, StoreListingResult } from './types';

type StoreDiffImagesSectionProps = {
  product: ProductRecord;
  listing: StoreListingResult;
  rows: StoreVariantTableRow[];
  actions: StoreImageActions;
  savingKey: string | null;
};

type Group<T extends { id: string }> = ImageColourGroup<T>;

/**
 * The differences modal's Images section — the store's gallery beside the system's, grouped by
 * colour so each colour's images line up across the two columns. Store images are edited in place:
 * update one by upload or from a system image, delete one, delete a whole colour, add a new one,
 * delete all, or replace the lot with the system gallery. A store image's colour comes from the variants that link it (a store has
 * no colour field on an image), so one no variant uses lands in "Unassigned".
 */
export default function StoreDiffImagesSection({ product, listing, rows, actions, savingKey }: StoreDiffImagesSectionProps) {
  const t = DIFF_TONE_CLASSES.details;
  const colourOrder = useMemo(() => product.colours.map((c) => c.name), [product.colours]);
  const swatches = useMemo(() => new Map(product.colours.map((c) => [c.name.trim().toLowerCase(), c.color])), [product.colours]);

  const storeGroups = useMemo(() => {
    const colours = storeImageColours(rows);
    return groupImagesByColour(listing.images, (img) => colours.get(img.id), colourOrder);
  }, [listing.images, rows, colourOrder]);
  const systemGroups = useMemo(() => groupImagesByColour(product.images, (img) => img.colour, colourOrder), [product.images, colourOrder]);

  const busy = savingKey !== null;
  const total = listing.images.length;
  const systemImages = product.images;
  const mismatch = product.images.length !== total;

  return (
    <div className={`rounded-[8px] border ${t.border} ${t.tint} p-[8px]`}>
      <div className="flex flex-wrap items-center justify-between gap-[8px]">
        <div className="flex items-baseline gap-[8px]">
          <span className={`text-[10px] font-bold uppercase leading-none tracking-[0.3px] ${t.text}`}>Images</span>
          {mismatch && <span className="text-[10px] text-inventory-text-subtle">Store has {total}, system has {product.images.length}</span>}
        </div>
        <div className="flex flex-wrap gap-[6px]">
          <button
            type="button"
            onClick={actions.removeAll}
            disabled={busy || total === 0}
            className="flex h-[22px] items-center gap-[4px] rounded-[6px] border border-inventory-danger/40 px-[8px] text-[10px] font-bold text-inventory-danger-hover transition-colors duration-150 hover:bg-inventory-danger/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Trash className="h-3 w-3" />
            Delete all
          </button>
          <button
            type="button"
            onClick={actions.replaceAll}
            disabled={busy || product.images.length === 0}
            className="flex h-[22px] items-center rounded-[6px] bg-inventory-primary px-[8px] text-[10px] font-bold text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {savingKey === 'images' ? 'Saving…' : 'Replace all with system images'}
          </button>
        </div>
      </div>

      <div className="mt-[8px] overflow-x-auto thin-scroll">
        <div className="grid min-w-[520px] grid-cols-2 gap-x-[12px]">
          <ImageColumn
            title={`Store (${total})`}
            groups={storeGroups}
            swatches={swatches}
            side="store"
            systemImages={systemImages}
            positionCount={total}
            savingKey={savingKey}
            actions={actions}
          />
          <ImageColumn title={`System (${product.images.length})`} groups={systemGroups} swatches={swatches} side="system" savingKey={savingKey} actions={actions} />
          <div className="col-span-2 mt-[6px] border-t border-inventory-divider pt-[8px]">
            <StoreImageAddTile onClick={actions.openAdd} busy={busy} />
          </div>
        </div>
      </div>
    </div>
  );
}

type ColumnImage = { id: string; url: string; altText: string | null; position: number };

type ImageColumnProps = {
  title: string;
  groups: Group<ColumnImage>[];
  swatches: Map<string, string>;
  side: 'store' | 'system';
  systemImages?: ProductImage[];
  positionCount?: number;
  savingKey: string | null;
  actions: StoreImageActions;
};

/** One side of the Images section: the colours as compact cells in a wrapping grid (normally one
 * image each), then the images tied to no colour in their own "Unassigned" grid below. Store
 * tiles carry the edit buttons and a position dropdown; system tiles are just the picture. */
function ImageColumn({ title, groups, swatches, side, systemImages, positionCount, savingKey, actions }: ImageColumnProps) {
  const coloured = groups.filter((g) => g.key !== '');
  const unassigned = groups.find((g) => g.key === '');
  const noun = side === 'store' ? 'the store' : 'the system';

  return (
    <section className="min-w-0" aria-label={`${side} images`}>
      <p className="mb-[4px] text-[9px] font-semibold uppercase tracking-[0.3px] text-inventory-text-subtle">{title}</p>
      {groups.length === 0 && <p className="border-t border-inventory-divider py-[8px] text-[10.5px] text-inventory-text-subtle">None on {noun}</p>}
      {coloured.length > 0 && (
        <div className="flex flex-wrap gap-[8px] border-t border-inventory-divider py-[8px]">
          {coloured.map((group) => (
            <ImageGroupCell key={group.key} group={group} swatch={swatches.get(group.key)} side={side} systemImages={systemImages} positionCount={positionCount} savingKey={savingKey} actions={actions} />
          ))}
        </div>
      )}
      {unassigned && (
        <div className="border-t border-inventory-divider py-[8px]">
          <ImageGroupCell group={unassigned} side={side} systemImages={systemImages} positionCount={positionCount} savingKey={savingKey} actions={actions} bare />
        </div>
      )}
    </section>
  );
}

type ImageGroupCellProps = {
  group: Group<ColumnImage>;
  swatch?: string;
  side: 'store' | 'system';
  systemImages?: ProductImage[];
  positionCount?: number;
  savingKey: string | null;
  actions: StoreImageActions;
  /** Unassigned block: no cell border, tiles wrap across the full column width. */
  bare?: boolean;
};

function ImageGroupCell({ group, swatch, side, systemImages, positionCount, savingKey, actions, bare }: ImageGroupCellProps) {
  const busy = savingKey !== null;
  const isStore = side === 'store';
  return (
    <div className={bare ? 'min-w-0' : 'min-w-0 rounded-[8px] border border-inventory-divider p-[6px]'} aria-label={`${group.label} — ${side} images`}>
      <GroupHeader label={group.label} swatch={bare ? undefined : swatch} count={group.images.length}>
        {isStore && !bare && (
          <button
            type="button"
            onClick={() => actions.removeColour(group)}
            disabled={busy}
            aria-label={`Delete all ${group.label} images from the store`}
            title={`Delete all ${group.label} images`}
            className="flex h-[20px] w-[20px] items-center justify-center rounded-[5px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-danger/10 hover:text-inventory-danger disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Trash className="h-3 w-3" />
          </button>
        )}
      </GroupHeader>
      <div className="mt-[5px] flex flex-wrap gap-[8px]">
        {group.images.map((img) =>
          isStore ? (
            <StoreImageTile
              key={img.id}
              url={img.url}
              altText={img.altText}
              position={img.position}
              busy={busy}
              saving={savingKey === `image:${img.id}`}
              systemImages={systemImages}
              positionCount={positionCount}
              onMove={(position) => actions.move(img, position)}
              onUploadUpdate={() => actions.openUpload(img)}
              onSystemUpdate={(systemImage) => actions.updateFromSystem(img, systemImage)}
              onDelete={() => actions.removeOne(img)}
            />
          ) : (
            <StoreImageTile key={img.id} url={img.url} altText={img.altText} position={img.position} />
          )
        )}
      </div>
    </div>
  );
}

function GroupHeader({ label, swatch, count, children }: { label: string; swatch?: string; count: number; children?: React.ReactNode }) {
  return (
    <div className="flex h-[20px] items-center justify-between gap-[6px]">
      <span className="flex min-w-0 items-center gap-[5px] text-[10.5px] font-semibold text-inventory-text">
        <span
          className="h-[10px] w-[10px] shrink-0 rounded-full border border-inventory-border-strong"
          style={swatch ? { backgroundColor: swatch } : undefined}
          aria-hidden="true"
        />
        <span className="truncate">{label}</span>
        <span className="font-normal tabular-nums text-inventory-text-subtle">{count}</span>
      </span>
      {children}
    </div>
  );
}
