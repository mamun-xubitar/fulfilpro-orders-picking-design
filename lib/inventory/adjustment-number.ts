/** Formats a StockAdjustmentBatch's autoincrement `number` as its display id ("ADJ-0007"). Pure, safe
 * to import from client and server code alike (mirrors lib/inventory/stocktake-number.ts). */
export function formatAdjustmentNumber(number: number): string {
  return `ADJ-${String(number).padStart(4, '0')}`;
}
