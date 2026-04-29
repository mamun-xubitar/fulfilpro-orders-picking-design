import { normalizeShopDomain } from '@/lib/shopify-auth.server';

const SHOPIFY_API_VERSION = '2026-04';

type ShopifyGraphQLError = {
  message: string;
};

type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: ShopifyGraphQLError[];
};

type FulfillmentOrderNode = {
  id: string;
  status: string;
  lineItems: {
    nodes: Array<{
      id: string;
      remainingQuantity: number;
      lineItem: {
        id: string;
      };
    }>;
  };
};

type FulfillmentOrderLookup = {
  order: {
    id: string;
    name: string;
    fulfillmentOrders: {
      nodes: FulfillmentOrderNode[];
    };
  } | null;
};

type OrderSearchLookup = {
  orders: {
    nodes: Array<{
      id: string;
      name: string;
      fulfillmentOrders: {
        nodes: FulfillmentOrderNode[];
      };
    }>;
  };
};

type FulfillmentCreateResult = {
  fulfillmentCreate: {
    fulfillment: { id: string; status: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

export type FulfillmentRequestLine = {
  lineItemId: string;
  quantity: number;
};

export async function createShopifyFulfillment(params: {
  shop: string;
  accessToken: string;
  orderNumber: string;
  shopifyOrderId?: string | null;
  notifyCustomer: boolean;
  lines: FulfillmentRequestLine[];
}) {
  const shop = normalizeShopDomain(params.shop);
  const order = params.shopifyOrderId
    ? await getOrderFulfillmentOrdersById(shop, params.accessToken, params.shopifyOrderId)
    : await findOrderFulfillmentOrdersByNumber(shop, params.accessToken, params.orderNumber);

  if (!order) {
    throw new Error(`Shopify order ${params.orderNumber} was not found`);
  }

  const remainingByLineItem = buildRemainingLineItemMap(order.fulfillmentOrders.nodes);
  const fulfillmentGroups = buildFulfillmentGroups(params.lines, remainingByLineItem);
  if (fulfillmentGroups.length === 0) {
    throw new Error('No fulfillable Shopify line items were found for the selected quantities');
  }

  const data = await shopifyGraphQL<FulfillmentCreateResult>(shop, params.accessToken, {
    query: `
      mutation CreateFulfillment($fulfillment: FulfillmentInput!, $message: String) {
        fulfillmentCreate(fulfillment: $fulfillment, message: $message) {
          fulfillment {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      fulfillment: {
        notifyCustomer: params.notifyCustomer,
        lineItemsByFulfillmentOrder: fulfillmentGroups,
      },
      message: 'Fulfillment confirmed from order fulfillment app',
    },
  });

  const userErrors = data.fulfillmentCreate.userErrors;
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(', '));
  }

  return {
    orderId: order.id,
    fulfillmentId: data.fulfillmentCreate.fulfillment?.id ?? null,
    fulfillmentStatus: data.fulfillmentCreate.fulfillment?.status ?? 'SUCCESS',
    lineItemsByFulfillmentOrder: fulfillmentGroups,
  };
}

async function getOrderFulfillmentOrdersById(shop: string, accessToken: string, orderId: string) {
  const data = await shopifyGraphQL<FulfillmentOrderLookup>(shop, accessToken, {
    query: `
      query OrderFulfillmentOrders($orderId: ID!) {
        order(id: $orderId) {
          id
          name
          fulfillmentOrders(first: 250) {
            nodes {
              id
              status
              lineItems(first: 250) {
                nodes {
                  id
                  remainingQuantity
                  lineItem {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `,
    variables: { orderId },
  });

  return data.order;
}

async function findOrderFulfillmentOrdersByNumber(shop: string, accessToken: string, orderNumber: string) {
  const data = await shopifyGraphQL<OrderSearchLookup>(shop, accessToken, {
    query: `
      query OrdersByName($query: String!) {
        orders(first: 5, query: $query) {
          nodes {
            id
            name
            fulfillmentOrders(first: 250) {
              nodes {
                id
                status
                lineItems(first: 250) {
                  nodes {
                    id
                    remainingQuantity
                    lineItem {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    variables: { query: `name:#${orderNumber} OR name:${orderNumber}` },
  });

  return data.orders.nodes[0] ?? null;
}

function buildRemainingLineItemMap(fulfillmentOrders: FulfillmentOrderNode[]) {
  const map = new Map<string, Array<{ fulfillmentOrderId: string; fulfillmentOrderLineItemId: string; remainingQuantity: number }>>();
  console.log("fulfillment orders", JSON.stringify(fulfillmentOrders, null, 2))
  for (const fulfillmentOrder of fulfillmentOrders) {
    if (fulfillmentOrder.status === 'CLOSED' || fulfillmentOrder.status === 'CANCELLED' || fulfillmentOrder.status === 'CANCELED') continue;

    for (const lineItem of fulfillmentOrder.lineItems.nodes) {
      if (lineItem.remainingQuantity <= 0) continue;

      const key = getGraphQLResourceId(lineItem.lineItem.id);
      const existing = map.get(key) ?? [];
      existing.push({
        fulfillmentOrderId: fulfillmentOrder.id,
        fulfillmentOrderLineItemId: lineItem.id,
        remainingQuantity: lineItem.remainingQuantity,
      });
      map.set(key, existing);
    }
  }

  return map;
}

function buildFulfillmentGroups(
  lines: FulfillmentRequestLine[],
  remainingByLineItem: Map<string, Array<{ fulfillmentOrderId: string; fulfillmentOrderLineItemId: string; remainingQuantity: number }>>
) {
  const groups = new Map<string, Array<{ id: string; quantity: number }>>();
  for (const line of lines) {
    let quantityLeft = line.quantity;
    const candidates = remainingByLineItem.get(line.lineItemId) ?? [];
    
    for (const candidate of candidates) {
      if (quantityLeft <= 0) break;

      const quantity = Math.min(quantityLeft, candidate.remainingQuantity);
      const existing = groups.get(candidate.fulfillmentOrderId) ?? [];
      existing.push({ id: candidate.fulfillmentOrderLineItemId, quantity });
      groups.set(candidate.fulfillmentOrderId, existing);
      quantityLeft -= quantity;
    }

    if (quantityLeft > 0) {
      throw new Error(`Selected quantity exceeds the remaining fulfillable quantity for line item ${line.lineItemId}`);
    }
  }

  return Array.from(groups.entries()).map(([fulfillmentOrderId, fulfillmentOrderLineItems]) => ({
    fulfillmentOrderId,
    fulfillmentOrderLineItems,
  }));
}

function getGraphQLResourceId(gid: string) {
  return gid.split('/').pop() ?? gid;
}

async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  payload: { query: string; variables?: Record<string, unknown> }
) {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  const json = (await res.json()) as ShopifyGraphQLResponse<T>;
  if (!res.ok) {
    throw new Error(`Shopify GraphQL request failed (${res.status})`);
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join(', '));
  }

  if (!json.data) {
    throw new Error('Shopify GraphQL response did not include data');
  }

  return json.data;
}
