'use client';

import { useEffect, useRef, useState } from 'react';

export type TaxonomyCategory = { id: string; name: string; fullName: string; isLeaf: boolean };
export type CategoryValue = { id: string | null; name: string };
export type CategoryPathEntry = { id: string; name: string; fullName: string };
/** Opens below the trigger (`top`) or, when there's no room, above it (`bottom`), so the menu sits
 * flush against the trigger whatever height its content settles at. */
export type CategoryDropdownPosition = { top?: number; bottom?: number; left: number; width: number };

type ApiResponse<T> = { success: boolean; message: string; data: T };

const MENU_HEIGHT = 288;

/**
 * Shopify taxonomy ids encode their ancestry (`…/ae-2-1-2` descends from `ae`, `ae-2`, `ae-2-1`)
 * and `value.name` is the matching `A > B > C` path, so pairing them rebuilds the drill-down
 * path of a selected category without an extra request. Returns [] (root level) when the two
 * don't line up.
 */
export function ancestorPath(value: CategoryValue): CategoryPathEntry[] {
  if (!value.id || !value.name) return [];
  const match = value.id.match(/^(.*\/)([^/]+)$/);
  if (!match) return [];
  const [, prefix, code] = match;
  const codes = code.split('-');
  const names = value.name.split(' > ');
  if (codes.length !== names.length) return [];
  return codes.slice(0, -1).map((_, i) => ({
    id: `${prefix}${codes.slice(0, i + 1).join('-')}`,
    name: names[i],
    fullName: names.slice(0, i + 1).join(' > '),
  }));
}

export function useCategoryPicker({ value, onChange }: { value: CategoryValue; onChange: (category: CategoryValue) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<CategoryPathEntry[]>([]);
  const [results, setResults] = useState<TaxonomyCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<CategoryDropdownPosition | null>(null);
  // Id of a value that only has a name (older products saved before category ids were stored).
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  // Portalled to document.body (fixed position) so the Product details panel's
  // `overflow-y-auto` scroll container can't clip it — same as SupplierMultiSelect.
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const below = window.innerHeight - rect.bottom;
      const flip = below < MENU_HEIGHT && rect.top > below;
      const top = flip ? undefined : rect.bottom + 4;
      const bottom = flip ? window.innerHeight - rect.top + 4 : undefined;
      setPosition((prev) =>
        prev && prev.top === top && prev.bottom === bottom && prev.left === left && prev.width === width ? prev : { top, bottom, left, width }
      );
    };
    updatePosition();
    const panel = anchorRef.current?.closest('section');
    const resizeObserver = panel ? new ResizeObserver(updatePosition) : null;
    if (panel) resizeObserver?.observe(panel);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  // Typing is debounced; drilling in/out of a level fetches immediately.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) {
          params.set('q', query.trim());
        } else if (path.length > 0) {
          params.set('parentId', path[path.length - 1].id);
        }
        const res = await fetch(`/api/inventory/taxonomy?${params.toString()}`);
        const json = (await res.json()) as ApiResponse<{ categories: TaxonomyCategory[] }>;
        if (!cancelled && res.ok && json.success) setResults(json.data.categories);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timeout = setTimeout(run, query.trim() ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, path, open]);

  const searching = query.trim().length > 0;

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setQuery('');
    setPath(ancestorPath(value));
    setResults([]);
    setResolvedId(null);
    setOpen(true);
    if (!value.id && value.name) void resolveNamedValue(value.name);
  };

  // Older products store only the full path name. Look the id up so reopening still lands on
  // the selected level (and shows its ✓), but never override a level the user already moved to.
  const resolveNamedValue = async (name: string) => {
    const leaf = name.split(' > ').pop() ?? name;
    try {
      const res = await fetch(`/api/inventory/taxonomy?${new URLSearchParams({ q: leaf }).toString()}`);
      const json = (await res.json()) as ApiResponse<{ categories: TaxonomyCategory[] }>;
      const match = res.ok && json.success ? json.data.categories.find((c) => c.fullName === name) : undefined;
      if (!match) return;
      setResolvedId(match.id);
      setPath((prev) => (prev.length === 0 ? ancestorPath({ id: match.id, name }) : prev));
    } catch {
      // Falls back to the top level — the picker still works.
    }
  };

  const goBack = () => {
    if (searching) {
      setQuery('');
      return;
    }
    setPath((prev) => prev.slice(0, -1));
  };

  const drillInto = (category: TaxonomyCategory) => {
    setQuery('');
    setPath((prev) => [...prev, { id: category.id, name: category.name, fullName: category.fullName }]);
  };

  const select = (category: { id: string; fullName: string }) => {
    onChange({ id: category.id, name: category.fullName });
    setOpen(false);
  };

  const clear = () => onChange({ id: null, name: '' });

  const selectedId = value.id ?? resolvedId;

  return { query, setQuery, open, path, results, loading, position, anchorRef, dropdownRef, searching, selectedId, toggle, goBack, drillInto, select, clear };
}
