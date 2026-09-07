import prisma from '@/lib/prisma.server';
import { shopifyGraphQL } from '@/lib/shopify-graphql.server';

export type StoreCollection = { id: string; title: string; handle: string };

const STORE_COLLECTIONS_QUERY = `
  query StoreCollectionsSearch($first: Int!) {
    collections(first: $first) {
      nodes { id title handle ruleSet { appliedDisjunctively } }
    }
  }
`;

/**
 * Searches a store's collections for the Collections picker in the publish/bulk-update modals.
 * Shopify's `collections(query:)` search syntax is unreliable for this — quoting/wildcarding a
 * multi-word title turned up empty even for collections that exist — so the full set (cap 250,
 * same ceiling as searchStoreTaxonomy) is fetched unfiltered and matched here instead, one round
 * trip either way. Automated (rule-based) collections are excluded — Shopify rejects direct
 * `collections` input membership writes on those, so they'd only ever error on publish.
 */
export async function searchStoreCollections(storeId: string, params: { search?: string }): Promise<StoreCollection[]> {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { storeDomain: true, accessToken: true } });
  if (!store?.accessToken) throw new Error('Store is not connected');

  const data = await shopifyGraphQL<{ collections: { nodes: { id: string; title: string; handle: string; ruleSet: { appliedDisjunctively: boolean } | null }[] } }>(
    store.storeDomain,
    store.accessToken,
    STORE_COLLECTIONS_QUERY,
    { first: 250 }
  );

  const q = params.search?.trim().toLowerCase();
  return data.collections.nodes
    .filter((c) => c.ruleSet === null && (!q || c.title.toLowerCase().includes(q)))
    .map((c) => ({ id: c.id, title: c.title, handle: c.handle }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
