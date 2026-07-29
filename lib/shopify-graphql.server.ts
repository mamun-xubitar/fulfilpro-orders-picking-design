const SHOPIFY_API_VERSION = '2026-04';
const MAX_RETRIES = 5;
const SAFETY_MARGIN_POINTS = 50;
const DEFAULT_MAX_AVAILABLE = 2000;
const DEFAULT_RESTORE_RATE = 100;
const DEFAULT_ESTIMATED_COST = 50;

type ThrottleStatus = {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
  updatedAt: number;
};

type ShopifyCostExtension = {
  requestedQueryCost: number;
  actualQueryCost: number | null;
  throttleStatus: {
    maximumAvailable: number;
    currentlyAvailable: number;
    restoreRate: number;
  };
};

type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
  extensions?: { cost?: ShopifyCostExtension };
};

const throttleStatusByShop = new Map<string, ThrottleStatus>();
const lastCostByShop = new Map<string, number>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateAvailablePoints(shop: string): number {
  const status = throttleStatusByShop.get(shop);
  if (!status) return DEFAULT_MAX_AVAILABLE;

  const elapsedSeconds = Math.max(0, (Date.now() - status.updatedAt) / 1000);
  const restored = elapsedSeconds * status.restoreRate;
  return Math.min(status.maximumAvailable, status.currentlyAvailable + restored);
}

async function waitForCapacity(shop: string, estimatedCost: number) {
  const status = throttleStatusByShop.get(shop);
  const restoreRate = status?.restoreRate ?? DEFAULT_RESTORE_RATE;
  const available = estimateAvailablePoints(shop);
  const required = estimatedCost + SAFETY_MARGIN_POINTS;

  if (available >= required) return;

  const deficit = required - available;
  const waitMs = Math.ceil((deficit / restoreRate) * 1000);
  if (waitMs > 0) await sleep(waitMs);
}

function recordCost(shop: string, cost?: ShopifyCostExtension) {
  if (!cost) return;
  throttleStatusByShop.set(shop, {
    maximumAvailable: cost.throttleStatus.maximumAvailable,
    currentlyAvailable: cost.throttleStatus.currentlyAvailable,
    restoreRate: cost.throttleStatus.restoreRate,
    updatedAt: Date.now(),
  });
  if (cost.actualQueryCost != null) {
    lastCostByShop.set(shop, cost.actualQueryCost);
  }
}

/**
 * Throttled Shopify Admin GraphQL client. Paces requests against the shop's
 * cost-based rate limit (extensions.cost.throttleStatus) and retries on
 * HTTP 429 / THROTTLED errors with backoff. Intended for the product sync +
 * bulk action paths only — order sync keeps its own separate client.
 */
export async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
  options?: { estimatedCost?: number }
): Promise<T> {
  const estimatedCost = options?.estimatedCost ?? lastCostByShop.get(shop) ?? DEFAULT_ESTIMATED_COST;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await waitForCapacity(shop, estimatedCost);

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

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 2000 * attempt;
      await sleep(retryAfterMs);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify GraphQL request failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as ShopifyGraphQLResponse<T>;
    recordCost(shop, payload.extensions?.cost);

    const throttledError = payload.errors?.find((error) => error.extensions?.code === 'THROTTLED');
    if (throttledError) {
      await sleep(1000 * attempt);
      continue;
    }
    // console.log("my payload", JSON.stringify(payload, null, 2))
    if (payload.errors?.length) {
      throw new Error(`Shopify GraphQL request failed: ${payload.errors.map((error) => error.message).join(', ')}`);
    }

    if (!payload.data) {
      throw new Error('Shopify GraphQL request failed: missing response data');
    }

    return payload.data;
  }

  throw new Error(`Shopify GraphQL request failed after ${MAX_RETRIES} attempts due to throttling`);
}

export function getLegacyId(gid: string) {
  return gid.split('/').at(-1) ?? gid;
}
