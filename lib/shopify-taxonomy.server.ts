import { revalidateTag } from 'next/cache';
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

export type TaxonomyField = 'types' | 'vendors' | 'tags';
export type TaxonomyCollection = { id: string; title: string };

const TAXONOMY_QUERY = `
  query StoreTaxonomyOptions {
    productTypes(first: 250) { nodes }
    productVendors(first: 250) { nodes }
    productTags(first: 250) { nodes }
  }
`;

const COLLECTION_CREATE_MUTATION = `
  mutation CreateStoreCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type TaxonomyQueryResult = {
  productTypes: { nodes: string[] };
  productVendors: { nodes: string[] };
  productTags: { nodes: string[] };
};

async function getStoreCredentials(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { storeDomain: true, accessToken: true } });
  if (!store?.accessToken) throw new Error('Store is not connected');
  return store as { storeDomain: string; accessToken: string };
}

function filterOptions(values: string[], search?: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const q = search?.trim().toLowerCase();
  for (const v of values ?? []) {
    const clean = v.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    if (q && !key.includes(q)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/**
 * Searches one store's Shopify product types / vendors / tags for the publish/bulk-update
 * pickers. Shopify exposes no server-side search arg for these string lists, so the full set
 * (cap 250 each) is fetched and filtered here — one round trip, same mechanics as the
 * collections search.
 */
export async function searchStoreTaxonomy(storeId: string, field: TaxonomyField, search?: string): Promise<string[]> {
  const { storeDomain, accessToken } = await getStoreCredentials(storeId);
  const data = await shopifyGraphQL<TaxonomyQueryResult>(storeDomain, accessToken, TAXONOMY_QUERY);
  const key = field === 'types' ? 'productTypes' : field === 'vendors' ? 'productVendors' : 'productTags';
  return filterOptions(data[key].nodes, search);
}

/** Creates a collection on the store (the Add flow for Collections) and returns it for instant
 * selection. Types, vendors and tags need no creation — free-form strings on `productSet`. */
export async function createStoreCollection(storeId: string, title: string): Promise<TaxonomyCollection> {
  const clean = title.trim().slice(0, 255);
  if (!clean) throw new Error('Enter a collection title');
  const { storeDomain, accessToken } = await getStoreCredentials(storeId);

  const data = await shopifyGraphQL<{
    collectionCreate: { collection: TaxonomyCollection | null; userErrors: { field: string[] | null; message: string }[] };
  }>(storeDomain, accessToken, COLLECTION_CREATE_MUTATION, { input: { title: clean } });

  const { collection, userErrors } = data.collectionCreate;
  if (userErrors.length > 0) throw new Error(userErrors.map((e) => e.message).join('; '));
  if (!collection) throw new Error('Shopify did not return the collection after creation');

  revalidateTag(`store-collections:${storeId}`, { expire: 0 });
  return { id: collection.id, title: collection.title };
}
