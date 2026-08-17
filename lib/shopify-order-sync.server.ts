import prisma from '@/lib/prisma.server';
import { OrderModel, type ShopifyOrderPayload } from '@/models/order.model.server';
import { linkOrderLineItems } from '@/lib/product-order-link.server';

const SHOPIFY_API_VERSION = '2026-04';
const SHOPIFY_ORDERS_PAGE_SIZE = 200;
const orderModel = new OrderModel();

type SyncStoreResult = {
  storeId: string;
  storeDomain: string;
  fetched: number;
  created: number;
  updated: number;
  error?: string;
};

type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ShopifyGraphQLOrdersResult = {
  orders: {
    nodes: ShopifyGraphQLOrder[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

type ShopifyGraphQLOrder = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  note: string | null;
  createdAt: string;
  closedAt: string | null;
  cancelledAt: string | null;
  displayFulfillmentStatus: string | null;
  currentTotalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  } | null;
  discountCodes: string[];
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  shippingAddress: {
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    zip: string | null;
    country: string | null;
    phone: string | null;
    name: string | null;
  } | null;
  shippingLines: {
    nodes: Array<{
      id: string;
      title: string | null;
      code: string | null;
      source: string | null;
      originalPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      } | null;
      discountedPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      } | null;
      discountAllocations: Array<{
        allocatedAmountSet: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          };
        };
        discountApplication: {
          __typename: string;
          allocationMethod: string;
          index: number;
          targetSelection: string;
          code?: string | null;
          title?: string | null;
        };
      }>;
    }>;
  };
  lineItems: {
    nodes: Array<{
      id: string;
      name: string;
      title: string;
      variantTitle: string | null;
      sku: string | null;
      vendor: string | null;
      quantity: number;
      fulfillableQuantity: number;
      currentQuantity: number;
      image: {
        url: string;
      } | null;
      product: {
        id: string;
      } | null;
      discountedUnitPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      } | null;
      customAttributes: Array<{ key: string; value: string | null }>;
    }>;
  };
  fulfillments: Array<{
    id: string;
    status: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    trackingInfo: Array<{
      number: string | null;
      company: string | null;
      url: string | null;
    }>;
    fulfillmentLineItems: {
      nodes: Array<{
        quantity: number;
        lineItem: {
          id: string;
        } | null;
      }>;
    };
  }>;
};

