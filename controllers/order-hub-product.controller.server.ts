import { HubProductError, OrderHubProductModel } from '@/models/order-hub-product.model.server';

const model = new OrderHubProductModel();

type Actor = { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null;

export class OrderHubProductController {
  /** "+ PO" on a line whose product is missing from the hub: creates it under the line's store first. */
  async ensure(orderId: string, lineItemId: string, actor: Actor) {
    if (actor?.role !== 'admin') return { error: { message: 'Forbidden', status: 403 } };
    try {
      const data = await model.ensureForLine({ orderId, lineItemId, actor: { id: actor.id ?? null, name: actor.name ?? actor.email ?? 'Unknown' } });
      return { data, message: data.created ? 'Product created in the hub' : 'Product is already in the hub' };
    } catch (error) {
      if (error instanceof HubProductError) return { error: { message: error.message, status: error.status } };
      throw error;
    }
  }
}
