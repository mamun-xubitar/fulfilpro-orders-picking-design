import { CurrencyRateModel } from '@/models/currency-rate.model.server';
import { SettingsModel } from '@/models/settings.model.server';

const currencyModel = new CurrencyRateModel();
const settingsModel = new SettingsModel();

const CODE_RE = /^[A-Z]{3}$/;

type Session = { user?: { id?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class InventorySettingsController {
  async get(session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const [settings, currencies] = await Promise.all([settingsModel.get(), currencyModel.list()]);

    return {
      data: {
        globalMarginPercent: settings.globalMarginPercent,
        baseCurrency: 'AUD',
        currencies,
      },
    };
  }

  async updateMargin(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const globalMarginPercent = typeof value.globalMarginPercent === 'number' ? value.globalMarginPercent : NaN;

    const errors: string[] = [];
    if (!Number.isFinite(globalMarginPercent)) errors.push('globalMarginPercent: Margin is required');
    else if (globalMarginPercent < 0 || globalMarginPercent > 100) errors.push('globalMarginPercent: Margin must be between 0 and 100');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const settings = await settingsModel.update({ globalMarginPercent: Math.round(globalMarginPercent * 100) / 100 });

    return { data: { globalMarginPercent: settings.globalMarginPercent }, message: 'Margin saved' };
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
}
