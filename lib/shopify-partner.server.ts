import { generateInstallLink, normalizeShopDomain } from '@/lib/shopify-auth.server';

type OAuthParams = {
  client_id?: string;
  scope?: string;
  device_code?: string;
  grant_type?: string;
  requested_token_type?: string;
  subject_token_type?: string;
  audience?: string;
  subject_token?: string;
};

const DEFAULT_PARTNER_CLIENT_ID = 'fbdb2649-e327-4907-8f67-908d24cfd7e3';
const PARTNER_CLIENT_ID =
  process.env.SHOPIFY_PARTNER_ACCESS_TOKEN?.trim() || DEFAULT_PARTNER_CLIENT_ID;

const PARTNER_SCOPES =
  'openid https://api.shopify.com/auth/destinations.readonly https://api.shopify.com/auth/organization.store-management https://api.shopify.com/auth/organization.apps.manage https://api.shopify.com/auth/organization.on-demand-user-access';

const APP_MANAGEMENT_AUDIENCE =
  '7ee65a63608843c577db8b23c4d7316ea0a01bd2f7594f8a9c06ea668c1b775c';
const DESTINATIONS_AUDIENCE = '32ff8ee5-82b8-4d93-9f8a-c6997cefb7dc';

function toSearchParams(params: OAuthParams) {
  return new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );
}

export async function getDeviceCode() {
  if (!PARTNER_CLIENT_ID) {
    throw new Error('SHOPIFY_PARTNER_ACCESS_TOKEN is not configured');
  }

  const res = await fetch('https://accounts.shopify.com/oauth/device_authorization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: PARTNER_CLIENT_ID,
      scope: PARTNER_SCOPES,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || 'Failed to get device code');
  }
  return data;
}

