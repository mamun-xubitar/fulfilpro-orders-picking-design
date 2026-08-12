'use client';

import { getRoleLabel } from '@/lib/roles';
import type { OrderItem, OrderRow, OrderStockAdjustmentItem } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import { applyDecorationTint, getFulfilledQty, getFulfillmentRowClass, getNameAttribute, nameKey } from './utils';
import OrderItemActions from './OrderItemActions';

type OrderItemRowProps = {
  p: OrdersPageBundle;
  order: OrderRow;
  item: OrderItem;
  itemIndex: number;
  restockItems: OrderStockAdjustmentItem[];
  hasRestock: boolean;
  hasDecorationWork: boolean;
};

export default function OrderItemRow({ p, order, item, itemIndex, restockItems, hasRestock, hasDecorationWork }: OrderItemRowProps) {
  const key = `${order.id}-${itemIndex}`;
  const fulfilledQty = getFulfilledQty(order, item.id);
  const remainingQty = Math.max(0, item.qty - fulfilledQty);
  const isFull = p.isLineFullChecked(order, item, itemIndex);
  const partialValue = Math.min(remainingQty, Math.max(0, p.partialValues[key] ?? 0));
  const packedQty = item.packedQuantity ?? 0;
  const itemPackingStatus = packedQty >= item.qty && item.qty > 0 ? 'packed' : packedQty > 0 ? 'partial' : 'none';
  const doneQty = item.decoration?.doneQty ?? 0;
  return (
    <tr
      key={`${order.id}-${itemIndex}`}
      className={applyDecorationTint(getFulfillmentRowClass(fulfilledQty, item.qty, remainingQty, isFull, partialValue), item)}
    >
      <td className="py-1.5 pr-2 text-gray-700">
        {(() => {
          const nameAttr = getNameAttribute(item);
          if (!nameAttr) return item.name;
          const k = nameKey(order.id, item.id);
          const entry = { key: k, row: { orderNumber: String(order.number), productTitle: item.title ?? item.name, value: nameAttr.value } };
          return (
            <div className="flex flex-col gap-0.5">
              <span>{item.name}</span>
              <label className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-blue-700">
                <input
                  type="checkbox"
                  checked={p.isNameChecked(k)}
                  onChange={() => p.setNamesChecked([entry], !p.isNameChecked(k))}
                  className="rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                {nameAttr.name}: {nameAttr.value}
              </label>
            </div>
          );
        })()}
        {p.userIsAdmin && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {(item.assignments ?? []).map((a) => (
              <span
                key={a.id}
                title={`${getRoleLabel(a.assigneeRole)}${a.dueDate ? ` · due ${a.dueDate}` : ''}`}
                className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-medium"
              >
                {a.assigneeName}{a.dueDate ? ` · ${a.dueDate}` : ''}
              </span>
            ))}
            <button
              type="button"
              onClick={() => p.openAssignModal(order, item)}
              className="inline-flex items-center rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-150"
            >
              + Assign
            </button>
            {(item.isEmbroidery || item.isPrint) && (() => {
              const remaining = item.decoration?.remaining ?? item.qty;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => p.openWorkModal(order, item)}
                    disabled={remaining <= 0}
                    className="inline-flex items-center rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Mark decoration done
                  </button>
                  <button
                    type="button"
                    onClick={() => p.openWorkDetails(order, item)}
                    disabled={(item.decoration?.works?.length ?? 0) === 0}
                    className="inline-flex items-center rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    View decorations
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </td>
      <td className="py-1.5 pr-2 font-mono text-gray-500">{item.sku || '-'}</td>
      <td className="py-1.5 text-center">
        {p.userIsAdmin ? (
          <button
            type="button"
            onClick={() => p.toggleLineItemDecoration(order, item, 'isEmbroidery')}
            title="Toggle embroidery"
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors duration-150 ${item.isEmbroidery ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >
            {item.isEmbroidery ? `${doneQty}/${item.qty} Emb` : 'Emb'}
          </button>
        ) : item.isEmbroidery ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700">{doneQty}/{item.qty} Emb</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="py-1.5 text-center">
        {p.userIsAdmin ? (
          <button
            type="button"
            onClick={() => p.toggleLineItemDecoration(order, item, 'isPrint')}
            title="Toggle print"
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors duration-150 ${item.isPrint ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >
            {item.isPrint ? `${doneQty}/${item.qty} Print` : 'Print'}
          </button>
        ) : item.isPrint ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-700">{doneQty}/{item.qty} Print</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="py-1.5 text-center text-gray-700">
        {fulfilledQty}/{item.qty}
      </td>
      <td className="py-1.5 text-center">
        {itemPackingStatus === 'packed' ? (
          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700">
            {packedQty}/{item.qty}
          </span>
        ) : itemPackingStatus === 'partial' ? (
          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">
            {packedQty}/{item.qty}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      {hasRestock && (() => {
        const restockItem = restockItems.find((r) => r.lineItemId === item.id);
        if (!restockItem) return <td className="py-1.5 text-center"><span className="text-gray-300">-</span></td>;
        return (
          <td className="py-1.5 text-center">
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${restockItem.managed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {restockItem.managed ? restockItem.quantity : 0}/{restockItem.quantity}
            </span>
          </td>
        );
      })()}
      {hasDecorationWork && (() => {
        const d = item.decoration;
        const hasWork = (d?.works?.length ?? 0) > 0;

        if (!hasWork) return <td className="py-1.5 text-center"><span className="text-gray-300">-</span></td>;
        const badgeClass = d?.fullyDone
          ? 'bg-emerald-100 text-emerald-700'
          : doneQty > 0
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-500';
        const badge = (
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
            {doneQty}/{item.qty}
          </span>
        );
        return (
          <td className="py-1.5 text-center">
            {p.userIsAdmin ? (
              <button type="button" onClick={() => p.openWorkDetails(order, item)} title="View decoration work" className="cursor-pointer">
                {badge}
              </button>
            ) : badge}
          </td>
        );
      })()}
      <td className="py-1.5 flex-inline justify-start items-center">
        <input
          type="checkbox"
          checked={isFull}
          disabled={remainingQty === 0}
          onChange={() => p.toggleFull(order.id, itemIndex, remainingQty)}
          className="rounded border-gray-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        />
      </td>
      <td className="py-1.5 text-center">
        <input
          type="number"
          min={0}
          max={remainingQty}
          value={partialValue}
          disabled={isFull || remainingQty === 0}
          onChange={(e) => p.validPartial(order.id, itemIndex, remainingQty, e.target.value)}
          className="w-14 border border-blue-200 rounded px-1 py-0.5 text-center text-xs bg-white cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </td>
      {p.userIsAdmin && (
        <td className="py-1.5 text-center">
          <OrderItemActions p={p} order={order} item={item} />
        </td>
      )}
    </tr>
  );
}
