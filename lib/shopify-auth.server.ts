import crypto from 'crypto';

const DEFAULT_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders,read_fulfillments,write_fulfillments,read_merchant_managed_fulfillment_orders,write_merchant_managed_fulfillment_orders,read_inventory,write_inventory,read_locations,write_locations,read_customers';

export type ShopifyCallbackQuery = {
  code: string | null;
  hmac: string | null;
  host: string | null;
  shop: string | null;
  state: string | null;
  timestamp: string | null;
};

export async function resolveShopDomain(input: string) {
  const host = normalizeHost(input);
  if (host.endsWith('.myshopify.com')) return host;

  try {
    const res = await fetch(`https://${host}/meta.json`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Please enter a valid shopify domain`);
    }

    const data = (await res.json()) as { myshopify_domain?: string };
    if (!data?.myshopify_domain) {
      throw new Error(`No myshopify_domain found for ${host}`);
    }

    return normalizeShopDomain(data.myshopify_domain);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Unable to resolve Shopify domain'
    );
  }
}

export function normalizeShopDomain(input: string) {
  const host = normalizeHost(input);
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) {
    throw new Error(`Invalid Shopify shop domain: ${input}`);
  }
  return host;
}

export function generateInstallLink(shop: string, clientId: string) {
  const normalizedShop = normalizeShopDomain(shop);
  const redirectUri = encodeURIComponent(getShopifyAuthCallbackUrl());
  const scopes = encodeURIComponent(process.env.SHOPIFY_SCOPES || DEFAULT_SCOPES);
  const state = crypto.randomUUID();

  return `https://${normalizedShop}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
}

export function verifyHmac(query: ShopifyCallbackQuery, clientSecret: string) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = new URLSearchParams(
    Object.entries(rest)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => [key, value as string])
  ).toString();

  const generatedHmac = crypto
    .createHmac('sha256', clientSecret)
    .update(message)
    .digest('hex');

  return generatedHmac === hmac;
}

export function verifyWebhookHmac(rawBody: string, hmacHeader: string, clientSecret: string) {
  const digest = crypto
    .createHmac('sha256', clientSecret)
    .update(rawBody, 'utf8')
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

export async function getAccessToken(
  shop: string,
  code: string,
  clientId: string,
  clientSecret: string
) {
  const normalizedShop = normalizeShopDomain(shop);
  const endpoint = `https://${normalizedShop}/admin/oauth/access_token`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
    signal: AbortSignal.timeout(15000),
  });
  // console.log("my res", JSON.stringify(res, null, 2), endpoint, normalizedShop)
  // console.log("response status", res.status, await res.text())
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Failed to exchange Shopify code for token (${res.status}): ${errorText}`
    );
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data?.access_token) {
    throw new Error('Shopify did not return access_token');
  }

  return data.access_token;
}

export async function getStoreInfo(shop: string, accessToken: string) {
  const normalizedShop = normalizeShopDomain(shop);
  const res = await fetch(`https://${normalizedShop}/admin/api/2025-01/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch Shopify shop info (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    shop?: { name?: string; email?: string; domain?: string; myshopify_domain?: string };
  };

  return {
    name: data.shop?.name ?? null,
    email: data.shop?.email ?? null,
    url: data.shop?.domain ? `https://${data.shop.domain}` : null,
    myshopifyDomain: data.shop?.myshopify_domain ?? normalizedShop,
  };
}

const ORDER_WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
] as const;

export async function registerOrderWebhooks(shop: string, accessToken: string) {
  const normalizedShop = normalizeShopDomain(shop);
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    throw new Error('APP_URL is required to register order webhooks');
  }

  const callbackAddress = `${appUrl.replace(/\/$/, '')}/api/webhooks/orders`;
  const existing = await fetchShopifyWebhooks(normalizedShop, accessToken);

  for (const topic of ORDER_WEBHOOK_TOPICS) {
    const alreadyExists = existing.some(
      (webhook) => webhook.topic === topic && webhook.address === callbackAddress
    );
    if (alreadyExists) continue;

    await createShopifyWebhook(normalizedShop, accessToken, topic, callbackAddress);
  }
}

type ExistingWebhook = { topic: string; address: string };

async function fetchShopifyWebhooks(shop: string, accessToken: string): Promise<ExistingWebhook[]> {
  const res = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json?limit=250`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list webhooks (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    webhooks?: Array<{ topic?: string; address?: string }>;
  };

  return (data.webhooks ?? [])
    .filter((webhook) => typeof webhook.topic === 'string' && typeof webhook.address === 'string')
    .map((webhook) => ({
      topic: webhook.topic as string,
      address: webhook.address as string,
    }));
}

async function createShopifyWebhook(
  shop: string,
  accessToken: string,
  topic: (typeof ORDER_WEBHOOK_TOPICS)[number],
  address: string
) {
  const res = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      webhook: {
        topic,
        address,
        format: 'json',
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create webhook ${topic} (${res.status}): ${errorText}`);
  }
}

function getShopifyAuthCallbackUrl() {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    throw new Error('APP_URL is required to generate Shopify OAuth callback URL');
  }

  const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  return `${baseUrl}/api/shopify-auth-callback`;
}

function normalizeHost(input: string) {
  const value = input.trim().toLowerCase();
  const withoutProtocol = value.replace(/^https?:\/\//, '');
  return withoutProtocol.split('/')[0].replace(/^www\./, '');
}
