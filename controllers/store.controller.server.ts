import { StoreModel } from '@/models/store.model.server';
import {
  generateInstallLink,
  normalizeShopDomain,
  resolveShopDomain,
} from '@/lib/shopify-auth.server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const model = new StoreModel();
const LOGO_DIR = path.join(process.cwd(), 'public', 'uploaded', 'logos');
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function removeLogoFile(logoPath: string | null) {
  if (!logoPath?.startsWith('uploaded/logos/')) return;
  const filename = path.basename(logoPath);
  try {
    await unlink(path.join(LOGO_DIR, filename));
  } catch {
    // The database value is the source of truth; missing old files should not block updates.
  }
}

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

    const logo = formData.get('logo');
    if (!(logo instanceof File)) {
      return { error: { message: 'Logo file is required', status: 400 } };
    }

    const extension = ALLOWED_LOGO_TYPES[logo.type];
    if (!extension) {
      return { error: { message: 'Logo must be a PNG, JPG, WebP, or GIF image', status: 400 } };
    }

    if (logo.size > MAX_LOGO_SIZE) {
      return { error: { message: 'Logo must be 2MB or smaller', status: 400 } };
    }

    await mkdir(LOGO_DIR, { recursive: true });
    const filename = `${id}-${randomUUID()}.${extension}`;
    const relativePath = `uploaded/logos/${filename}`;
    const buffer = Buffer.from(await logo.arrayBuffer());

    await writeFile(path.join(LOGO_DIR, filename), buffer);
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

  async delete(id: string) {
    const store = await model.findById(id);
    if (!store) {
      return { error: { message: 'Store not found', status: 404 } };
    }

    await model.delete(id);
    return { data: null, message: 'Store deleted successfully' };
  }
}
