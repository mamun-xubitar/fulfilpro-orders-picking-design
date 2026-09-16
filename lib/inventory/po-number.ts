/** Formats a PurchaseOrder's autoincrement `number` as its display id ("PO-00074") — shared by
 * server-side {orderNumber} substitution (purchase-order.model.server.ts) and every client-side
 * display of a PO number. Pure, safe to import from client and server code alike (mirrors
 * lib/inventory/handle.ts). */
export function formatPoNumber(number: number): string {
  return `PO-${String(number).padStart(5, '0')}`;
}
