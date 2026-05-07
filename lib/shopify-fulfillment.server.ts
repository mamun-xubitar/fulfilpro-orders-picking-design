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
  assignedLocation: {
    location: {
      id: string;
    } | null;
  } | null;
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
    fulfillment: {
      id: string;
      status: string
      estimatedDeliveryAt?: string;
      deliveredAt?: string;
      trackingInfo?: {
        company?: string
        number?: string;
        url?: string
      }[]
    } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

export type FulfillmentRequestLine = {
  lineItemId: string;
  quantity: number;
};

export type FulfillmentTrackingInput = {
  number?: string;
  url?: string;
  company?: string;
};

export async function createShopifyFulfillment(params: {
  shop: string;
  accessToken: string;
  orderNumber: string;
  shopifyOrderId?: string | null;
  notifyCustomer: boolean;
  trackingInfo?: FulfillmentTrackingInput | null;
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

  const fulfillments = [];
  for (const locationGroup of groupFulfillmentGroupsByLocation(fulfillmentGroups)) {
    const data = await createFulfillmentForLocation(shop, params.accessToken, {
      notifyCustomer: params.notifyCustomer,
      trackingInfo: params.trackingInfo,
      lineItemsByFulfillmentOrder: locationGroup.lineItemsByFulfillmentOrder,
    });
    fulfillments.push(data);
  }

  return {
    orderId: order.id,
    fulfillmentId: fulfillments[0]?.fulfillmentCreate.fulfillment?.id ?? null,
    fulfillmentStatus: fulfillments[0]?.fulfillmentCreate.fulfillment?.status ?? 'SUCCESS',
    fulfillments: fulfillments.map((data) => data.fulfillmentCreate.fulfillment).filter(Boolean),
    lineItemsByFulfillmentOrder: fulfillmentGroups,
  };
}

async function createFulfillmentForLocation(
  shop: string,
  accessToken: string,
  params: {
    notifyCustomer: boolean;
    trackingInfo?: FulfillmentTrackingInput | null;
    lineItemsByFulfillmentOrder: Array<{
      fulfillmentOrderId: string;
      fulfillmentOrderLineItems: Array<{ id: string; quantity: number }>;
    }>;
  }
) {
  const data = await shopifyGraphQL<FulfillmentCreateResult>(shop, accessToken, {
    query: `
      mutation CreateFulfillment($fulfillment: FulfillmentInput!, $message: String) {
        fulfillmentCreate(fulfillment: $fulfillment, message: $message) {
          fulfillment {
            id
            status
            estimatedDeliveryAt
            deliveredAt
            trackingInfo{
              company
              number
              url
            }
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
        ...(params.trackingInfo && hasTrackingInfo(params.trackingInfo) ? { trackingInfo: params.trackingInfo } : {}),
        lineItemsByFulfillmentOrder: params.lineItemsByFulfillmentOrder,
      },
      message: 'Fulfillment confirmed from order fulfillment app',
    },
  });

  const userErrors = data.fulfillmentCreate.userErrors;
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(', '));
  }

  return data;
}

type FulfillmentUpdateTrackingResult = {
  fulfillmentTrackingInfoUpdateV2: {
    fulfillment: { id: string; status: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

type FulfillmentCancelResult = {
  fulfillmentCancel: {
    fulfillment: { id: string; status: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

export async function updateShopifyFulfillmentTracking(params: {
  shop: string;
  accessToken: string;
  shopifyFulfillmentId: string;
  trackingInfo: FulfillmentTrackingInput;
  notifyCustomer?: boolean;
}) {
  const shop = normalizeShopDomain(params.shop);
  const data = await shopifyGraphQL<FulfillmentUpdateTrackingResult>(shop, params.accessToken, {
    query: `
      mutation FulfillmentTrackingInfoUpdateV2($fulfillmentId: ID!, $trackingInfoInput: FulfillmentTrackingInput!, $notifyCustomer: Boolean) {
        fulfillmentTrackingInfoUpdateV2(fulfillmentId: $fulfillmentId, trackingInfoInput: $trackingInfoInput, notifyCustomer: $notifyCustomer) {
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
      fulfillmentId: params.shopifyFulfillmentId,
      trackingInfoInput: {
        ...(params.trackingInfo.number ? { number: params.trackingInfo.number } : {}),
        ...(params.trackingInfo.url ? { url: params.trackingInfo.url } : {}),
        ...(params.trackingInfo.company ? { company: params.trackingInfo.company } : {}),
      },
      notifyCustomer: params.notifyCustomer ?? false,
    },
  });

  const userErrors = data.fulfillmentTrackingInfoUpdateV2.userErrors;
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join(', '));
  }

  return data.fulfillmentTrackingInfoUpdateV2.fulfillment;
}

