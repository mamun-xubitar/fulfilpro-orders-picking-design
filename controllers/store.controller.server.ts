import { StoreModel, NoteType } from '@/models/store.model.server';
import {
  generateInstallLink,
  normalizeShopDomain,
  resolveShopDomain,
} from '@/lib/shopify-auth.server';

const model = new StoreModel();

export class StoreController {
  async list() {
    const stores = await model.findMany();
    return { data: stores };
  }

  async create(body: unknown) {
    const data = body as Record<string, string>;

    const rawStoreDomain = data.storeDomain?.trim();
    const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();

    const errors: string[] = [];
    if (!rawStoreDomain) errors.push('storeDomain: Store domain is required');
    if (!clientId || !clientSecret) {
      errors.push(
        'general: Missing Shopify app credentials in env (SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET)'
      );
    }

    if (errors.length) {
      return { error: { message: 'Validation failed', errors, status: 400 } };
    }

    let storeDomain: string;
    try {
      storeDomain = await resolveShopDomain(rawStoreDomain!);
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Invalid Shopify store domain',
          status: 400,
        },
      };
    }
    const exists = await model.existsByDomain(storeDomain);
    if (exists) {
      return { error: { message: 'A store with this domain already exists', status: 409 } };
    }

    await model.create({ storeDomain, clientId: clientId!, clientSecret: clientSecret! });
    const installUrl = generateInstallLink(storeDomain, clientId!);

    return {
      data: {
        storeDomain,
        installUrl,
      },
      message: 'Store added. Complete Shopify authorization to connect.',
    };
  }

  async update(id: string, body: unknown) {
    const data = body as Record<string, unknown>;

    const store = await model.findById(id);
    if (!store) {
      return { error: { message: 'Store not found', status: 404 } };
    }

    const updateData: Parameters<typeof model.update>[1] = {};

    if ('status' in data) {
      const status = data.status as string;
      if (!['disconnected'].includes(status)) {
        return { error: { message: 'Invalid status value', status: 400 } };
      }
      updateData.status = status;
      if (status === 'disconnected') {
        updateData.accessToken = null;
      }
    }

    if ('profitMargin' in data) {
      const margin = Number(data.profitMargin);
      if (isNaN(margin) || margin < 0 || margin > 100) {
        return { error: { message: 'Profit margin must be between 0 and 100', status: 400 } };
      }
      updateData.profitMargin = margin;
    }

    if ('notes' in data) {
      updateData.notes = JSON.stringify(data.notes as NoteType[]);
    }

    const updated = await model.update(id, updateData);
    return { data: updated, message: 'Store updated successfully' };
  }

  async getInstallLink(id: string) {
    const store = await model.findById(id);
    if (!store) {
      return { error: { message: 'Store not found', status: 404 } };
    }

    const installUrl = generateInstallLink(
      normalizeShopDomain(store.storeDomain),
      store.clientId
    );

    await model.update(id, { status: 'pending' });
    return { data: { installUrl }, message: 'Install link generated' };
  }

  async delete(id: string) {
    const store = await model.findById(id);
    if (!store) {
      return { error: { message: 'Store not found', status: 404 } };
    }

    await model.delete(id);
    return { data: null, message: 'Store deleted successfully' };
  }
}
