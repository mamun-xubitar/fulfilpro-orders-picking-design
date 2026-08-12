import { getLegacyId, shopifyGraphQL } from '@/lib/shopify-graphql.server';

type ShopifyUserError = { field: string[] | null; message: string };

export type CalculatedLine = {
  calculatedLineItemId: string;
  lineItemLegacyId: string | null;
  title: string;
  sku: string | null;
  quantity: number;
  editableQuantity: number;
  restockable: boolean;
  hasVariant: boolean;
  unitPrice: string;
};

export type OrderEditAction =
  | { kind: 'setQuantity'; lineItemId: string; quantity: number; restock: boolean }
  | { kind: 'renameCustom'; lineItemId: string; title: string; quantity: number }
  | { kind: 'addVariant'; variantId: string; quantity: number }
  | { kind: 'addCustomItem'; title: string; price: string; quantity: number };

export class ShopifyOrderEditScopeError extends Error {}

const ORDER_EDIT_BEGIN_MUTATION = `
  mutation OrderEditBegin($id: ID!) {
    orderEditBegin(id: $id) {
      calculatedOrder {
        id
        originalOrder { presentmentCurrencyCode }
        lineItems(first: 100) {
          edges {
            node {
              id
              title
              sku
              quantity
              editableQuantity
              restockable
              variant { id }
              discountedUnitPriceSet { presentmentMoney { amount } }
            }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

const ORDER_EDIT_SET_QUANTITY_MUTATION = `
  mutation OrderEditSetQuantity($id: ID!, $lineItemId: ID!, $quantity: Int!, $restock: Boolean) {
    orderEditSetQuantity(id: $id, lineItemId: $lineItemId, quantity: $quantity, restock: $restock) {
      calculatedLineItem { id }
      userErrors { field message }
    }
  }
`;

const ORDER_EDIT_ADD_VARIANT_MUTATION = `
  mutation OrderEditAddVariant($id: ID!, $variantId: ID!, $quantity: Int!, $allowDuplicates: Boolean) {
    orderEditAddVariant(id: $id, variantId: $variantId, quantity: $quantity, allowDuplicates: $allowDuplicates) {
      calculatedLineItem { id }
      userErrors { field message }
    }
  }
`;

const ORDER_EDIT_ADD_CUSTOM_ITEM_MUTATION = `
  mutation OrderEditAddCustomItem($id: ID!, $title: String!, $price: MoneyInput!, $quantity: Int!, $requiresShipping: Boolean, $taxable: Boolean) {
    orderEditAddCustomItem(id: $id, title: $title, price: $price, quantity: $quantity, requiresShipping: $requiresShipping, taxable: $taxable) {
      calculatedLineItem { id }
      userErrors { field message }
    }
  }
`;

const ORDER_EDIT_COMMIT_MUTATION = `
  mutation OrderEditCommit($id: ID!, $notifyCustomer: Boolean, $staffNote: String) {
    orderEditCommit(id: $id, notifyCustomer: $notifyCustomer, staffNote: $staffNote) {
      order { id }
      userErrors { field message }
    }
  }
`;

const ORDER_PRESENTMENT_CURRENCY_QUERY = `
  query OrderPresentmentCurrency($id: ID!) {
    order(id: $id) { presentmentCurrencyCode }
  }
