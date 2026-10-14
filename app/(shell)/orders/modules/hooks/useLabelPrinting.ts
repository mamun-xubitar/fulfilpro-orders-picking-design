import { useState } from "react";
import { toast } from "react-toastify";
import type { ApiResponse, OrderRow, PackingSlipLabel } from "../types";
import {
  buildPackingSlipDocument,
  buildPackingSlipsDocument,
  printDocumentInHiddenFrame,
} from "../packingSlipPrint";
import { getApiErrorMessage, isOrderFullyFulfilled } from "../utils";

export function useLabelPrinting({
  orders,
  setOrders,
  userIsTest,
}: {
  orders: OrderRow[];
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  userIsTest: boolean;
}) {
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [bulkPrinting, setBulkPrinting] = useState(false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());

  // Derived from the current page, so ids left over from other pages are ignored.
  const selectedLabelOrders = orders.filter((o) => selectedLabelIds.has(o.id));
  const printableLabelOrders = selectedLabelOrders.filter((o) => !isOrderFullyFulfilled(o));
  const allLabelsOnPageSelected = orders.length > 0 && selectedLabelOrders.length === orders.length;

  const recordLabelPrints = async (orderIds: string[]) => {
    if (userIsTest) return;
    try {
      const res = await fetch("/api/orders/label-prints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds }),
      });
      const json = (await res.json()) as ApiResponse<{ printedOrderIds: string[] }>;
      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, "Failed to record label print"));
      }
      const printed = new Set(json.data.printedOrderIds);
      const now = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) => (printed.has(o.id) ? { ...o, labelPrintedAt: now } : o)),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record label print.",
      );
    }
  };

  const printPackingSlipLabel = async (order: OrderRow) => {
    setPrintingOrderId(order.id);

    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(order.id)}/packing-slip`,
      );
      const json = (await res.json()) as ApiResponse<PackingSlipLabel>;

      if (!res.ok || !json.success) {
        throw new Error(
          getApiErrorMessage(json, "Failed to load packing slip label"),
        );
      }

      const printHtml = buildPackingSlipDocument(
        json.data,
        window.location.origin,
      );
      await printDocumentInHiddenFrame(printHtml);
      await recordLabelPrints([order.id]);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load packing slip label.",
      );
    } finally {
      setPrintingOrderId(null);
    }
  };

  const toggleLabelSelected = (orderId: string) => {
    setSelectedLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectAllLabelsOnPage = () => {
    setSelectedLabelIds(
      allLabelsOnPageSelected ? new Set() : new Set(orders.map((o) => o.id)),
    );
  };

  const clearLabelSelection = () => setSelectedLabelIds(new Set());

  const bulkPrintLabels = async () => {
    if (printableLabelOrders.length === 0) {
      toast.error("None of the selected orders have a label to print.");
      return;
    }
    const skipped = selectedLabelOrders.length - printableLabelOrders.length;
    const ids = printableLabelOrders.map((o) => o.id);
    setBulkPrinting(true);

    try {
      const res = await fetch(
        `/api/orders/packing-slips?ids=${ids.map(encodeURIComponent).join(",")}`,
      );
      const json = (await res.json()) as ApiResponse<PackingSlipLabel[]>;
      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, "Failed to load packing slip labels"));
      }
      if (json.data.length === 0) throw new Error("No labels found for the selected orders.");

      await printDocumentInHiddenFrame(
        buildPackingSlipsDocument(json.data, window.location.origin),
      );
      await recordLabelPrints(json.data.map((label) => label.id));
      clearLabelSelection();
      if (skipped > 0) {
        toast.info(
          `${skipped} fully fulfilled order${skipped === 1 ? "" : "s"} skipped.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to print labels.",
      );
    } finally {
      setBulkPrinting(false);
    }
  };

  return {
    printingOrderId,
    printPackingSlipLabel,
    bulkPrinting,
    selectedLabelIds,
    printableLabelCount: printableLabelOrders.length,
    allLabelsOnPageSelected,
    toggleLabelSelected,
    toggleSelectAllLabelsOnPage,
    clearLabelSelection,
    bulkPrintLabels,
  };
}
