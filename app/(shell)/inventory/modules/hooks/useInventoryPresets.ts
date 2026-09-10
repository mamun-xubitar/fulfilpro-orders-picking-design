'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { groupKeyOf, groupLabel } from '../utils';

export type PresetGroupOption = { id: string; items: string[]; key: string };

type PresetsResponse = { colours: PresetGroupOption[]; sizes: PresetGroupOption[] };

/** A→Z, numeric-aware (so "(2, 4)" precedes "(10, 12)") — the server orders by raw lowercased
 * `key` instead, which would put "10" before "2" and doesn't reflect display order for a
 * multi-member group anyway. Applied on load and after every create so the dropdown and its
 * badges always read alphabetically regardless of insertion order. Groups sort A→Z; members
 * *within* a group keep the order they were typed in (see groupLabel). */
function byGroupLabelAsc<T extends { items: string[] }>(list: T[]): T[] {
  return [...list].sort((a, b) => groupLabel(a.items).localeCompare(groupLabel(b.items), undefined, { numeric: true, sensitivity: 'base' }));
}

/** Global colour/size preset *groups*, loaded once page-wide and shared by every Product details
 * / wizard field that offers the preset picker — see PresetPicker.tsx. A group is e.g.
 * (Red, Green, Blue): clicking it in the picker inserts every member at once. */
export function useInventoryPresets() {
  const [colours, setColours] = useState<PresetGroupOption[]>([]);
  const [sizes, setSizes] = useState<PresetGroupOption[]>([]);
  const { request: requestList, loading } = useRequest<PresetsResponse>();
  const { request: requestEnsure, loading: savingPreset } = useRequest<{ group: PresetGroupOption; created: boolean }>();
  const { request: requestBulkDelete } = useRequest<{ count: number }>();

  const load = () => {
    requestList({
      url: '/api/inventory/presets',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        setColours(byGroupLabelAsc(data.colours));
        setSizes(byGroupLabelAsc(data.sizes));
      },
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  /** Persists `items` as a preset group if that exact (order-insensitive) combination isn't
   * already known — resolving without any network call when `items` is empty or already matches
   * a loaded group, which is what makes it safe to call on *every* save (Save / Next / Add
   * colour / Add sizes), not just when the admin explicitly typed something new. Never toasts and
   * never throws; a failed write is non-fatal to whatever save triggered it — see callers in
   * useProductDetails. */
  const ensureGroup = (kind: 'colour' | 'size', items: string[]): Promise<{ ok: boolean; error: string | null }> => {
    const trimmed = items.map((s) => s.trim()).filter(Boolean);
    if (trimmed.length === 0) return Promise.resolve({ ok: true, error: null });
    const key = groupKeyOf(trimmed);
    const known = (kind === 'colour' ? colours : sizes).some((g) => g.key === key);
    if (known) return Promise.resolve({ ok: true, error: null });

    return new Promise((resolve) => {
      requestEnsure({
        url: '/api/inventory/presets',
        method: 'POST',
        data: { kind, items: trimmed },
        showToast: false,
        onSuccess: ({ data }) => {
          if (data.created) {
            const setList = kind === 'colour' ? setColours : setSizes;
            setList((prev) => (prev.some((g) => g.key === data.group.key) ? prev : byGroupLabelAsc([...prev, data.group])));
          }
          resolve({ ok: true, error: null });
        },
        onError: (err) => resolve({ ok: false, error: err.items || err.general || 'Failed to save preset group' }),
      });
    });
  };

  /** Explicit "Add group" from the picker's own form — same idempotent ensure as above, but
   * surfaces the inline error the form shows (e.g. "already exists", a duplicate member, or the
   * reserved "|" character) rather than swallowing it. */
  const createGroup = (kind: 'colour' | 'size', items: string[]): Promise<string | null> =>
    new Promise((resolve) => {
      requestEnsure({
        url: '/api/inventory/presets',
        method: 'POST',
        data: { kind, items },
        showToast: false,
        onSuccess: ({ data }) => {
          const setList = kind === 'colour' ? setColours : setSizes;
          setList((prev) => (prev.some((g) => g.key === data.group.key) ? prev : byGroupLabelAsc([...prev, data.group])));
          resolve(null);
        },
        onError: (err) => resolve(err.items || err.general || 'Failed to add preset group'),
      });
    });

  const deletePresets = (kind: 'colour' | 'size', ids: string[]): Promise<boolean> =>
    new Promise((resolve) => {
      requestBulkDelete({
        url: '/api/inventory/presets/bulk',
        method: 'POST',
        data: { kind, ids },
        successMessage: 'Preset groups removed',
        onSuccess: () => {
          if (kind === 'colour') setColours((prev) => prev.filter((g) => !ids.includes(g.id)));
          else setSizes((prev) => prev.filter((g) => !ids.includes(g.id)));
          resolve(true);
        },
        onError: () => resolve(false),
      });
    });

  return { colours, sizes, loading, savingPreset, ensureGroup, createGroup, deletePresets };
}

export type InventoryPresetsState = ReturnType<typeof useInventoryPresets>;
