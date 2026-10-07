import { shopifyGraphQL } from '@/lib/shopify-graphql.server';

export type ShopifyLocation = { shopifyLocationId: string; name: string; active: boolean };

const LOCATIONS_QUERY = `
  query StoreLocations {
    locations(first: 100, includeInactive: true) {
      nodes { legacyResourceId name isActive }
    }
  }
`;

/** Shopify's numeric location id as the key StoreLocation stores — webhooks send it as a number
 * (`location_id: 123`), GraphQL as a gid (`gid://shopify/Location/123`). Null for a missing id. */
export function shopifyLocationKey(raw: string | number | null | undefined): string | null {
  if (raw == null) return null;
  const key = String(raw).trim().replace(/^gid:\/\/shopify\/Location\//, '');
  return key || null;
}

/** Every location of one store, active or not. */
export async function fetchShopifyLocations(storeDomain: string, accessToken: string): Promise<ShopifyLocation[]> {
  const data = await shopifyGraphQL<{ locations: { nodes: { legacyResourceId: string; name: string; isActive: boolean }[] } }>(
    storeDomain,
    accessToken,
    LOCATIONS_QUERY
  );
  return data.locations.nodes.map((n) => ({ shopifyLocationId: String(n.legacyResourceId), name: n.name, active: n.isActive }));
}
