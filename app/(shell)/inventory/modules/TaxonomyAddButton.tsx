'use client';

type TaxonomyAddButtonProps = {
  /** Current search text. */
  query: string;
  /** Existing option strings (comparison is case-insensitive). */
  options: string[];
  /** Noun for the button, e.g. "type", "vendor", "tag". */
  label: string;
  onAdd: (value: string) => void;
};

/**
 * Explicit Add button for the searchable Shopify dropdowns (Type, Vendor, Tags) — shown only
 * when the search text has no exact (case-insensitive) match, so "no match" always offers a
 * way forward: the new value is added to the existing data and selected immediately.
 */
export default function TaxonomyAddButton({ query, options, label, onAdd }: TaxonomyAddButtonProps) {
  const clean = query.trim();
  if (!clean) return null;
  const exists = options.some((o) => o.trim().toLowerCase() === clean.toLowerCase());
  if (exists) return null;

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onAdd(clean);
      }}
      className="flex w-full items-center gap-1.5 border-t border-dashed border-gray-200 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
    >
      <span aria-hidden>+</span>
      <span className="truncate">
        Add “<span className="font-bold">{clean}</span>” as {label}
      </span>
    </button>
  );
}
