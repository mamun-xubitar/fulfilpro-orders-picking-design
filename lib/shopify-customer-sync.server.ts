import prisma from '@/lib/prisma.server';
import { shopifyGraphQL } from '@/lib/shopify-graphql.server';
import { ShopifyCustomerModel } from '@/models/shopify-customer.model.server';

const model = new ShopifyCustomerModel();

const CUSTOMERS_QUERY = `
  query SyncCustomers($after: String) {
    customers(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        legacyResourceId
        firstName
        lastName
        email
        phone
        numberOfOrders
        amountSpent { amount }
        defaultAddress { company address1 address2 city province zip country }
      }
    }
  }
`;

type CustomerNode = {
  legacyResourceId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  numberOfOrders: string | number | null;
  amountSpent: { amount: string } | null;
  defaultAddress: {
    company: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    zip: string | null;
    country: string | null;
  } | null;
};

type CustomersResponse = {
  customers: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: CustomerNode[] };
};

const clean = (value: string | null | undefined) => value?.trim() || null;

function toValues(node: CustomerNode) {
  const address = node.defaultAddress;
  const fullName = [node.firstName, node.lastName].map(clean).filter(Boolean).join(' ');
  return {
    name: fullName || clean(address?.company) || clean(node.email) || `Customer ${node.legacyResourceId}`,
    company: clean(address?.company),
    email: clean(node.email),
    phone: clean(node.phone),
    address: clean(address?.address1),
    address2: clean(address?.address2),
    city: clean(address?.city),
    state: clean(address?.province),
    zip: clean(address?.zip),
    country: clean(address?.country),
    notes: null,
    ordersCount: Number(node.numberOfOrders ?? 0) || 0,
    totalSpent: Number(node.amountSpent?.amount ?? 0) || 0,
  };
}

/** Pulls every customer of one store into the local `ShopifyCustomer` table. */
export async function syncStoreCustomers(store: { id: string; storeDomain: string; accessToken: string }) {
  let after: string | null = null;
  let synced = 0;
  do {
    const data: CustomersResponse = await shopifyGraphQL<CustomersResponse>(store.storeDomain, store.accessToken, CUSTOMERS_QUERY, { after });
    for (const node of data.customers.nodes) {
      await model.upsertFromShopify(store.id, String(node.legacyResourceId), toValues(node));
      synced += 1;
    }
    after = data.customers.pageInfo.hasNextPage ? data.customers.pageInfo.endCursor : null;
  } while (after);
  return synced;
}

/** Syncs all connected stores. A store that fails (for example a missing scope) doesn't stop the rest. */
export async function syncAllStoreCustomers(onlyStoreId?: string) {
  const stores = await prisma.store.findMany({
    where: { status: 'connected', accessToken: { not: null }, ...(onlyStoreId ? { id: onlyStoreId } : {}) },
    select: { id: true, storeDomain: true, accessToken: true },
  });

  const failures: string[] = [];
  for (const store of stores) {
    try {
      await syncStoreCustomers({ id: store.id, storeDomain: store.storeDomain, accessToken: store.accessToken as string });
    } catch (error) {
      failures.push(`${store.storeDomain}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length) throw new Error(failures.join('; '));
}