export async function cancelShopifyFulfillment(params: {
  shop: string;
  accessToken: string;
  shopifyFulfillmentId: string;
}) {
  const shop = normalizeShopDomain(params.shop);
  const data = await shopifyGraphQL<FulfillmentCancelResult>(shop, params.accessToken, {
    query: `
      mutation FulfillmentCancel($id: ID!) {
        fulfillmentCancel(id: $id) {
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
    variables: { id: params.shopifyFulfillmentId },
  });

  const userErrors = data.fulfillmentCancel.userErrors;
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join(', '));
  }

  return data.fulfillmentCancel.fulfillment;
}

function hasTrackingInfo(trackingInfo: FulfillmentTrackingInput) {
  return Boolean(trackingInfo.number || trackingInfo.url || trackingInfo.company);
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
              fulfillAt
              fulfillBy
              assignedLocation {
                location {
                  id
                }
              }
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
                fulfillAt
                fulfillBy
                assignedLocation {
                  location {
                    id
                  }
                }
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
  const map = new Map<string, Array<{ fulfillmentOrderId: string; fulfillmentOrderLineItemId: string; remainingQuantity: number; locationId: string }>>();
  for (const fulfillmentOrder of fulfillmentOrders) {
    if (fulfillmentOrder.status === 'CLOSED' || fulfillmentOrder.status === 'CANCELLED' || fulfillmentOrder.status === 'CANCELED') continue;

    const locationId = fulfillmentOrder.assignedLocation?.location?.id;
    if (!locationId) continue;

    for (const lineItem of fulfillmentOrder.lineItems.nodes) {
      if (lineItem.remainingQuantity <= 0) continue;

      const key = getGraphQLResourceId(lineItem.lineItem.id);
      const existing = map.get(key) ?? [];
      existing.push({
        fulfillmentOrderId: fulfillmentOrder.id,
        fulfillmentOrderLineItemId: lineItem.id,
        remainingQuantity: lineItem.remainingQuantity,
        locationId,
      });
      map.set(key, existing);
    }
  }

  return map;
}

function buildFulfillmentGroups(
  lines: FulfillmentRequestLine[],
  remainingByLineItem: Map<string, Array<{ fulfillmentOrderId: string; fulfillmentOrderLineItemId: string; remainingQuantity: number; locationId: string }>>
) {
  const groups = new Map<string, { locationId: string; fulfillmentOrderLineItems: Array<{ id: string; quantity: number }> }>();
  for (const line of lines) {
    let quantityLeft = line.quantity;
    const candidates = remainingByLineItem.get(line.lineItemId) ?? [];

    for (const candidate of candidates) {
      if (quantityLeft <= 0) break;

      const quantity = Math.min(quantityLeft, candidate.remainingQuantity);
      const existing = groups.get(candidate.fulfillmentOrderId) ?? {
        locationId: candidate.locationId,
        fulfillmentOrderLineItems: [],
      };
      existing.fulfillmentOrderLineItems.push({ id: candidate.fulfillmentOrderLineItemId, quantity });
      groups.set(candidate.fulfillmentOrderId, existing);
      quantityLeft -= quantity;
    }

    if (quantityLeft > 0) {
      throw new Error(`Selected quantity exceeds the remaining fulfillable quantity for line item ${line.lineItemId}`);
    }
  }

  return Array.from(groups.entries()).map(([fulfillmentOrderId, group]) => ({
    fulfillmentOrderId,
    locationId: group.locationId,
    fulfillmentOrderLineItems: group.fulfillmentOrderLineItems,
  }));
}

function groupFulfillmentGroupsByLocation(
  fulfillmentGroups: Array<{
    fulfillmentOrderId: string;
    locationId: string;
    fulfillmentOrderLineItems: Array<{ id: string; quantity: number }>;
  }>
) {
  const groups = new Map<string, Array<{
    fulfillmentOrderId: string;
    fulfillmentOrderLineItems: Array<{ id: string; quantity: number }>;
  }>>();

  for (const fulfillmentGroup of fulfillmentGroups) {
    const existing = groups.get(fulfillmentGroup.locationId) ?? [];
    existing.push({
      fulfillmentOrderId: fulfillmentGroup.fulfillmentOrderId,
      fulfillmentOrderLineItems: fulfillmentGroup.fulfillmentOrderLineItems,
    });
    groups.set(fulfillmentGroup.locationId, existing);
  }

  return Array.from(groups.entries()).map(([locationId, lineItemsByFulfillmentOrder]) => ({
    locationId,
    lineItemsByFulfillmentOrder,
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
