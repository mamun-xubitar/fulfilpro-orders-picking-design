'use client';

import { Fragment, type Dispatch, type SetStateAction } from 'react';
import { type PrintOrder, type PrintItem, getRemainingForPrint, clampNumber, getVariantText } from './usePickingListPage';

function updatePrintItem(setOrders: Dispatch<SetStateAction<PrintOrder[] | null>>, orderId: string, itemId: string, patch: Partial<PrintItem>) {
  setOrders((prev) => prev ? prev.map((o) => o.id === orderId ? { ...o, printItems: o.printItems.map((item) => item.id === itemId ? { ...item, ...patch } : item) } : o) : prev);
}

type Props = {
  orders: PrintOrder[];
  setOrders: Dispatch<SetStateAction<PrintOrder[] | null>>;
  onClose: () => void;
  onPrint: () => void;
};

export default function PrintModal({ orders, setOrders, onClose, onPrint }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Print picking slip</h3>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length === 1 ? '' : 's'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">×</button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {orders.map((order) => (
            <section key={order.id} className="rounded-lg border border-gray-200">
              <div className="flex flex-wrap justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div><div className="font-semibold text-gray-900">{order.storeName}</div><div className="text-sm text-gray-500">Order {order.number}</div></div>
                <div className="text-sm text-gray-500"><div>Print date: {new Date().toLocaleString()}</div><div>{order.customer}</div></div>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[760px] text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="w-[34%] py-2 pr-4 text-left font-medium">Item</th>
                      <th className="py-2 text-left font-medium">Others</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.printItems.map((item, idx) => (
                      <Fragment key={`${order.id}-print-${item.id}-${idx}`}>
                        <tr className={`align-top ${item.removed ? 'opacity-40' : ''}`}>
                          <td className="py-3 pr-4 text-gray-800">
                            <div className="text-sm font-semibold text-gray-900">{item.title || item.name}</div>
                            <div className="mt-1 text-gray-500"><span className="font-semibold uppercase">SKU:</span> <span className="font-mono">{item.sku || '-'}</span></div>
                          </td>
                          <td className="py-3">
                            <div className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] items-end gap-3">
                              <label className="min-w-0"><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Variant</span><div className="truncate text-gray-700">{getVariantText(item) || '-'}</div></label>
                              <label><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Qty</span><input type="number" min={1} max={getRemainingForPrint(item)} value={item.printQuantity} disabled={item.removed} onChange={(e) => updatePrintItem(setOrders, order.id, item.id, { printQuantity: clampNumber(e.target.value, getRemainingForPrint(item), 1) })} className="w-full rounded border border-gray-300 px-2 py-1 text-center disabled:bg-gray-100" /></label>
                              <button type="button" onClick={() => updatePrintItem(setOrders, order.id, item.id, { removed: !item.removed })} className={`flex h-8 w-8 items-center justify-center rounded border ${item.removed ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600'}`} aria-label={item.removed ? 'Restore item' : 'Remove item'}>
                                {item.removed ? <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 6.3 3.7L4 10M4 15a8 8 0 0 0 13.7 5.3L20 14" /></svg> : <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18M6 6l12 12" /></svg>}
                              </button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <label><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Location</span><input value={item.printLocation} disabled={item.removed} onChange={(e) => updatePrintItem(setOrders, order.id, item.id, { printLocation: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100" /></label>
                              <label><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Remark</span><input value={item.printRemark} disabled={item.removed} onChange={(e) => updatePrintItem(setOrders, order.id, item.id, { printRemark: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100" /></label>
                            </div>
                          </td>
                        </tr>
                        <tr className={`border-b border-gray-100 ${item.removed ? 'opacity-40' : ''}`}>
                          <td colSpan={2} className="pb-3 pt-0"><label><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Note</span><textarea value={item.printNote} rows={3} disabled={item.removed} onChange={(e) => updatePrintItem(setOrders, order.id, item.id, { printNote: e.target.value })} className="w-full resize-none rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100" /></label></td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600">Cancel</button>
          <button onClick={onPrint} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Print</button>
        </div>
      </div>
    </div>
  );
}
