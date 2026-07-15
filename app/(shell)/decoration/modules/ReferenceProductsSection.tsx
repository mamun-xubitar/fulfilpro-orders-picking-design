import type { OrderItem, OrderRow } from '../../orders/modules/types';
import { getFulfilledQty } from '../../orders/modules/utils';

type Props = {
  order: OrderRow;
  items: OrderItem[];
};

export default function ReferenceProductsSection({ order, items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="mb-2 border-gray-200 pt-3">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-gray-800">{item.name || item.title}</span>
              {item.isEmbroidery && <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-semibold">Emb</span>}
              {item.isPrint && <span className="rounded-full bg-sky-100 text-sky-700 px-1.5 py-0.5 text-[10px] font-semibold">Print</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
              {item.sku && <span className="font-mono">{item.sku}</span>}
              <span>Qty <strong className="text-gray-700">{item.qty}</strong></span>
              <span>Packed <strong className="text-gray-700">{item.packedQuantity ?? 0}/{item.qty}</strong></span>
              <span>Fulfilled <strong className="text-gray-700">{getFulfilledQty(order, item.id)}/{item.qty}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
