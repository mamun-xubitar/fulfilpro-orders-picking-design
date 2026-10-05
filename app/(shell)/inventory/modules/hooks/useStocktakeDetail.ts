'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { useInventoryAccess } from '../InventoryAccess';
import type { ProductRecord, StocktakeItemRecord, StocktakeRecord, StocktakeSyncSummary } from '../types';

/** The lines of one variant, rolled up for the admin's comparison. */
export type VariantTally = {
  variantId: string;
  items: StocktakeItemRecord[];
  /** Σ of the counted lines; null while any line is blank. */
  counted: number | null;
  /** Stock on hand when the stocktake was created. */
  expected: number;
  /** Stock on hand now. */
  system: number;
  /** Counted but not syncable: a line is blank, or a location of the variant has no line. */
  partial: boolean;
};

export function tallyVariants(items: StocktakeItemRecord[], counts: Record<string, string>): VariantTally[] {
  const byVariant = new Map<string, StocktakeItemRecord[]>();
  for (const item of items) byVariant.set(item.variantId, [...(byVariant.get(item.variantId) ?? []), item]);
  return [...byVariant.entries()].map(([variantId, lines]) => {
    const entered = lines.map((l) => (counts[l.id] ?? '').trim());
    const complete = entered.every((v) => v !== '');
    return {
      variantId,
      items: lines,
      counted: complete ? entered.reduce((sum, v) => sum + (Number(v) || 0), 0) : null,
      expected: lines[0].expectedQty ?? 0,
      system: lines[0].systemQty ?? 0,
      partial: !complete || lines[0].uncoveredLocations > 0,
    };
  });
}

const toInputs = (items: StocktakeItemRecord[]) => Object.fromEntries(items.map((i) => [i.id, i.countedQty === null ? '' : String(i.countedQty)]));

type Args = {
  isAdmin: boolean;
  /** Something changed (counts saved, synced, cancelled) — refetch the list. */
  onChanged: () => void;
  /** A sync rewrote stock on hand — the page patches the product if it's the one on screen. */
  onSynced: (product: ProductRecord) => void;
};

/** One stocktake in the count modal: load it, key in counts, save, and (admin) sync it into stock
 * on hand or cancel it. Sync and cancel each sit behind a confirmation. */
export function useStocktakeDetail({ isAdmin, onChanged, onSynced }: Args) {
  const { canCount } = useInventoryAccess();
  const [record, setRecord] = useState<StocktakeRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  /** A fully counted stocktake is read-only until "Edit count" is pressed. */
  const [editing, setEditing] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<StocktakeRecord | null>(null);
  const { request: requestGet, loading } = useRequest<StocktakeRecord>();
  const { request: requestSave, loading: saving } = useRequest<StocktakeRecord>();
  const { request: requestSync, loading: syncing } = useRequest<{ stocktake: StocktakeRecord; result: StocktakeSyncSummary; product: ProductRecord }>();
  const { request: requestCancel, loading: cancelling } = useRequest<StocktakeRecord>();

  const apply = (next: StocktakeRecord) => {
    setRecord(next);
    setCounts(toInputs(next.items));
    setEditing(false);
  };

  const openStocktake = (id: string) => {
    setRecord(null);
    setOpen(true);
    requestGet({
      url: `/api/inventory/stocktakes/${id}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => apply(data),
      onError: (err) => {
        toast.error(err.general || 'Failed to load stocktake');
        setOpen(false);
      },
    });
  };
  const close = () => {
    setOpen(false);
    setSyncOpen(false);
    setEditing(false);
  };
  const setCount = (itemId: string, value: string) => setCounts((prev) => ({ ...prev, [itemId]: value }));

  const editable = canCount && !!record && (record.status === 'OPEN' || record.status === 'COUNTED');
  const locked = !!record && record.status === 'COUNTED' && !editing;
  const dirty =!!record && record.items.some((i) => (counts[i.id] ?? '') !== (i.countedQty === null ? '' : String(i.countedQty)));

  const save = () => {
    if (!record) return;
    requestSave({
      url: `/api/inventory/stocktakes/${record.id}`,
      method: 'PATCH',
      data: { items: record.items.map((i) => ({ itemId: i.id, countedQty: (counts[i.id] ?? '').trim() === '' ? null : Number(counts[i.id]) })) },
      successMessage: 'Counts saved',
      onSuccess: ({ data }) => {
        apply(data);
        onChanged();
      },
    });
  };

  const sync = () => {
    if (!record) return;
    requestSync({
      url: `/api/inventory/stocktakes/${record.id}/sync`,
      method: 'POST',
      successMessage: 'Stocktake synced',
      onSuccess: ({ data }) => {
        setSyncOpen(false);
        apply(data.stocktake);
        if (data.result.skipped > 0) toast.warn(`${data.result.skipped} variant${data.result.skipped === 1 ? ' was' : 's were'} skipped — not every location was counted.`);
        onChanged();
        if (data.product) onSynced(data.product);
      },
      onError: () => setSyncOpen(false),
    });
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    requestCancel({
      url: `/api/inventory/stocktakes/${cancelTarget.id}/cancel`,
      method: 'POST',
      successMessage: 'Stocktake cancelled',
      onSuccess: () => {
        if (record?.id === cancelTarget.id) setOpen(false);
        setCancelTarget(null);
        onChanged();
      },
      onError: () => setCancelTarget(null),
    });
  };

  const tallies = isAdmin && record ? tallyVariants(record.items, counts) : [];

  return {
    isAdmin,
    open,
    record,
    loading,
    openStocktake,
    close,
    counts,
    setCount,
    editable,
    locked,
    startEdit: () => setEditing(true),
    dirty,
    save,
    saving,
    tallies,
    syncOpen,
    openSync: () => setSyncOpen(true),
    closeSync: () => setSyncOpen(false),
    sync,
    syncing,
    cancelTarget,
    askCancel: setCancelTarget,
    closeCancel: () => setCancelTarget(null),
    confirmCancel,
    cancelling,
  };
}

export type StocktakeDetailState = ReturnType<typeof useStocktakeDetail>;
