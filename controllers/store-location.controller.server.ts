import { StoreLocationModel } from '@/models/store-location.model.server';
import { LocationModel } from '@/models/location.model.server';
import { StoreModel } from '@/models/store.model.server';
import { fetchShopifyLocations } from '@/lib/shopify-locations.server';
import { canReadInventory } from '@/lib/roles';

const model = new StoreLocationModel();
const locationModel = new LocationModel();
const storeModel = new StoreModel();

type Session = { user?: { id?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

const forbidden = { error: { message: 'Forbidden', status: 403 } };

/** Each connected store's Shopify locations and the hub location each is mapped to — the mapping
 * order fulfilments / returns use to move stock at the right hub location. */
export class StoreLocationController {
  async list(session: Session) {
    if (!canReadInventory(session?.user?.role)) return forbidden;
    return { data: { storeLocations: await model.listAll() } };
  }

  /** Pulls every connected store's locations from Shopify. A store that fails is reported, not fatal. */
  async sync(session: Session) {
    if (!isAdmin(session)) return forbidden;
    const failed: string[] = [];
    for (const store of await storeModel.findConnectedWithTokens()) {
      try {
        await model.syncStore(store.id, await fetchShopifyLocations(store.storeDomain, store.accessToken));
      } catch (error) {
        console.error('Failed to sync Shopify locations', { storeId: store.id, error });
        failed.push(store.name || store.storeDomain);
      }
    }
    return {
      data: { storeLocations: await model.listAll(), failed },
      message: failed.length ? `Synced — couldn’t reach ${failed.join(', ')}` : 'Store locations synced',
    };
  }

  async update(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return forbidden;
    if (!(await model.findById(id))) return { error: { message: 'Store location not found', status: 404 } };
    const value = (body ?? {}) as Record<string, unknown>;
    const raw = value.inventoryLocationId;
    if (raw !== null && typeof raw !== 'string') {
      return { error: { message: 'Validation failed', errors: ['inventoryLocationId: Pick a location or none'], status: 400 } };
    }
    const inventoryLocationId = raw || null;
    if (inventoryLocationId && !(await locationModel.findById(inventoryLocationId))) {
      return { error: { message: 'Validation failed', errors: ['inventoryLocationId: Location not found'], status: 400 } };
    }
    await model.setMapping(id, inventoryLocationId);
    return { data: null, message: 'Mapping saved' };
  }
}
