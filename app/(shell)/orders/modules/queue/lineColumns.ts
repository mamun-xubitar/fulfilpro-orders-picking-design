import type { OrderCapabilities } from '../capabilities';

export type LineColumn = 'item' | 'deco' | 'qty' | 'packed' | 'pdate' | 'ful' | 'avail' | 'po' | 'work' | 'full' | 'partial' | 'actions';

/** Columns of the expanded order's item table; shared by the header and every line. */
export function getLineColumns(caps: OrderCapabilities, hasWork: boolean): Array<{ key: LineColumn; width: string; label: string }> {
  const cols: Array<{ key: LineColumn; width: string; label: string }> = [{ key: 'item', width: 'minmax(0,1fr)', label: 'Item' }];
  if (caps.decoration) cols.push({ key: 'deco', width: '56px', label: 'Deco' });
  cols.push({ key: 'qty', width: '28px', label: 'Qty' });
  cols.push({ key: 'packed', width: '42px', label: 'Packed' });
  if (caps.packedDate) cols.push({ key: 'pdate', width: '84px', label: 'Packed date' });
  if (caps.fulfilment) cols.push({ key: 'ful', width: '42px', label: 'Fulfil' });
  if (caps.stock) cols.push({ key: 'avail', width: '36px', label: 'Avail' }, { key: 'po', width: '104px', label: 'PO status' });
  if (caps.decoration && hasWork) cols.push({ key: 'work', width: '36px', label: 'Work' });
  cols.push({ key: 'full', width: '40px', label: 'Full' });
  cols.push({ key: 'partial', width: '56px', label: 'Partial' });
  if (caps.admin) cols.push({ key: 'actions', width: '72px', label: 'Actions' });
  return cols;
}

export const lineGridTemplate = (cols: ReturnType<typeof getLineColumns>) => cols.map((c) => c.width).join(' ');
