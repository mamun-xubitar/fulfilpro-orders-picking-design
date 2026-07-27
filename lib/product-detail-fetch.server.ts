import { shopifyGraphQL, getLegacyId } from '@/lib/shopify-graphql.server';
import { upsertProduct, toProductGid, type ShopifyProductNode } from '@/lib/shopify-product-sync.server';

export type InventoryLevelNode = {
  location: { id: string; name: string };
  quantities: Array<{ name: string; quantity: number }>;
};

type ProductDetailVariantNode = ShopifyProductNode['variants']['nodes'][number] & {
  inventoryItem:
    | (NonNullable<ShopifyProductNode['variants']['nodes'][number]['inventoryItem']> & {
        inventoryLevels: { nodes: InventoryLevelNode[] };
      })
    | null;
};

type ProductDetailNode = ShopifyProductNode & {
  variants: { nodes: ProductDetailVariantNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};

type ProductDetailResult = {
  product: ProductDetailNode | null;
  locations: { nodes: Array<{ id: string; name: string }> };
};

const PRODUCT_DETAIL_QUERY = `
  query ProductDetail($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      vendor
      productType
      status
      tags
      descriptionHtml
      category { id name }
      featuredImage { url }
      media(first: 20) { nodes { id ... on MediaImage { image { url altText } } } }
      onlineStoreUrl
      onlineStorePreviewUrl
      totalInventory
      createdAt
      updatedAt
      resourcePublicationsV2(first: 25) {
        nodes { publication { id name } isPublished }
      }
      variants(first: 100) {
        nodes {
          id
          title
          sku
          price
          position
          inventoryQuantity
          inventoryPolicy
          selectedOptions { name value }
          image { url }
          inventoryItem {
            id
            tracked
            unitCost { amount }
            inventoryLevels(first: 10) {
              nodes {
                location { id name }
                quantities(names: ["available", "on_hand"]) { name quantity }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
    locations(first: 20, includeInactive: false) {
      nodes { id name }
    }
  }
`;

export type ProductDetailFetchResult = {
  product: ProductDetailNode;
  locations: Array<{ id: string; name: string }>;
};

/** One GraphQL round trip for the product-detail page: product + variants + per-location inventory + shop locations. Also refreshes the local mirror via the shared upsert path. */
export async function fetchProductDetail(
  store: { id: string; storeDomain: string; accessToken: string },
  shopifyProductId: string
): Promise<ProductDetailFetchResult | null> {
  const data = await shopifyGraphQL<ProductDetailResult>(store.storeDomain, store.accessToken, PRODUCT_DETAIL_QUERY, {
    id: toProductGid(shopifyProductId),
  });

  if (!data.product) return null;

  await upsertProduct(store.id, data.product);

  return {
    product: data.product,
    locations: data.locations.nodes.map((node) => ({ id: getLegacyId(node.id), name: node.name })),
  };
}
