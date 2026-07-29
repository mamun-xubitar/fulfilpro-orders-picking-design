'use client';

import { useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { getItemRemaining, splitQuantityAcrossLocations } from '../utils';
import type { LocationOption, PurchaseOrderItemRow, PurchaseOrderRow } from '../types';

export type ReceiveDraft = {
  itemId: string;
  variantId: string;
  variantTitle: string;
  sku: string | null;
  ordered: number;
  alreadyReceived: number;
};

type UsePoReceiveArgs = {
  poId: string | null;
  locations: LocationOption[];
  refreshList: () => void;
  bumpRefresh: () => void;
};

export function usePoReceive({ poId, locations, refreshList, bumpRefresh }: UsePoReceiveArgs) {
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [drafts, setDrafts] = useState<ReceiveDraft[]>([]);
  const [qtyById, setQtyById] = useState<Record<string, string>>({});
  const [checkedLocationIds, setCheckedLocationIds] = useState<Set<string>>(new Set());
  const [allocations, setAllocations] = useState<Record<string, Record<string, string>>>({});
  const { request, loading: receiving, errors } = useRequest<PurchaseOrderRow>();

  const toDraft = (item: PurchaseOrderItemRow): ReceiveDraft => ({
    itemId: item.id,
    variantId: item.variantId ?? '',
    variantTitle: item.variantTitle,
    sku: item.sku,
    ordered: item.quantity,
    alreadyReceived: item.receivedQuantity,
  });

  const stringifyAllocations = (record: Record<string, number>): Record<string, string> =>
    Object.fromEntries(Object.entries(record).map(([locationId, qty]) => [locationId, String(qty)]));

  const open = (items: PurchaseOrderItemRow[]) => {
    const locationIds = locations.map((l) => l.id);
    const nextDrafts = items.map(toDraft);
    const nextQtyById: Record<string, string> = {};
    const nextAllocations: Record<string, Record<string, string>> = {};

    for (const item of items) {
      const qty = getItemRemaining(item) || 1;
      nextQtyById[item.id] = String(qty);
      nextAllocations[item.id] = stringifyAllocations(splitQuantityAcrossLocations(qty, locationIds));
    }

    setDrafts(nextDrafts);
    setQtyById(nextQtyById);
    setCheckedLocationIds(new Set(locationIds));
    setAllocations(nextAllocations);
    setReceiveOpen(true);
  };

  const openForItem = (item: PurchaseOrderItemRow) => open([item]);

  const openForOutstanding = (po: PurchaseOrderRow) => open(po.items.filter((item) => item.receivedQuantity < item.quantity));

  const close = () => setReceiveOpen(false);

  const setQty = (itemId: string, value: string) => {
    setQtyById((prev) => ({ ...prev, [itemId]: value }));
    const qty = Number(value);
    const locationIds = [...checkedLocationIds];
    setAllocations((prev) => ({
      ...prev,
      [itemId]: Number.isFinite(qty) && qty >= 0 ? stringifyAllocations(splitQuantityAcrossLocations(qty, locationIds)) : prev[itemId],
    }));
  };

  const toggleLocation = (id: string) => {
    setCheckedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      const locationIds = [...next];
      setAllocations(
        Object.fromEntries(
          drafts.map((draft) => {
            const qty = Number(qtyById[draft.itemId] ?? '0');
            return [draft.itemId, stringifyAllocations(splitQuantityAcrossLocations(Number.isFinite(qty) ? qty : 0, locationIds))];
          })
        )
      );
      return next;
    });
  };

  const setAllocation = (itemId: string, locationId: string, value: string) => {
    setAllocations((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [locationId]: value } }));
  };

  const getAllocatedTotal = (itemId: string) =>
    Object.values(allocations[itemId] ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);

  const totalQuantity = drafts.reduce((sum, draft) => sum + (Number(qtyById[draft.itemId]) || 0), 0);
  const isBalanced = drafts.every((draft) => getAllocatedTotal(draft.itemId) === (Number(qtyById[draft.itemId]) || 0));
  const canSubmit = checkedLocationIds.size > 0 && isBalanced && totalQuantity > 0;

  const submit = () => {
    if (!poId) return;

    const payload: Array<{ itemId: string; locationId: string; quantity: number }> = [];
    for (const draft of drafts) {
      const itemAllocations = allocations[draft.itemId] ?? {};
      for (const locationId of checkedLocationIds) {
        const quantity = Number(itemAllocations[locationId] ?? '0');
        if (quantity > 0) payload.push({ itemId: draft.itemId, locationId, quantity });
      }
    }

    request({
      url: `/api/inventory/purchase-orders/${poId}/receive`,
      method: 'POST',
      data: { allocations: payload } as unknown as Record<string, unknown>,
      successMessage: 'Inventory received',
      validation: async () => {
        const errors: Record<string, string> = {};
        if (checkedLocationIds.size === 0) errors.general = 'Select at least one location';
        else if (!isBalanced) errors.general = 'Allocated quantities must match the receive quantity for every item';
        else if (totalQuantity === 0) errors.general = 'Enter a quantity greater than 0';
        return errors;
      },
      onSuccess: () => {
        refreshList();
        bumpRefresh();
        setReceiveOpen(false);
      },
    });
  };

  return {
    receiveOpen,
    drafts,
    qtyById,
    setQty,
    checkedLocationIds,
    toggleLocation,
    allocations,
    setAllocation,
    getAllocatedTotal,
    canSubmit,
    openForItem,
    openForOutstanding,
    close,
    submit,
    receiving,
    errors,
  };
}
