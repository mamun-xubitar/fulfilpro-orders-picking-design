import { useState } from 'react';
import { toast } from 'react-toastify';
import { printDocumentInHiddenFrame } from '@/lib/print';
import type { ApiResponse, OrderRow } from '../types';
import { getApiErrorMessage } from '../utils';
import { buildPickingSlipDocument, createLocationRemark, getRemainingToPack, getVariantText, type PrintOrder } from '../slipDocument';

type UseSlipPrintingArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

/** Picking-slip printing (Admin, Order Picker): edit the slip, print it, then record the print so
 * the printer icon turns green and the order moves to "Slip printed". */
export function useSlipPrinting({ setOrders, blockTestModeAction }: UseSlipPrintingArgs) {
  const [printModal, setPrintModal] = useState<PrintOrder[] | null>(null);

  const openPrintModal = (targets: OrderRow[]) => {
    if (blockTestModeAction()) return;
    const printable = targets
      .map((order) => ({
        ...order,
        printItems: order.items
          .filter((item) => getRemainingToPack(item) > 0)
          .map((item) => ({ ...item, printQuantity: getRemainingToPack(item), removed: false, locationRemarks: [createLocationRemark()], printNote: '' })),
      }))
      .filter((order) => order.printItems.length > 0);
    if (printable.length === 0) {
      toast.error('Nothing left to pick on the selected orders.');
      return;
    }
    setPrintModal(printable);
  };

  const printPickingSlips = async () => {
    if (!printModal) return;
    const printableOrders = printModal
      .map((o) => ({ ...o, printItems: o.printItems.filter((item) => !item.removed && item.printQuantity > 0) }))
      .filter((o) => o.printItems.length > 0);
    if (printableOrders.length === 0) {
      toast.error('At least one item must remain on the picking slip.');
      return;
    }
    try {
      await printDocumentInHiddenFrame(buildPickingSlipDocument(printableOrders));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to start print. Please try again.');
      return;
    }
    try {
      const res = await fetch('/api/orders/slip-prints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: printableOrders.map((o) => ({
            orderId: o.id,
            items: o.printItems.map((item) => ({
              lineItemId: item.id,
              name: item.name,
              sku: item.sku,
              variant: getVariantText(item),
              quantity: item.printQuantity,
              locationRemarks: item.locationRemarks.map(({ location, remark }) => ({ location, remark })),
              note: item.printNote,
            })),
          })),
        }),
      });
      const json = (await res.json()) as ApiResponse<{ printedOrderIds: string[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to record print'));
      const now = new Date().toISOString();
      setOrders((prev) => prev.map((o) => (json.data.printedOrderIds.includes(o.id) ? { ...o, slipPrinted: true, slipLastPrintedAt: now } : o)));
      setPrintModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record print');
    }
  };

  return { printModal, setPrintModal, openPrintModal, printPickingSlips };
}
