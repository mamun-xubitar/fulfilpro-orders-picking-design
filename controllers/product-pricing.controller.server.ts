import prisma from '@/lib/prisma.server';
import { ProductPricingModel } from '@/models/product-pricing.model.server';
import { SettingsModel } from '@/models/settings.model.server';
import { CurrencyRateModel } from '@/models/currency-rate.model.server';

const pricingModel = new ProductPricingModel();
const settingsModel = new SettingsModel();
const currencyModel = new CurrencyRateModel();

const CODE_RE = /^[A-Z]{3}$/;

type Session = { user?: { id?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class ProductPricingController {
  async get(productId: string, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const denied = await this.assertProductAccess(productId, allowedStoreIds);
    if (denied) return denied;

    const [pricing, settings, currencies] = await Promise.all([
      pricingModel.findByProductId(productId),
      settingsModel.get(),
      currencyModel.list(),
    ]);

    return {
      data: {
        pricing,
        globalMarginPercent: settings.globalMarginPercent,
        baseCurrency: 'AUD',
        currencies,
      },
    };
  }

  async save(productId: string, body: unknown, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const denied = await this.assertProductAccess(productId, allowedStoreIds);
    if (denied) return denied;

    const value = (body ?? {}) as Record<string, unknown>;
    const currencyCode = typeof value.currencyCode === 'string' ? value.currencyCode.trim().toUpperCase() : '';
    const exchangeRate = typeof value.exchangeRate === 'number' ? value.exchangeRate : NaN;
    const buyingPrice = typeof value.buyingPrice === 'number' ? value.buyingPrice : NaN;
    const freight = typeof value.freight === 'number' ? value.freight : NaN;
    const misc = typeof value.misc === 'number' ? value.misc : NaN;
    const marginPercent = typeof value.marginPercent === 'number' ? value.marginPercent : NaN;
    const tax = typeof value.tax === 'number' ? value.tax : NaN;

    const errors: string[] = [];
    if (!CODE_RE.test(currencyCode)) {
      errors.push('currencyCode: Enter a 3-letter ISO currency code');
    } else if (currencyCode !== 'AUD') {
      const existing = await currencyModel.findByCode(currencyCode);
      if (!existing) errors.push('currencyCode: Unknown currency code');
    }
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) errors.push('exchangeRate: Enter a rate greater than 0');
    if (!Number.isFinite(buyingPrice) || buyingPrice < 0) errors.push('buyingPrice: Enter a value of 0 or more');
    if (!Number.isFinite(freight) || freight < 0) errors.push('freight: Enter a value of 0 or more');
    if (!Number.isFinite(misc) || misc < 0) errors.push('misc: Enter a value of 0 or more');
    if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent > 100) errors.push('marginPercent: Margin must be between 0 and 100');
    if (!Number.isFinite(tax) || tax < 0) errors.push('tax: Enter a value of 0 or more');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const pricing = await pricingModel.upsert(productId, {
      currencyCode,
      exchangeRate,
      buyingPrice,
      freight,
      misc,
      marginPercent,
      tax,
    });

    return { data: pricing, message: 'Pricing saved' };
  }

  private async assertProductAccess(id: string, allowedStoreIds?: string[] | null) {
    const product = await prisma.product.findUnique({ where: { id }, select: { storeId: true } });
    if (!product) return { error: { message: 'Product not found', status: 404 } };
    if (allowedStoreIds !== null && allowedStoreIds !== undefined && !allowedStoreIds.includes(product.storeId)) {
      return { error: { message: 'Forbidden', status: 403 } };
    }
    return null;
  }
}
