import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { StoreModel } from '@/models/store.model.server';
import { generateInstallLink } from '@/lib/shopify-auth.server';
import { updateAppScopes } from '@/lib/shopify-partner.server';
import { apiError } from '@/lib/api-response.server';

async function verifyShopifyHmac(searchParams: URLSearchParams): Promise<{ valid: boolean; data: Record<string, string>; store?: { id: string; storeDomain: string; clientId: string; appId: string; appManagementToken: string } }> {
  const hmac = searchParams.get('hmac');
  const shop = searchParams.get('shop');

  if (!hmac) {
    console.log('[HMAC Verification] No HMAC parameter found');
    return { valid: false, data: {} };
  }

  if (!shop) {
    console.log('[HMAC Verification] No shop parameter found');
    return { valid: false, data: {} };
  }

  const storeModel = new StoreModel();
  const store = await storeModel.findByDomain(shop);

  if (!store) {
    console.error('[HMAC Verification] Store not found in database:', shop);
    return { valid: false, data: {} };
  }

  if (!store.clientSecret) {
    console.error('[HMAC Verification] Store has no client secret configured:', shop);
    return { valid: false, data: {} };
  }

  const params: Record<string, string> = {};
  const filteredParams: Array<[string, string]> = [];

  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
    if (key !== 'hmac') {
      filteredParams.push([key, value]);
    }
  }

  filteredParams.sort((a, b) => a[0].localeCompare(b[0]));
  const message = new URLSearchParams(filteredParams).toString();

  const generatedHmac = crypto
    .createHmac('sha256', store.clientSecret)
    .update(message)
    .digest('hex');

  const isValid = generatedHmac === hmac;

  let decodedHost: string | null = null;
  const hostParam = searchParams.get('host');
  if (hostParam) {
    try {
      decodedHost = Buffer.from(hostParam, 'base64').toString('utf-8');
    } catch (error) {
      console.error('[HMAC Verification] Failed to decode host parameter:', error);
    }
  }

  return {
    valid: isValid,
    data: params,
    store: { id: store.id, storeDomain: store.storeDomain, clientId: store.clientId, appId: store.appId as string, appManagementToken: store.appManagementToken as string }
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const result = await verifyShopifyHmac(searchParams);

  if (!result.valid) {
    return NextResponse.json(
      { error: 'Invalid HMAC signature', valid: false },
      { status: 403 }
    );
  }

  if (!result.store || !result.store.appManagementToken || !result.store.clientId) {
    return NextResponse.json(
      { error: 'Store information not found', valid: false },
      { status: 500 }
    );
  }

  const extraScopes = process.env.EXTRA_SCOPES?.split(',').map((s) => s.trim()).filter(Boolean) || [];

  if (extraScopes.length === 0) {
    return apiError({
      message: 'No EXTRA_SCOPES configured in environment',
      status: 400,
    });
  }

  const baseScopes = process.env.SHOPIFY_SCOPES?.split(',').map((s) => s.trim()).filter(Boolean) || [];

  const allScopes = [...baseScopes, ...extraScopes];
  const store = result.store;
  const res = await updateAppScopes({
    appId: store.appId,
    appManagementToken:store.appManagementToken,
    newScopes: allScopes,
    versionTag: 'scope-update',
    message: 'Update app scopes with extra scopes',
  });

  if (!res.success) {
    return apiError({
      message: res.errors?.join(', ') || 'Failed to update scopes',
      status: 500,
    });
  }

  const authorizeUrl = generateInstallLink(result.store.storeDomain, result.store.clientId);

  console.log('[Shopify Auth] Redirecting to install URL:', {
    shop: result.store.storeDomain,
    authorizeUrl,
  });

  return NextResponse.redirect(authorizeUrl);
}