export async function pollForToken(deviceCode: string) {
  const params: OAuthParams = {
    client_id: PARTNER_CLIENT_ID,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  };

  const res = await fetch('https://accounts.shopify.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();

  if (data?.error) return data;

  const businessPlatformToken = await getBusinessPlatformToken(data.access_token as string);
  const appManagementToken = await getAppManagementToken(data.access_token as string);

  return {
    appManagementToken: appManagementToken.access_token,
    businessPlatformToken: businessPlatformToken.access_token,
  };
}

async function getAppManagementToken(accessToken: string) {
  const params: OAuthParams = {
    client_id: PARTNER_CLIENT_ID,
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    audience: APP_MANAGEMENT_AUDIENCE,
    scope: 'https://api.shopify.com/auth/organization.apps.manage',
    subject_token: accessToken,
  };

  const res = await fetch('https://accounts.shopify.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  return res.json();
}

async function getBusinessPlatformToken(accessToken: string) {
  const params: OAuthParams = {
    client_id: PARTNER_CLIENT_ID,
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    audience: DESTINATIONS_AUDIENCE,
    scope: 'https://api.shopify.com/auth/destinations.readonly',
    subject_token: accessToken,
  };

  const res = await fetch('https://accounts.shopify.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  return res.json();
}

export async function listOrganizations(
  businessPlatformToken: string,
  shopDomain: string
) {
  const normalized = normalizeShopDomain(shopDomain);
  const res = await fetch('https://destinations.shopifysvc.com/destinations/api/2020-07/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${businessPlatformToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
      query {
        currentUserAccount{
          organizationsFirst:organizationsWithAccessToDestination(destination: DEVELOPER_DASHBOARD){
            nodes{
              name
              url
              categories{
                name
                destinations{
                  nodes{
                    webUrl
                    primaryDomain
                  }
                }
              }
            }
          }
          organizationsSecond:organizationsWithAccessToDestination(destination: APPS_CLI){
            nodes{
              name
              url
              categories{
                name
                destinations{
                  nodes{
                    webUrl
                    primaryDomain
                  }
                }
              }
            }
          }
          organizations(first: 250){
            nodes{
              name
              url
              categories{
                name
                destinations{
                  nodes{
                    webUrl
                    primaryDomain
                  }
                }
              }
            }
          }
        }
      }
    `,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();

  const organizations: { id: string; name: string }[] = [];
  const stores: { organizationId: string; shopUrl: string; primaryDomain: string }[] = [];

  function mergeOrgs(orgList: { nodes: Array<Record<string, unknown>> }) {
    for (const org of orgList.nodes) {
      const orgUrl = String(org.url ?? '');
      const orgId = `gid://shopify/Organization/${orgUrl.split('organization_id=')[1]?.split('&')[0] ?? ''}`;
      const categories = (org.categories as Array<Record<string, unknown>>) ?? [];

      for (const category of categories) {
        if (category.name !== 'stores') continue;
        const destinations =
          ((category.destinations as { nodes?: Array<Record<string, unknown>> })?.nodes ??
            []) as Array<Record<string, unknown>>;

        for (const destination of destinations) {
          const webUrl = String(destination.webUrl ?? '');
          const shopUrl = webUrl.split('//')[1]?.split('/')[0];
          if (!shopUrl) continue;

          if (stores.findIndex((s) => s.shopUrl === shopUrl) === -1) {
            stores.push({
              organizationId: orgId,
              shopUrl,
              primaryDomain: String(destination.primaryDomain ?? ''),
            });
          }
        }
      }

      if (orgId && organizations.findIndex((o) => o.id === orgId) === -1) {
        organizations.push({ id: orgId, name: String(org.name ?? '') });
      }
    }
  }

  mergeOrgs(data?.data?.currentUserAccount?.organizationsFirst ?? { nodes: [] });
  mergeOrgs(data?.data?.currentUserAccount?.organizationsSecond ?? { nodes: [] });
  mergeOrgs(data?.data?.currentUserAccount?.organizations ?? { nodes: [] });

  const desiredStore = stores.find(
    (store) =>
      store.primaryDomain.toLowerCase().includes(normalized.toLowerCase()) ||
      store.shopUrl.toLowerCase().includes(normalized.toLowerCase())
  );

  return {
    organizations,
    accessibleShops: stores,
    realShopUrl: desiredStore?.shopUrl ?? null,
    storeOrganizationId: desiredStore?.organizationId ?? null,
  };
}

export async function createApp(
  appManagementToken: string,
  organizationId: string,
  shopDomain: string
) {
  const appName = process.env.SHOPIFY_APP_NAME?.trim() || 'Order Fulfillment';
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) throw new Error('APP_URL is required');

  const query = `
    mutation CreateApp($initialVersion: AppVersionInput!, $organizationId: ID!) {
      appCreate(initialVersion: $initialVersion, organizationId: $organizationId) {
        app {
          id
          key
          activeRoot {
            clientCredentials {
              secrets {
                key
              }
            }
          }
        }
        userErrors {
          message
        }
      }
    }
  `;
  const variables = {
    organizationId,
    initialVersion: {
      source: {
        name: appName,
        modules: [
          {
            type: 'app_home',
            config: {
              app_url: appUrl,
              embedded: false,
            },
          },
          {
            type: 'branding',
            config: { name: appName },
          },
          {
            type: 'webhooks',
            config: { api_version: '2024-10' },
          },
          {
            type: 'app_access',
            config: {
              redirect_url_allowlist: [`${appUrl.replace(/\/$/, '')}/api/shopify-auth-callback`],
              scopes:
                process.env.SHOPIFY_SCOPES ||
                'read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_locations,write_locations',
            },
          },
        ],
      },
    },
  };

  const res = await fetch('https://app.shopify.com/app_management/unstable/graphql.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appManagementToken}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });

  const result = await res.json();
  const userErrors = result?.data?.appCreate?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(userErrors[0]?.message || 'Failed to create Shopify app');
  }

  const app = result?.data?.appCreate?.app;
  if (!app?.key || !app?.activeRoot?.clientCredentials?.secrets?.[0]?.key) {
    throw new Error('Shopify app creation response is missing credentials');
  }

  const clientId = app.key as string;
  const secretKey = app.activeRoot.clientCredentials.secrets[0].key as string;
  const normalizedShop = normalizeShopDomain(shopDomain);

  return {
    appId: app.id as string,
    clientId,
    secretKey,
    installUrl: generateInstallLink(normalizedShop, clientId),
  };
}
