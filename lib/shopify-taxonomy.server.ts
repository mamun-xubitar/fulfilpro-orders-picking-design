import prisma from '@/lib/prisma.server';
import { shopifyGraphQL } from '@/lib/shopify-graphql.server';

export type TaxonomyCategory = {
  id: string;
  name: string;
  fullName: string;
  isLeaf: boolean;
  isRoot: boolean;
  level: number;
  parentId: string | null;
  childrenIds: string[];
};

const TAXONOMY_CATEGORIES_QUERY = `
  query ProductDetailTaxonomyCategories($search: String, $childrenOf: ID, $first: Int!) {
    taxonomy {
      categories(search: $search, childrenOf: $childrenOf, first: $first) {
        nodes { id name fullName isLeaf isRoot level parentId childrenIds }
      }
    }
  }
`;

/**
 * `search` drives flat search-mode results (Shopify searches the whole taxonomy tree); with no
 * `search`, `childrenOf` drills into one category's children, and omitting both returns the
 * taxonomy's top-level categories — Shopify's own documented default for the `categories`
 * connection with no filter arguments.
 */
export async function searchTaxonomyCategories(
  storeId: string,
  params: { search?: string; childrenOf?: string | null }
): Promise<TaxonomyCategory[]> {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { storeDomain: true, accessToken: true } });
  if (!store?.accessToken) throw new Error('Store is not connected');

  const search = params.search?.trim() || null;
  const data = await shopifyGraphQL<{ taxonomy: { categories: { nodes: TaxonomyCategory[] } } }>(
    store.storeDomain,
    store.accessToken,
    TAXONOMY_CATEGORIES_QUERY,
    { search, childrenOf: search ? null : (params.childrenOf ?? null), first: 100 }
  );
  return data.taxonomy.categories.nodes;
}
