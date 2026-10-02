import { printDocumentInHiddenFrame } from '@/lib/print';
import { formatStocktakeNumber } from '@/lib/inventory/stocktake-number';
import { formatDate, variantTitle } from './utils';
import type { StocktakeRecord } from './types';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The count sheet: no system quantities, so whoever counts isn't nudged by them. Lines that were
 * already counted show their value; the rest stay blank to write in. */
export function buildStocktakeDocument(stocktake: StocktakeRecord): string {
  const rows = stocktake.items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(variantTitle(i))}</td><td>${escapeHtml(i.sku ?? '-')}</td><td>${escapeHtml(i.locationName ?? '-')}</td><td class="n">${i.countedQty ?? ''}</td></tr>`
    )
    .join('');
  const number = formatStocktakeNumber(stocktake.number);
  return `<!doctype html>
<html>
  <head>
    <title>${escapeHtml(number)} — ${escapeHtml(stocktake.productName)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; }
      h1 { font-size: 16px; margin: 0 0 4px; }
      p { margin: 0 0 16px; color: #555; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd; }
      th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #555; border-bottom: 2px solid #111; }
      .n { text-align: right; width: 110px; }
      @media print { @page { margin: 16mm; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(number)} — ${escapeHtml(stocktake.productName)}</h1>
    <p>${escapeHtml(stocktake.itemNo)} · ${stocktake.itemCount} line${stocktake.itemCount === 1 ? '' : 's'} · Created ${escapeHtml(formatDate(stocktake.createdAt))} by ${escapeHtml(stocktake.startedByName)} — count each location on its own line.</p>
    <table>
      <thead><tr><th>Colour / Size</th><th>SKU</th><th>Location</th><th class="n">Counted</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;
}

export function printStocktake(stocktake: StocktakeRecord): Promise<void> {
  return printDocumentInHiddenFrame(buildStocktakeDocument(stocktake));
}
