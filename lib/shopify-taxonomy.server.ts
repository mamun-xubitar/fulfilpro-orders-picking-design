import prisma from '@/lib/prisma.server';
import { shopifyGraphQL } from '@/lib/shopify-graphql.server';

export type TaxonomyCategory = { id: string; name: string; fullName: string; isLeaf: boolean };

const TAXONOMY_SEARCH_QUERY = `
  query ProductDetailTaxonomySearch($search: String, $first: Int!) {
    taxonomy {
      categories(search: $search, first: $first) {
        nodes { id name fullName isLeaf }
      }
    }
  }
`;

export async function searchTaxonomyCategories(storeId: string, search: string): Promise<TaxonomyCategory[]> {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { storeDomain: true, accessToken: true } });
  if (!store?.accessToken) throw new Error('Store is not connected');

  const data = await shopifyGraphQL<{ taxonomy: { categories: { nodes: TaxonomyCategory[] } } }>(
    store.storeDomain,
    store.accessToken,
    TAXONOMY_SEARCH_QUERY,
    { search: search || null, first: 20 }
  );
  return data.taxonomy.categories.nodes;
}
