/** Formats a Stocktake's autoincrement `number` as its display id ("ST-0007"). Pure, safe to
 * import from client and server code alike (mirrors lib/inventory/po-number.ts). */
export function formatStocktakeNumber(number: number): string {
  return `ST-${String(number).padStart(4, '0')}`;
}
