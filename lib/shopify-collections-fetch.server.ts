import { shopifyGraphQL, getLegacyId } from '@/lib/shopify-graphql.server';

const COLLECTIONS_QUERY = `
  query StoreCollections($after: String) {
    collections(first: 250, after: $after) {
      nodes { id title handle }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type CollectionsResult = {
  collections: {
    nodes: Array<{ id: string; title: string; handle: string | null }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

export type StoreCollection = { id: string; title: string; handle: string | null };

export async function fetchStoreCollections(store: { storeDomain: string; accessToken: string }): Promise<StoreCollection[]> {
  const collections: StoreCollection[] = [];
  let after: string | null = null;

  do {
    const data: CollectionsResult = await shopifyGraphQL<CollectionsResult>(store.storeDomain, store.accessToken, COLLECTIONS_QUERY, { after });
    for (const node of data.collections.nodes) {
      collections.push({ id: getLegacyId(node.id), title: node.title, handle: node.handle });
    }
    after = data.collections.pageInfo.hasNextPage ? data.collections.pageInfo.endCursor : null;
  } while (after);

  return collections;
}