`;

/**
 * Read-only lookup used to label prices in the UI before an edit session
 * starts — does not open an orderEditBegin session like beginOrderEdit does.
 */
export async function getPresentmentCurrencyCode(params: {
  shop: string;
  accessToken: string;
  shopifyOrderId: string;
}): Promise<string> {
  const data = await shopifyGraphQL<{ order: { presentmentCurrencyCode: string } | null }>(
    params.shop,
    params.accessToken,
    ORDER_PRESENTMENT_CURRENCY_QUERY,
    { id: params.shopifyOrderId }
  );
  if (!data.order) {
    throw new Error('Order not found on Shopify');
  }
  return data.order.presentmentCurrencyCode;
}

type CalculatedOrderLineItemNode = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  editableQuantity: number;
  restockable: boolean;
  variant: { id: string } | null;
  discountedUnitPriceSet: { presentmentMoney: { amount: string } };
};

export async function beginOrderEdit(params: {
  shop: string;
  accessToken: string;
  shopifyOrderId: string;
}): Promise<{ calculatedOrderId: string; presentmentCurrencyCode: string; lines: CalculatedLine[] }> {
  const data = await runOrderEditMutation<{
    orderEditBegin: {
      calculatedOrder: {
        id: string;
        originalOrder: { presentmentCurrencyCode: string };
        lineItems: { edges: Array<{ node: CalculatedOrderLineItemNode }> };
      } | null;
      userErrors: ShopifyUserError[];
    };
  }>(params.shop, params.accessToken, ORDER_EDIT_BEGIN_MUTATION, { id: params.shopifyOrderId });

  assertNoUserErrors(data.orderEditBegin.userErrors);
  const calculatedOrder = data.orderEditBegin.calculatedOrder;
  if (!calculatedOrder) {
    throw new Error('Shopify did not return a calculated order for this edit session.');
  }

  const lines = calculatedOrder.lineItems.edges.map(({ node }) => ({
    calculatedLineItemId: node.id,
    lineItemLegacyId: getLegacyId(node.id) || null,
    title: node.title,
    sku: node.sku,
    quantity: node.quantity,
    editableQuantity: node.editableQuantity,
    restockable: node.restockable,
    hasVariant: Boolean(node.variant),
    unitPrice: node.discountedUnitPriceSet.presentmentMoney.amount,
  }));

  return {
    calculatedOrderId: calculatedOrder.id,
    presentmentCurrencyCode: calculatedOrder.originalOrder.presentmentCurrencyCode,
    lines,
  };
}

/**
 * Applies a sequence of order-edit actions in one session and commits them.
 * A failure at any step leaves an uncommitted session, which Shopify expires
 * harmlessly — so the whole operation is effectively atomic.
 */
export async function applyOrderEdit(params: {
  shop: string;
  accessToken: string;
  shopifyOrderId: string;
  actions: OrderEditAction[];
  notifyCustomer?: boolean;
  staffNote?: string;
}): Promise<{ orderId: string }> {
  const { shop, accessToken } = params;
  const { calculatedOrderId, presentmentCurrencyCode, lines } = await beginOrderEdit(params);

  const resolveLine = (lineItemId: string, expected?: { sku: string | null; title: string; quantity: number }) => {
    const byId = lines.find((line) => line.lineItemLegacyId === lineItemId);
    if (byId) return byId;

    if (expected) {
      const byFallback = lines.find(
        (line) => line.sku === expected.sku && line.title === expected.title && line.quantity === expected.quantity
      );
      if (byFallback) return byFallback;
    }

    throw new Error('Line item is no longer editable on this Shopify order — refresh and retry.');
  };

  for (const action of params.actions) {
    if (action.kind === 'setQuantity') {
      const line = resolveLine(action.lineItemId);
      const data = await runOrderEditMutation<{ orderEditSetQuantity: { userErrors: ShopifyUserError[] } }>(
        shop,
        accessToken,
        ORDER_EDIT_SET_QUANTITY_MUTATION,
        { id: calculatedOrderId, lineItemId: line.calculatedLineItemId, quantity: action.quantity, restock: action.restock }
      );
      assertNoUserErrors(data.orderEditSetQuantity.userErrors);
    } else if (action.kind === 'renameCustom') {
      const line = resolveLine(action.lineItemId);
      const removeData = await runOrderEditMutation<{ orderEditSetQuantity: { userErrors: ShopifyUserError[] } }>(
        shop,
        accessToken,
        ORDER_EDIT_SET_QUANTITY_MUTATION,
        { id: calculatedOrderId, lineItemId: line.calculatedLineItemId, quantity: 0, restock: false }
      );
      assertNoUserErrors(removeData.orderEditSetQuantity.userErrors);

      const addData = await runOrderEditMutation<{ orderEditAddCustomItem: { userErrors: ShopifyUserError[] } }>(
        shop,
        accessToken,
        ORDER_EDIT_ADD_CUSTOM_ITEM_MUTATION,
        {
          id: calculatedOrderId,
          title: action.title,
          price: { amount: line.unitPrice, currencyCode: presentmentCurrencyCode },
          quantity: action.quantity,
          requiresShipping: true,
          taxable: true,
        }
      );
      assertNoUserErrors(addData.orderEditAddCustomItem.userErrors);
    } else if (action.kind === 'addVariant') {
      const data = await runOrderEditMutation<{ orderEditAddVariant: { userErrors: ShopifyUserError[] } }>(
        shop,
        accessToken,
        ORDER_EDIT_ADD_VARIANT_MUTATION,
        { id: calculatedOrderId, variantId: action.variantId, quantity: action.quantity, allowDuplicates: true }
      );
      assertNoUserErrors(data.orderEditAddVariant.userErrors);
    } else {
      const data = await runOrderEditMutation<{ orderEditAddCustomItem: { userErrors: ShopifyUserError[] } }>(
        shop,
        accessToken,
        ORDER_EDIT_ADD_CUSTOM_ITEM_MUTATION,
        {
          id: calculatedOrderId,
          title: action.title,
          price: { amount: action.price, currencyCode: presentmentCurrencyCode },
          quantity: action.quantity,
          requiresShipping: true,
          taxable: true,
        }
      );
      assertNoUserErrors(data.orderEditAddCustomItem.userErrors);
    }
  }

  const commitData = await runOrderEditMutation<{
    orderEditCommit: { order: { id: string } | null; userErrors: ShopifyUserError[] };
  }>(shop, accessToken, ORDER_EDIT_COMMIT_MUTATION, {
    id: calculatedOrderId,
    notifyCustomer: params.notifyCustomer ?? false,
    staffNote: params.staffNote,
  });
  assertNoUserErrors(commitData.orderEditCommit.userErrors);

  return { orderId: commitData.orderEditCommit.order?.id ?? params.shopifyOrderId };
}

async function runOrderEditMutation<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  try {
    return await shopifyGraphQL<T>(shop, accessToken, query, variables);
  } catch (error) {
    if (isOrderEditScopeError(error)) {
      throw new ShopifyOrderEditScopeError(
        `Shopify has not authorized this app to edit orders for ${shop}. Open Stores and click Reconnect, then try again.`
      );
    }
    throw error;
  }
}

function isOrderEditScopeError(error: unknown) {
  return error instanceof Error && /write_order_edits|read_order_edits/i.test(error.message);
}

function assertNoUserErrors(errors: ShopifyUserError[]) {
  if (errors && errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}
