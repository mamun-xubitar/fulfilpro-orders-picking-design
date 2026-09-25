'use client';

import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel } from './ProductFieldRows';
import TaxonomyAddButton from './TaxonomyAddButton';
import { useAnchoredDropdown } from './hooks/useAnchoredDropdown';
import type { InventoryCategoriesState } from './hooks/useInventoryCategories';

type HubCategoryPickerProps = {
  value: { id: string | null; name: string };
  onChange: (category: { id: string | null; name: string }) => void;
  categories: InventoryCategoriesState;
};

/**
 * Flat, searchable hub-only Category — item 1's addition alongside the (nested) Shopify Category
 * above it. Unlike CategoryPicker, this never hits Shopify: the list is loaded once page-wide
 * (useInventoryCategories) and filtered client-side, same mechanics as SupplierMultiSelect. The
 * trigger is a button (not a text input) with the search box living inside the dropdown, matching
 * CategoryPicker's own pattern — the input only ever commits a real category (pick a suggestion
 * or Add), so `inventoryCategoryId` can never point at text that was never saved as a category.
 */
export default function HubCategoryPicker({ value, onChange, categories }: HubCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredDropdown({ anchorRef, dropdownRef, open, onClose: () => setOpen(false), width: 260, maxHeight: 224 });

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return categories.categories;
    return categories.categories.filter((c) => c.name.toLowerCase().includes(term));
  }, [categories.categories, query]);

  const select = (category: { id: string; name: string }) => {
    onChange(category);
    setOpen(false);
  };

  const handleAdd = async (name: string) => {
    const created = await categories.create(name);
    if (created) select(created);
  };

  return (
    <div className="min-w-0">
      <FieldLabel>Category</FieldLabel>
      <div className="relative">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => {
            setQuery('');
            setOpen((prev) => !prev);
          }}
          className="flex h-[24px] w-full items-center justify-between rounded-[7px] border border-inventory-border-strong px-[6px] text-left text-[11px] leading-none outline-none hover:bg-inventory-surface-hover focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
        >
          <span className={`truncate uppercase ${value.name ? 'text-inventory-text' : 'text-inventory-text-subtle'}`} title={value.name || undefined}>
            {value.name || 'Unassigned'}
          </span>
        </button>

        {open && position && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-[70] flex max-h-56 flex-col overflow-hidden rounded-lg border border-inventory-border bg-inventory-surface py-1 shadow-lg inventory-dropdown-in"
          >
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder={categories.categories.length === 0 ? 'No categories yet — type to add' : 'Search or add a category…'}
              className="mx-1 mb-1 h-[24px] shrink-0 rounded-[6px] border border-inventory-border px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:text-inventory-text-subtle"
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {value.id && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange({ id: null, name: '' });
                    setOpen(false);
                  }}
                  className="block w-full truncate px-2 py-1 text-left text-[11px] font-medium leading-none text-inventory-text-subtle hover:bg-inventory-surface-hover cursor-pointer"
                >
                  Clear category
                </button>
              )}
              {categories.loading && <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">Loading…</div>}
              {!categories.loading && results.length === 0 && query.trim() === '' && (
                <div className="px-2 py-1 text-[11px] text-inventory-text-subtle">No categories yet — type to add one</div>
              )}
              {!categories.loading &&
                results.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(category);
                    }}
                    className="block w-full truncate px-2 py-1 text-left text-[11px] leading-none text-inventory-text hover:bg-inventory-surface-hover cursor-pointer"
                  >
                    {category.name}
                  </button>
                ))}
              {!categories.loading && (
                <TaxonomyAddButton query={query} options={categories.categories.map((c) => c.name)} label="category" onAdd={handleAdd} />
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