const ORDERS_QUERY = `
  query OrdersForSync($first: Int!, $after: String, $query: String!) {
    orders(first: $first, after: $after, reverse: true, sortKey: CREATED_AT, query: $query) {
      nodes {
        id
        name
        email
        phone
        note
        createdAt
        closedAt
        cancelledAt
        displayFulfillmentStatus
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        discountCodes
        customer {
          firstName
          lastName
          email
          phone
        }
        shippingAddress {
          address1
          address2
          city
          province
          zip
          country
          phone
          name
        }
        shippingLines(first: 50) {
          nodes {
            id
            title
            code
            source
            originalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            discountedPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            discountAllocations {
              allocatedAmountSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              discountApplication {
                __typename
                allocationMethod
                index
                targetSelection
                ... on DiscountCodeApplication {
                  code
                }
                ... on AutomaticDiscountApplication {
                  title
                }
                ... on ManualDiscountApplication {
                  title
                }
                ... on ScriptDiscountApplication {
                  title
                }
              }
            }
          }
        }
        lineItems(first: 100) {
          nodes {
            id
            name
            title
            variantTitle
            sku
            vendor
            quantity
            fulfillableQuantity
            currentQuantity
            image {
              url
            }
            product {
              id
            }
            discountedUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customAttributes {
              key
              value
            }
          }
        }
        fulfillments(first: 50) {
          id
          status
          createdAt
          updatedAt
          trackingInfo {
            number
            company
            url
          }
          fulfillmentLineItems(first: 100) {
            nodes {
              quantity
              lineItem {
                id
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function syncConnectedStoreOrders(params?: {
  storeIds?: string[] | null;
  onStoreSynced?: (result: SyncStoreResult) => Promise<void> | void;
}) {
  const stores = await prisma.store.findMany({
    where: {
      status: 'connected',
      accessToken: { not: null },
      ...(params?.storeIds && params.storeIds.length > 0 ? { id: { in: params.storeIds } } : {}),
    },
    select: {
      id: true,
      storeDomain: true,
      accessToken: true,
      lastSyncedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const results = await Promise.all(
    stores.map(async (store): Promise<SyncStoreResult> => {
      try {
        let fetched = 0;
        let created = 0;
        let updated = 0;

        const orders = await fetchShopifyOrders(store.storeDomain, store.accessToken!, store.lastSyncedAt);
        fetched = orders.length;

        for (const order of orders) {
          const result = await orderModel.upsertFromShopifyOrder({
            payload: order,
            storeId: store.id,
          });

          if (result.created) created += 1;
          if (result.updated) updated += 1;

          try {
            await linkOrderLineItems(result.id);
          } catch (linkError) {
            console.error('Failed to link order line items during order sync', {
              orderId: result.id,
              error: linkError,
            });
          }
        }

        await prisma.store.update({
          where: { id: store.id },
          data: { lastSyncedAt: new Date() },
        });


        const result = {
          storeId: store.id,
          storeDomain: store.storeDomain,
          fetched,
          created,
          updated,
        };
        await params?.onStoreSynced?.(result);
        return result;
      } catch (error) {
        console.error('Order sync failed for store', {
          storeDomain: store.storeDomain,
          error: error instanceof Error ? error.message : error,
        });
        const result = {
          storeId: store.id,
          storeDomain: store.storeDomain,
          fetched: 0,
          created: 0,
          updated: 0,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        };
        await params?.onStoreSynced?.(result);
        return result;
      }
    })
  );

  return {
    totalStores: stores.length,
    totalFetched: results.reduce((sum, item) => sum + item.fetched, 0),
    totalCreated: results.reduce((sum, item) => sum + item.created, 0),
    totalUpdated: results.reduce((sum, item) => sum + item.updated, 0),
    failedStores: results.filter((item) => item.error).length,
    results,
  };
}

async function fetchShopifyOrders(
  shop: string,
  accessToken: string,
  lastSyncedAt: Date | null
): Promise<ShopifyOrderPayload[]> {
  const orders: ShopifyOrderPayload[] = [];
  let after: string | null = null;
  let hasNextPage = true;
  const query = lastSyncedAt ? `created_at:>'${lastSyncedAt.toISOString()}'` : '';

  while (hasNextPage) {
    const data: ShopifyGraphQLOrdersResult = await shopifyGraphQL<ShopifyGraphQLOrdersResult>(shop, accessToken, ORDERS_QUERY, {
      first: SHOPIFY_ORDERS_PAGE_SIZE,
      after,
      query,
    });

    for (const order of data.orders.nodes) {
      orders.push(toShopifyOrderPayload(order));
    }

    hasNextPage = data.orders.pageInfo.hasNextPage;
    after = data.orders.pageInfo.endCursor;
  }

  return orders;
}

async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>
) {
  const response = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify order sync failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as ShopifyGraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(`Shopify order sync failed: ${payload.errors.map((error) => error.message).join(', ')}`);
  }
  if (!payload.data) {
    throw new Error('Shopify order sync failed: missing GraphQL response data');
  }

  return payload.data;
}

function toShopifyOrderPayload(order: ShopifyGraphQLOrder): ShopifyOrderPayload {
  const totalPrice = order.currentTotalPriceSet?.shopMoney;

  return {
    id: getLegacyId(order.id),
    name: order.name,
    order_number: getOrderNumber(order.name),
    email: order.email,
    phone: order.phone,
    note: order.note,
    total_price: totalPrice?.amount ?? null,
    current_total_price: totalPrice?.amount ?? null,
    fulfillment_status: normalizeGraphQLFulfillmentStatus(order.displayFulfillmentStatus),
    created_at: order.createdAt,
    closed_at: order.closedAt,
    cancelled_at: order.cancelledAt,
    total_price_set: totalPrice
      ? {
        shop_money: {
          amount: totalPrice.amount,
          currency_code: totalPrice.currencyCode,
        },
      }
      : undefined,
    discount_codes: order.discountCodes.map((code) => ({ code })),
    customer: order.customer
      ? {
        first_name: order.customer.firstName,
        last_name: order.customer.lastName,
        email: order.customer.email,
        phone: order.customer.phone,
      }
      : null,
    shipping_address: order.shippingAddress
      ? {
        address1: order.shippingAddress.address1,
        address2: order.shippingAddress.address2,
        city: order.shippingAddress.city,
        province: order.shippingAddress.province,
        zip: order.shippingAddress.zip,
        country: order.shippingAddress.country,
        phone: order.shippingAddress.phone,
        name: order.shippingAddress.name,
      }
      : null,
    line_items: order.lineItems.nodes.map((lineItem) => {
      return {
        id: getLegacyId(lineItem.id),
        name: lineItem.name,
        title: lineItem.title,
        sku: lineItem.sku,
        product_id: lineItem.product?.id ? getLegacyId(lineItem.product.id) : null,
        variant_title: lineItem.variantTitle,
        image: lineItem.image?.url ? { src: lineItem.image.url, url: lineItem.image.url } : null,
        vendor: lineItem.vendor,
        quantity: lineItem.quantity,
        fulfillable_quantity: lineItem.fulfillableQuantity,
        current_quantity: lineItem.currentQuantity,
        price: lineItem.discountedUnitPriceSet?.shopMoney.amount ?? null,
        price_set: lineItem.discountedUnitPriceSet
          ? {
            shop_money: {
              amount: lineItem.discountedUnitPriceSet.shopMoney.amount,
              currency_code: lineItem.discountedUnitPriceSet.shopMoney.currencyCode,
            },
          }
          : undefined,
        custom_attributes: lineItem.customAttributes.map((a) => ({ name: a.key, value: a.value })),
      };
    }),
    shipping_lines: order.shippingLines.nodes.map((shippingLine) => ({
      id: getLegacyId(shippingLine.id),
      title: shippingLine.title,
      code: shippingLine.code,
      source: shippingLine.source,
      price: shippingLine.originalPriceSet?.shopMoney.amount ?? null,
      price_set: shippingLine.originalPriceSet
        ? {
          shop_money: {
            amount: shippingLine.originalPriceSet.shopMoney.amount,
            currency_code: shippingLine.originalPriceSet.shopMoney.currencyCode,
          },
        }
        : undefined,
      discounted_price: shippingLine.discountedPriceSet?.shopMoney.amount ?? null,
      discounted_price_set: shippingLine.discountedPriceSet
        ? {
          shop_money: {
            amount: shippingLine.discountedPriceSet.shopMoney.amount,
            currency_code: shippingLine.discountedPriceSet.shopMoney.currencyCode,
          },
        }
        : undefined,
      discount_allocations: shippingLine.discountAllocations.map((allocation) => ({
        amount: allocation.allocatedAmountSet.shopMoney.amount,
        amount_set: {
          shop_money: {
            amount: allocation.allocatedAmountSet.shopMoney.amount,
            currency_code: allocation.allocatedAmountSet.shopMoney.currencyCode,
          },
        },
        discount_application_index: allocation.discountApplication.index,
        code: 'code' in allocation.discountApplication ? allocation.discountApplication.code ?? null : null,
        title: 'title' in allocation.discountApplication ? allocation.discountApplication.title ?? null : null,
        type: allocation.discountApplication.__typename,
      })),
    })),
    fulfillments: order.fulfillments.map((fulfillment) => {
      const tracking = fulfillment.trackingInfo[0];

      return {
        id: getLegacyId(fulfillment.id),
        status: fulfillment.status,
        created_at: fulfillment.createdAt,
        updated_at: fulfillment.updatedAt,
        tracking_number: tracking?.number ?? null,
        tracking_company: tracking?.company ?? null,
        tracking_url: tracking?.url ?? null,
        line_items: fulfillment.fulfillmentLineItems.nodes.map((lineItem) => ({
          id: lineItem.lineItem ? getLegacyId(lineItem.lineItem.id) : null,
          quantity: lineItem.quantity,
        })),
      };
    }),
  };
}


function getLegacyId(gid: string) {
  return gid.split('/').at(-1) ?? gid;
}

function getOrderNumber(name: string): number {
  const normalized = name.trim().replace(/^#/, '');
  const numericOrderNumber = Number(normalized);
  if (!Number.isFinite(numericOrderNumber)) {
    throw new Error(`Order name "${name}" did not parse to a numeric order number`);
  }
  return numericOrderNumber;
}

function normalizeGraphQLFulfillmentStatus(status: string | null) {
  return status?.toLowerCase() ?? null;
}
