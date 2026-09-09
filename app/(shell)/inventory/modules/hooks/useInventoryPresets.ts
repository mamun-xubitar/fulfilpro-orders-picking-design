'use client';

import { useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';

export type ColourPresetOption = { id: string; name: string; key: string };
export type SizePresetOption = { id: string; name: string; key: string };

type PresetsResponse = { colours: ColourPresetOption[]; sizes: SizePresetOption[] };

/** A→Z, numeric-aware (so "2" sorts before "10") — the server orders by raw lowercased `key`
 * instead, which would put "10" before "2". Applied on load and after every create so the
 * dropdown and its badges always read alphabetically regardless of insertion order. */
function byNameAsc<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

/** Global colour/size presets, loaded once page-wide and shared by every Product details /
 * wizard field that offers the preset picker — see PresetPicker.tsx. */
export function useInventoryPresets() {
  const [colours, setColours] = useState<ColourPresetOption[]>([]);
  const [sizes, setSizes] = useState<SizePresetOption[]>([]);
  const { request: requestList, loading } = useRequest<PresetsResponse>();
  const { request: requestCreate, loading: savingPreset } = useRequest<{ colour?: ColourPresetOption; size?: SizePresetOption }>();
  const { request: requestBulkDelete } = useRequest<{ count: number }>();

  const load = () => {
    requestList({
      url: '/api/inventory/presets',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        setColours(byNameAsc(data.colours));
        setSizes(byNameAsc(data.sizes));
      },
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  /** Returns an inline error message on collision (e.g. "already exists"), or null on success. */
  const createColour = (name: string): Promise<string | null> =>
    new Promise((resolve) => {
      requestCreate({
        url: '/api/inventory/presets',
        method: 'POST',
        data: { kind: 'colour', name },
        showToast: false,
        onSuccess: ({ data }) => {
          if (data.colour) setColours((prev) => byNameAsc([...prev, data.colour!]));
          resolve(null);
        },
        onError: (err) => resolve(err.name || err.general || 'Failed to add colour'),
      });
    });

  const createSize = (name: string): Promise<string | null> =>
    new Promise((resolve) => {
      requestCreate({
        url: '/api/inventory/presets',
        method: 'POST',
        data: { kind: 'size', name },
        showToast: false,
        onSuccess: ({ data }) => {
          if (data.size) setSizes((prev) => byNameAsc([...prev, data.size!]));
          resolve(null);
        },
        onError: (err) => resolve(err.name || err.general || 'Failed to add size'),
      });
    });

  const deletePresets = (kind: 'colour' | 'size', ids: string[]): Promise<boolean> =>
    new Promise((resolve) => {
      requestBulkDelete({
        url: '/api/inventory/presets/bulk',
        method: 'POST',
        data: { kind, ids },
        successMessage: 'Presets removed',
        onSuccess: () => {
          if (kind === 'colour') setColours((prev) => prev.filter((c) => !ids.includes(c.id)));
          else setSizes((prev) => prev.filter((s) => !ids.includes(s.id)));
          resolve(true);
        },
        onError: () => resolve(false),
      });
    });

  return { colours, sizes, loading, savingPreset, createColour, createSize, deletePresets };
}

export type InventoryPresetsState = ReturnType<typeof useInventoryPresets>;
