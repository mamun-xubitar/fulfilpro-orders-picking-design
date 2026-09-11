import prisma from '@/lib/prisma.server';
import { CurrencyRateModel } from '@/models/currency-rate.model.server';
import { SettingsModel } from '@/models/settings.model.server';
import { StoreModel } from '@/models/store.model.server';
import type { UpdateAppSettingsData } from '@/models/settings.model.server';

const currencyModel = new CurrencyRateModel();
const settingsModel = new SettingsModel();
const storeModel = new StoreModel();

const CODE_RE = /^[A-Z]{3}$/;

type Session = { user?: { id?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class InventorySettingsController {
  async get(session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const [settings, currencies, exchangeRateRow] = await Promise.all([
      settingsModel.get(),
      currencyModel.list(),
      prisma.appSettings.findUnique({ where: { id: 'default' }, select: { globalExchangeRate: true } }),
    ]);

    return {
      data: {
        globalMarginPercent: settings.globalMarginPercent,
        globalExchangeRate: Number(exchangeRateRow?.globalExchangeRate ?? 1),
        lowStockThreshold: settings.lowStockThreshold,
        baseCurrency: 'AUD',
        currencies,
      },
    };
  }

  async update(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const updateData: UpdateAppSettingsData = {};
    const errors: string[] = [];
    let globalExchangeRate: number | undefined;

    if ('globalMarginPercent' in value) {
      const margin = Number(value.globalMarginPercent);
      if (!Number.isFinite(margin)) errors.push('globalMarginPercent: Margin is required');
      else if (margin < 0) errors.push('globalMarginPercent: Margin must be 0 or more');
      else updateData.globalMarginPercent = Math.round(margin * 100) / 100;
    }

    if ('globalExchangeRate' in value) {
      const rate = Number(value.globalExchangeRate);
      if (!Number.isFinite(rate) || rate <= 0) errors.push('globalExchangeRate: Enter a rate greater than 0');
      else globalExchangeRate = Math.round(rate * 1_000_000) / 1_000_000;
    }

    if ('lowStockThreshold' in value) {
      const threshold = Number(value.lowStockThreshold);
      if (!Number.isInteger(threshold) || threshold < 0) errors.push('lowStockThreshold: Must be 0 or a whole number');
      else updateData.lowStockThreshold = threshold;
    }

    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };
    if (!Object.keys(updateData).length && globalExchangeRate === undefined) return { error: { message: 'No settings to update', status: 400 } };

    const settings = Object.keys(updateData).length ? await settingsModel.update(updateData) : await settingsModel.get();
    if (globalExchangeRate !== undefined) {
      await prisma.appSettings.update({ where: { id: 'default' }, data: { globalExchangeRate } });
    }

    const currentRate =
      globalExchangeRate ??
      Number((await prisma.appSettings.findUnique({ where: { id: 'default' }, select: { globalExchangeRate: true } }))?.globalExchangeRate ?? 1);

    return {
      data: {
        globalMarginPercent: settings.globalMarginPercent,
        globalExchangeRate: currentRate,
        lowStockThreshold: settings.lowStockThreshold,
      },
      message: 'Settings saved',
    };
  }

  async createCurrency(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const code = typeof value.code === 'string' ? value.code.trim().toUpperCase() : '';
    const rate = typeof value.rate === 'number' ? value.rate : NaN;

    const errors: string[] = [];
    if (!code) errors.push('code: Currency code is required');
    else if (!CODE_RE.test(code)) errors.push('code: Enter a 3-letter ISO currency code');
    else if (code === 'AUD') errors.push('code: AUD is the base currency');
    if (!Number.isFinite(rate) || rate <= 0) errors.push('rate: Enter a rate greater than 0');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const existing = await currencyModel.findByCode(code);
    if (existing) return { error: { message: 'Validation failed', errors: ['code: This currency already has a rate'], status: 409 } };

    const currency = await currencyModel.create({ code, rate });
    return { data: currency, message: 'Currency added' };
  }

  async updateCurrencyRate(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await currencyModel.findById(id);
    if (!existing) return { error: { message: 'Currency not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rate = typeof value.rate === 'number' ? value.rate : NaN;

    const errors: string[] = [];
    if (!Number.isFinite(rate) || rate <= 0) errors.push('rate: Enter a rate greater than 0');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const currency = await currencyModel.updateRate(id, rate);
    return { data: currency, message: 'Currency updated' };
  }

  async deleteCurrency(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await currencyModel.findById(id);
    if (!existing) return { error: { message: 'Currency not found', status: 404 } };

    await currencyModel.delete(id);
    return { data: null, message: 'Currency removed' };
  }

  /** The "Per store margin" section on the inventory toolbar's Store-wide defaults card — a
   * global fallback margin per connected store, used when a product has no product-specific
   * per-store margin of its own (see the resolution chain in lib/inventory/store-price.ts). */
  async listStoreMargins(session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const stores = await storeModel.findConnectedWithDefaultMargins();
    return {
      data: {
        stores: stores.map((s) => ({ storeId: s.id, storeName: s.name ?? s.storeDomain, marginPercent: s.defaultMarginPercent })),
      },
    };
  }

  async setStoreMargin(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const storeId = typeof value.storeId === 'string' ? value.storeId : '';
    if (!storeId) return { error: { message: 'storeId: A store is required', status: 400 } };

    if (value.marginPercent === null) {
      await storeModel.setDefaultMargin(storeId, null);
      return { data: { storeId, marginPercent: null }, message: 'Store margin removed' };
    }

    const marginPercent = Number(value.marginPercent);
    if (!Number.isFinite(marginPercent) || marginPercent < 0) {
      return { error: { message: 'Validation failed', errors: ['marginPercent: Enter a margin of 0 or more'], status: 400 } };
    }
    const rounded = Math.round(marginPercent * 100) / 100;
    await storeModel.setDefaultMargin(storeId, rounded);
    return { data: { storeId, marginPercent: rounded }, message: 'Store margin saved' };
  }
}
