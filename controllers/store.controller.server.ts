import { StoreModel } from '@/models/store.model.server';
import {
  generateInstallLink,
  normalizeShopDomain,
  resolveShopDomain,
} from '@/lib/shopify-auth.server';
import { updateAppScopes } from '@/lib/shopify-partner.server';
import { removeLogoFile, validateLogoFile, writeLogoFile } from '@/lib/logo-upload.server';

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

    const updated = await model.update(id, updateData);
    return { data: updated, message: 'Store updated successfully' };
  }

  async uploadLogo(id: string, formData: FormData) {
    const store = await model.findById(id);
    if (!store) {
      return { error: { message: 'Store not found', status: 404 } };
    }

    const validated = validateLogoFile(formData.get('logo'));
    if ('error' in validated) {
      return { error: { message: validated.error, status: 400 } };
    }

    const relativePath = await writeLogoFile(validated.file, validated.extension, id);
    let updated;
    try {
      updated = await model.update(id, { logoPath: relativePath });
    } catch (error) {
      await removeLogoFile(relativePath);
      throw error;
    }
    await removeLogoFile(store.logoPath);

    return { data: updated, message: 'Store logo uploaded successfully' };
  }

  async deleteLogo(id: string) {
    const store = await model.findById(id);
    if (!store) {
      return { error: { message: 'Store not found', status: 404 } };
    }

    await removeLogoFile(store.logoPath);
    const updated = await model.update(id, { logoPath: null });
    return { data: updated, message: 'Store logo removed successfully' };
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

  async updateApp(id: string, body: unknown) {
    const { appManagementToken, appManagementTokenExpiresAt } = body as Record<string, string>;
    if (!appManagementToken) {
      return { error: { message: 'appManagementToken is required', status: 400 } };
    }

    const store = await model.findById(id);
    if (!store) return { error: { message: 'Store not found', status: 404 } };
    if (!store.appId) {
      return { error: { message: 'This store has no Shopify app to update.', status: 400 } };
    }

    const baseScopes = process.env.SHOPIFY_SCOPES?.split(',').map((s) => s.trim()).filter(Boolean) || [];
    const extraScopes = process.env.EXTRA_SCOPES?.split(',').map((s) => s.trim()).filter(Boolean) || [];

    try {
      const res = await updateAppScopes({
        appId: store.appId,
        appManagementToken,
        newScopes: [...baseScopes, ...extraScopes],
        message: 'Update app scopes and URLs',
      });
      if (!res.success) {
        return { error: { message: res.errors?.join(', ') || 'Failed to update app', status: 500 } };
      }
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to update app',
          status: 500,
        },
      };
    }

    await model.updateStoreWithTokens(
      appManagementToken,
      appManagementTokenExpiresAt,
      store.storeDomain
    );

    return {
      data: {
        status: 'updated',
        reauthorizeUrl: generateInstallLink(store.storeDomain, store.clientId),
      },
      message: 'App updated successfully.',
    };
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
