'use client';

import { useMemo } from 'react';
import { DIFF_TONE_CLASSES } from './StoreDiffFieldRow';
import StoreImageTile, { StoreImageAddTile } from './StoreImageTile';
import { groupImagesByColour, storeImageColours, type ImageColourGroup, type StoreVariantTableRow } from './storeDiff';
import type { StoreImageActions } from './hooks/useStoreImageActions';
import { Trash } from './icons';
import type { ProductImage, ProductRecord, StoreListingImage, StoreListingResult } from './types';

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

  // One row per colour present on either side, in the same order, so a colour's store and system
  // images sit across from each other.
  const keys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: { key: string; label: string }[] = [];
    for (const g of [...systemGroups, ...storeGroups]) {
      if (seen.has(g.key)) continue;
      seen.add(g.key);
      ordered.push({ key: g.key, label: g.label });
    }
    // Images tied to no colour go last.
    return [...ordered.filter((o) => o.key !== ''), ...ordered.filter((o) => o.key === '')];
  }, [systemGroups, storeGroups]);

  const storeByKey = new Map(storeGroups.map((g) => [g.key, g]));
  const systemByKey = new Map(systemGroups.map((g) => [g.key, g]));
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
          <p className="mb-[4px] text-[9px] font-semibold uppercase tracking-[0.3px] text-inventory-text-subtle">Store ({total})</p>
          <p className="mb-[4px] text-[9px] font-semibold uppercase tracking-[0.3px] text-inventory-text-subtle">System ({product.images.length})</p>
          {keys.map(({ key, label }) => (
            <ColourRow
              key={key}
              label={label}
              swatch={swatches.get(key)}
              store={storeByKey.get(key)}
              system={systemByKey.get(key)}
              systemImages={systemImages}
              savingKey={savingKey}
              actions={actions}
            />
          ))}
          <div className="col-span-2 mt-[6px] border-t border-inventory-divider pt-[8px]">
            <StoreImageAddTile onClick={actions.openAdd} busy={busy} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ColourRow({
  label,
  swatch,
  store,
  system,
  systemImages,
  savingKey,
  actions,
}: {
  label: string;
  swatch: string | undefined;
  store: Group<StoreListingImage> | undefined;
  system: Group<{ id: string; url: string; altText: string | null }> | undefined;
  systemImages: ProductImage[];
  savingKey: string | null;
  actions: StoreImageActions;
}) {
  const busy = savingKey !== null;
  return (
    <>
      <section className="min-w-0 border-t border-inventory-divider py-[8px]" aria-label={`${label} — store images`}>
        <GroupHeader label={label} swatch={swatch} count={store?.images.length ?? 0}>
          {store && (
            <button
              type="button"
              onClick={() => actions.removeColour(store)}
              disabled={busy}
              aria-label={`Delete all ${label} images from the store`}
              title={`Delete all ${label} images`}
              className="flex h-[20px] w-[20px] items-center justify-center rounded-[5px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-danger/10 hover:text-inventory-danger disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Trash className="h-3 w-3" />
            </button>
          )}
        </GroupHeader>
        <div className="mt-[5px] flex flex-wrap gap-[8px]">
          {store ? (
            store.images.map((img) => (
              <StoreImageTile
                key={img.id}
                url={img.url}
                altText={img.altText}
                position={img.position}
                busy={busy}
                saving={savingKey === `image:${img.id}`}
                systemImages={systemImages}
                onUploadUpdate={() => actions.openUpload(img)}
                onSystemUpdate={(systemImage) => actions.updateFromSystem(img, systemImage)}
                onDelete={() => actions.removeOne(img)}
              />
            ))
          ) : (
            <p className="py-[6px] text-[10.5px] text-inventory-text-subtle">None on the store</p>
          )}
        </div>
      </section>
      <section className="min-w-0 border-t border-inventory-divider py-[8px]" aria-label={`${label} — system images`}>
        <GroupHeader label={label} swatch={swatch} count={system?.images.length ?? 0} />
        <div className="mt-[5px] flex flex-wrap gap-[8px]">
          {system ? (
            system.images.map((img) => <StoreImageTile key={img.id} url={img.url} altText={img.altText} position={img.position} />)
          ) : (
            <p className="py-[6px] text-[10.5px] text-inventory-text-subtle">None on the system</p>
          )}
        </div>
      </section>
    </>
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
