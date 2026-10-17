import { ArrowLeft, Check, ChevronRight, Search } from './icons';
import type { CategoryPathEntry, TaxonomyCategory } from './hooks/useCategoryPicker';

type CategoryPickerMenuProps = {
  query: string;
  onQueryChange: (query: string) => void;
  path: CategoryPathEntry[];
  results: TaxonomyCategory[];
  loading: boolean;
  searching: boolean;
  selectedId: string | null;
  onBack: () => void;
  onDrill: (category: TaxonomyCategory) => void;
  onSelect: (category: { id: string; fullName: string }) => void;
};

const ROW = 'flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] leading-none cursor-pointer';

function CheckSlot({ checked }: { checked: boolean }) {
  return <span className="flex w-3 shrink-0 justify-center">{checked && <Check className="h-3 w-3 text-inventory-text" />}</span>;
}

/**
 * Body of the category dropdown, mirroring Shopify's picker: a search box, then either the
 * top-level list or — one level in — a back row, the parent itself as a selectable grey header,
 * and its children. Rows with children drill in on click; leaves select.
 */
export default function CategoryPickerMenu({
  query,
  onQueryChange,
  path,
  results,
  loading,
  searching,
  selectedId,
  onBack,
  onDrill,
  onSelect,
}: CategoryPickerMenuProps) {
  const header = path.length > 0 && !searching ? path[path.length - 1] : null;
  const showBack = searching || path.length > 0;
  const backLabel = searching || path.length < 2 ? 'All' : path[path.length - 2].name;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-inventory-divider px-2 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-inventory-text-muted" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search categories"
          className="h-[18px] min-w-0 flex-1 bg-transparent text-[11px] leading-none outline-none placeholder:text-inventory-text-subtle"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
        {showBack && (
          <button type="button" onClick={onBack} className={`${ROW} border-b border-inventory-divider text-inventory-text-muted hover:bg-inventory-surface-hover`}>
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Back to {backLabel}</span>
          </button>
        )}
        {header && (
          <button
            type="button"
            onClick={() => onSelect(header)}
            className={`${ROW} border-b border-inventory-divider bg-inventory-surface-muted font-medium text-inventory-text hover:bg-inventory-surface-hover`}
          >
            <CheckSlot checked={header.id === selectedId} />
            <span className="truncate">{header.name}</span>
          </button>
        )}
        {loading && <div className="px-2 py-1.5 text-[11px] text-inventory-text-subtle">Loading…</div>}
        {!loading &&
          results.map((category) => {
            const drills = !searching && !category.isLeaf;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => (drills ? onDrill(category) : onSelect(category))}
                className={`${ROW} text-inventory-text hover:bg-inventory-surface-hover`}
              >
                <CheckSlot checked={category.id === selectedId} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{category.name}</span>
                  {searching && <span className="mt-0.5 block truncate text-[10px] text-inventory-text-subtle">{category.fullName}</span>}
                </span>
                {drills && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-inventory-text-muted" />}
              </button>
            );
          })}
        {!loading && results.length === 0 && <div className="px-2 py-1.5 text-[11px] text-inventory-text-subtle">No matches</div>}
      </div>
    </>
  );
}
