import type { OrderCapabilities } from '../capabilities';

export type LineColumn = 'item' | 'decorator' | 'qty' | 'packed' | 'pdate' | 'avail' | 'po' | 'full' | 'partial' | 'actions';
export type LineColumnDef = { key: LineColumn; width: string; label: string };

/** Columns of the expanded order's item table (prototype `lineCols` of Concept A2); one template for the header and every
 * line. SKU and decoration live inside the Item cell, and Qty reads "Fulfilled" for roles that fulfil. */
export function getLineColumns(caps: OrderCapabilities, showWork: boolean): LineColumnDef[] {
  const cols: LineColumnDef[] = [
    { key: 'item', width: 'minmax(190px,1fr)', label: 'Item' },
    { key: 'qty', width: caps.fulfilment ? '54px' : '22px', label: caps.fulfilment ? 'Fulfilled' : 'Qty' },
    { key: 'packed', width: '38px', label: 'Packed' },
  ];
  if (caps.packedDate) cols.push({ key: 'pdate', width: '96px', label: 'Packed Date' });
  if (caps.stock) cols.push({ key: 'avail', width: '28px', label: 'Avail' }, { key: 'po', width: '108px', label: 'PO status' });
  if (caps.decoration && showWork) cols.push({ key: 'decorator', width: '126px', label: 'Decorator' });
  if (caps.pack || caps.fulfilment) cols.push({ key: 'full', width: '42px', label: 'Full' }, { key: 'partial', width: '66px', label: 'Partial' });
  if (caps.admin) cols.push({ key: 'actions', width: '46px', label: 'Actions' });
  return cols;
}

export const lineGridTemplate = (cols: LineColumnDef[]) => cols.map((c) => c.width).join(' ');
/** Gap between line columns: 4px when the stock columns are shown, 8px otherwise. */
export const lineGap = (caps: OrderCapabilities) => (caps.stock ? 4 : 8);
export const CENTERED_COLUMNS: LineColumn[] = ['qty', 'packed', 'avail', 'actions'];
