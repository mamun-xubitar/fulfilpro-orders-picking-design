import { StoreModel } from '@/models/store.model.server';
import {
  getAccessToken,
  getStoreInfo,
  normalizeShopDomain,
  registerOrderWebhooks,
  ShopifyCallbackQuery,
  verifyHmac,
} from '@/lib/shopify-auth.server';

const storeModel = new StoreModel();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query: ShopifyCallbackQuery = {
    code: searchParams.get('code'),
    hmac: searchParams.get('hmac'),
    host: searchParams.get('host'),
    shop: searchParams.get('shop'),
    state: searchParams.get('state'),
    timestamp: searchParams.get('timestamp'),
  };

  if (!query.shop || !query.code) {
    return Response.json({ error: 'shop and code are required' }, { status: 400 });
  }

  const normalizedShop = normalizeShopDomain(query.shop);
  const store = await storeModel.findByDomain(normalizedShop);
  if (!store) {
    return Response.json({ error: 'Store not found' }, { status: 404 });
  }

  const verified = verifyHmac(query, store.clientSecret);
  if (!verified) {
    return Response.json({ error: 'HMAC verification failed' }, { status: 400 });
  }

  const accessToken = await getAccessToken(
    normalizedShop,
    query.code,
    store.clientId,
    store.clientSecret
  );
  const shopInfo = await getStoreInfo(normalizedShop, accessToken);
  await registerOrderWebhooks(normalizedShop, accessToken);

  await storeModel.updateByDomain(normalizedShop, {
    accessToken,
    status: 'connected',
    name: shopInfo.name ?? store.name ?? "",
    url: shopInfo.url,
    email: shopInfo.email,
  });

  const appUrl = process.env.APP_URL?.replace(/\/$/, '') || '';
  return Response.redirect(`${appUrl}/stores?connected=${encodeURIComponent(normalizedShop)}`);
}
