import 'dotenv/config';
import { StoreModel } from '@/models/store.model.server';
import { registerOrderWebhooks, registerProductWebhooks } from '@/lib/shopify-auth.server';
import prisma from '@/lib/prisma.server';

/**
 * Backfills webhook registration for every already-connected store. New stores register their
 * webhooks automatically during the OAuth callback (app/api/shopify-auth-callback/route.ts), but
 * a store connected before a topic was added to ORDER_WEBHOOK_TOPICS — orders/cancelled,
 * fulfillments/create, fulfillments/update, refunds/create — needs this run once so inventory
 * allocation actually receives those events. registerOrderWebhooks/registerProductWebhooks both
 * skip any topic+address pair Shopify already has registered, so running this repeatedly is safe.
 */
async function main() {
  const model = new StoreModel();
  const stores = await model.findConnectedWithTokens();
  console.log(`Registering webhooks for ${stores.length} connected store(s)...`);

  for (const store of stores) {
    if (!store.accessToken) continue;
    try {
      await registerOrderWebhooks(store.storeDomain, store.accessToken);
      await registerProductWebhooks(store.storeDomain, store.accessToken);
      console.log(`  ✓ ${store.storeDomain}`);
    } catch (error) {
      console.error(`  ✗ ${store.storeDomain}:`, error instanceof Error ? error.message : error);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
