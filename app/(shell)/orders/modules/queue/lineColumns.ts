import type { OrderCapabilities } from '../capabilities';

export type LineColumn = 'item' | 'sku' | 'deco' | 'qty' | 'packed' | 'pdate' | 'avail' | 'po' | 'work' | 'full' | 'partial' | 'actions';
export type LineColumnDef = { key: LineColumn; width: string; label: string };

/** Columns of the expanded order's item table (prototype `lineCols`, work + both deco toggles on); one template
 * for the header and every line. */
export function getLineColumns(caps: OrderCapabilities, showWork: boolean): LineColumnDef[] {
  const cols: LineColumnDef[] = [
    { key: 'item', width: 'minmax(0,1fr)', label: 'Item' },
    { key: 'sku', width: caps.stock ? '62px' : '96px', label: 'SKU' },
  ];
  if (caps.decoration) cols.push({ key: 'deco', width: '90px', label: 'Deco' });
  cols.push({ key: 'qty', width: '22px', label: 'Qty' }, { key: 'packed', width: '38px', label: 'Packed' });
  if (caps.packedDate) cols.push({ key: 'pdate', width: '96px', label: 'Packed Date' });
  if (caps.stock) cols.push({ key: 'avail', width: '28px', label: 'Avail' }, { key: 'po', width: '86px', label: 'PO status' });
  if (caps.decoration && showWork) cols.push({ key: 'work', width: '34px', label: 'Work' });
  if (caps.pack) cols.push({ key: 'full', width: '42px', label: 'Full' }, { key: 'partial', width: '66px', label: 'Partial' });
  if (caps.admin) cols.push({ key: 'actions', width: '46px', label: 'Actions' });
  return cols;
}

export const lineGridTemplate = (cols: LineColumnDef[]) => cols.map((c) => c.width).join(' ');
/** Gap between line columns: 4px when the stock columns are shown, 8px otherwise. */
export const lineGap = (caps: OrderCapabilities) => (caps.stock ? 4 : 8);
export const CENTERED_COLUMNS: LineColumn[] = ['qty', 'packed', 'avail', 'actions'];
