import { type ShopifyOrderPayload } from '@/models/order.model.server';

const SHOPIFY_API_VERSION = '2026-04';

type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ShopifyOrderByIdResult = {
  order: {
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
  } | null;
};

const ORDER_BY_ID_QUERY = `
  query OrderById($id: ID!) {
    order(id: $id) {
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
  }
`;

export async function fetchShopifyOrderById(params: {
  shop: string;
  accessToken: string;
  orderId: string | number;
}) {
  const { shop, accessToken, orderId } = params;
  const data = await shopifyGraphQL<ShopifyOrderByIdResult>(shop, accessToken, {
    query: ORDER_BY_ID_QUERY,
    variables: {
      id: toOrderGid(orderId),
    },
  });

  if (!data.order) {
    throw new Error(`Shopify order ${orderId} was not found`);
  }

  return toShopifyOrderPayload(data.order);
}

async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  body: { query: string; variables: Record<string, unknown> }
) {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch Shopify order (${res.status}): ${errorText}`);
  }

  const payload = (await res.json()) as ShopifyGraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(`Failed to fetch Shopify order: ${payload.errors.map((error) => error.message).join(', ')}`);
  }
  if (!payload.data) {
    throw new Error('Failed to fetch Shopify order: missing GraphQL response data');
  }

  return payload.data;
}

function toShopifyOrderPayload(order: NonNullable<ShopifyOrderByIdResult['order']>): ShopifyOrderPayload {
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
    fulfillment_status: order.displayFulfillmentStatus?.toLowerCase() ?? null,
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

function toOrderGid(orderId: string | number) {
  const value = String(orderId);
  return value.startsWith('gid://shopify/Order/') ? value : `gid://shopify/Order/${value}`;
}

function getLegacyId(gid: string) {
  return gid.split('/').at(-1) ?? gid;
}

function getOrderNumber(name: string) {
  const normalized = name.trim().replace(/^#/, '');
  const numericOrderNumber = Number(normalized);
  return Number.isFinite(numericOrderNumber) ? numericOrderNumber : normalized;
}
