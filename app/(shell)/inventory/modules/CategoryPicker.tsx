'use client';

import { createPortal } from 'react-dom';
import { FieldLabel } from './ProductFieldRows';
import { ChevronUpDown, Close } from './icons';
import CategoryPickerMenu from './CategoryPickerMenu';
import { useCategoryPicker } from './hooks/useCategoryPicker';

type CategoryPickerProps = {
  /** `name` is the full taxonomy path ("Apparel & Accessories > … > Visors") — what Shopify's
   * product-CSV `Product Category` column needs, not just the leaf. */
  value: { id: string | null; name: string };
  onChange: (category: { id: string | null; name: string }) => void;
  /** Overrides the field label — "Shopify Category" everywhere this taxonomy tree is now shown,
   * to distinguish it from the flat hub-only Category (HubCategoryPicker). */
  label?: string;
  /** Suppresses the field's own label row — for a caller (e.g. StoreDiffFieldRow) that renders
   * its own label alongside the current store value. */
  hideLabel?: boolean;
};

/**
 * Shopify-admin-style category picker over the live Shopify taxonomy: nothing selected by
 * default, rows with children drill in, the parent is a selectable header one level down, and
 * reopening lands on the selected category's level. The trigger reads "Leaf in Parent" with an
 * × to clear.
 */
export default function CategoryPicker({ value, onChange, label = 'Shopify Category', hideLabel }: CategoryPickerProps) {
  const {
    query, setQuery, open, path, results, loading, position, anchorRef, dropdownRef, searching, selectedId, toggle, goBack, drillInto, select, clear,
  } = useCategoryPicker({ value, onChange });
  const segments = value.name ? value.name.split(' > ') : [];
  const leaf = segments[segments.length - 1];
  const parent = segments.length > 1 ? segments[segments.length - 2] : null;

  return (
    <div className="min-w-0">
      {!hideLabel && <FieldLabel>{label}</FieldLabel>}
      <div
        ref={anchorRef}
        className="flex h-[24px] w-full items-center rounded-[7px] border border-inventory-border-strong focus-within:border-inventory-primary focus-within:ring-2 focus-within:ring-inventory-primary-ring"
      >
        <button
          type="button"
          onClick={toggle}
          className="flex h-full min-w-0 flex-1 items-center gap-1 pl-[6px] text-left text-[11px] leading-none outline-none cursor-pointer"
          title={value.name || undefined}
        >
          {leaf ? (
            <span className="truncate">
              <span className="font-medium text-inventory-text">{leaf}</span>
              {parent && <span className="text-inventory-text-muted"> in {parent}</span>}
            </span>
          ) : (
            <span className="truncate text-inventory-text-subtle">Choose a product category</span>
          )}
        </button>
        {leaf && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear category"
            title="Clear category"
            className="shrink-0 px-1 text-inventory-text-muted hover:text-inventory-text cursor-pointer"
          >
            <Close className="h-3 w-3" />
          </button>
        )}
        <ChevronUpDown className="mr-[5px] h-3.5 w-3.5 shrink-0 text-inventory-text-muted pointer-events-none" />
      </div>

      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: position.top, bottom: position.bottom, left: position.left, width: position.width }}
          className="z-[70] flex max-h-72 flex-col overflow-hidden rounded-lg border border-inventory-border bg-inventory-surface shadow-lg inventory-dropdown-in"
        >
          <CategoryPickerMenu
            query={query}
            onQueryChange={setQuery}
            path={path}
            results={results}
            loading={loading}
            searching={searching}
            selectedId={selectedId}
            onBack={goBack}
            onDrill={drillInto}
            onSelect={select}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
