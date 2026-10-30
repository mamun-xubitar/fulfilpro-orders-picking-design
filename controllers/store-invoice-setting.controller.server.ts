import { StoreInvoiceSettingModel, type InvoiceSettingValues } from '@/models/store-invoice-setting.model.server';
import { DEFAULT_INVOICE_ACCENT } from '@/lib/invoice-defaults';
import { removeLogoFile, validateLogoFile, writeLogoFile } from '@/lib/logo-upload.server';
import { DEFAULT_AUS_TAX_RATE, DEFAULT_NZ_TAX_RATE } from '@/lib/invoice-totals';

const model = new StoreInvoiceSettingModel();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PREFIX_PATTERN = /^[A-Za-z0-9#/-]{1,10}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

type FormShape = { [K in keyof InvoiceSettingValues]: string } & { logoPath: string | null };
type Store = NonNullable<Awaited<ReturnType<StoreInvoiceSettingModel['findStore']>>>;

const NOT_FOUND = { error: { message: 'Store not found', status: 404 } };

function storeDefaults(store: Store): InvoiceSettingValues {
  return {
    storeName: store.name ?? store.storeDomain,
    businessName: null,
    email: store.email,
    websiteUrl: store.url,
    abn: null,
    invoicePrefix: null,
    paymentInstructions: null,
    accentColor: null,
    ausTaxRate: DEFAULT_AUS_TAX_RATE,
    nzTaxRate: DEFAULT_NZ_TAX_RATE,
    defaultTerms: null,
  };
}

function toForm(values: InvoiceSettingValues, logoPath: string | null): FormShape {
  return {
    storeName: values.storeName ?? '',
    businessName: values.businessName ?? '',
    email: values.email ?? '',
    websiteUrl: values.websiteUrl ?? '',
    abn: values.abn ?? '',
    invoicePrefix: values.invoicePrefix ?? '',
    paymentInstructions: values.paymentInstructions ?? '',
    accentColor: values.accentColor ?? DEFAULT_INVOICE_ACCENT,
    ausTaxRate: String(values.ausTaxRate),
    nzTaxRate: String(values.nzTaxRate),
    defaultTerms: values.defaultTerms ?? '',
    logoPath,
  };
}

function formatAbn(digits: string) {
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

/** Trims every field and validates it. Errors are `field: message` so `useRequest` shows them inline. */
function parseValues(body: unknown): { values: InvoiceSettingValues } | { errors: string[] } {
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '');
  const errors: string[] = [];

  const storeName = text('storeName');
  const email = text('email');
  const abnDigits = text('abn').replace(/\s/g, '');
  const invoicePrefix = text('invoicePrefix');
  const paymentInstructions = text('paymentInstructions');
  const accentColor = text('accentColor');
  const defaultTerms = text('defaultTerms');
  const rate = (key: string, label: string, fallback: number) => {
    const value = text(key);
    if (value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      errors.push(`${key}: ${label} must be between 0 and 100`);
      return fallback;
    }
    return Math.round(parsed * 100) / 100;
  };
  const ausTaxRate = rate('ausTaxRate', 'Australian tax rate', DEFAULT_AUS_TAX_RATE);
  const nzTaxRate = rate('nzTaxRate', 'New Zealand tax rate', DEFAULT_NZ_TAX_RATE);

  if (!storeName) errors.push('storeName: Store name is required');
  else if (storeName.length > 100) errors.push('storeName: Store name must be 100 characters or fewer');
  if (text('businessName').length > 100) errors.push('businessName: Business name must be 100 characters or fewer');
  if (email && !EMAIL_PATTERN.test(email)) errors.push('email: Enter a valid email address');
  if (text('websiteUrl').length > 200) errors.push('websiteUrl: Website must be 200 characters or fewer');
  if (abnDigits && !/^\d{11}$/.test(abnDigits)) errors.push('abn: ABN must be 11 digits');
  if (invoicePrefix && !PREFIX_PATTERN.test(invoicePrefix)) {
    errors.push('invoicePrefix: Up to 10 letters, numbers, #, / or -');
  }
  if (paymentInstructions.length > 1000) {
    errors.push('paymentInstructions: Payment instructions must be 1000 characters or fewer');
  }
  if (defaultTerms.length > 2000) errors.push('defaultTerms: Terms must be 2000 characters or fewer');
  if (accentColor && !COLOR_PATTERN.test(accentColor)) errors.push('accentColor: Use a hex color like #A6D3CC');
  if (errors.length) return { errors };

  return {
    values: {
      storeName,
      businessName: text('businessName') || null,
      email: email || null,
      websiteUrl: text('websiteUrl') || null,
      abn: abnDigits ? formatAbn(abnDigits) : null,
      invoicePrefix: invoicePrefix || null,
      paymentInstructions: paymentInstructions || null,
      accentColor: accentColor || null,
      ausTaxRate,
      nzTaxRate,
      defaultTerms: defaultTerms || null,
    },
  };
}

export class StoreInvoiceSettingController {
  async get(storeId: string) {
    const store = await model.findStore(storeId);
    if (!store) return NOT_FOUND;

    const saved = await model.findByStoreId(storeId);
    const form = saved ? toForm(saved, saved.logoPath) : toForm(storeDefaults(store), null);
    return { data: form, message: 'Invoice settings retrieved' };
  }

  async save(storeId: string, body: unknown) {
    const store = await model.findStore(storeId);
    if (!store) return NOT_FOUND;

    const parsed = parseValues(body);
    if ('errors' in parsed) {
      return { error: { message: 'Validation failed', errors: parsed.errors, status: 400 } };
    }

    const saved = await model.upsert(storeId, parsed.values);
    return { data: toForm(saved, saved.logoPath), message: 'Invoice settings saved' };
  }

  async uploadLogo(storeId: string, formData: FormData) {
    const store = await model.findStore(storeId);
    if (!store) return NOT_FOUND;

    const validated = validateLogoFile(formData.get('logo'));
    if ('error' in validated) {
      return { error: { message: validated.error, status: 400 } };
    }

    const previous = await model.findByStoreId(storeId);
    const relativePath = await writeLogoFile(validated.file, validated.extension, `invoice-${storeId}`);
    let saved;
    try {
      saved = await model.setLogoPath(storeId, relativePath, storeDefaults(store));
    } catch (error) {
      await removeLogoFile(relativePath);
      throw error;
    }
    await removeLogoFile(previous?.logoPath ?? null);

    return { data: toForm(saved, saved.logoPath), message: 'Invoice logo uploaded' };
  }

  async deleteLogo(storeId: string) {
    const store = await model.findStore(storeId);
    if (!store) return NOT_FOUND;

    const previous = await model.findByStoreId(storeId);
    if (!previous?.logoPath) {
      return { data: toForm(previous ?? storeDefaults(store), null), message: 'Invoice logo removed' };
    }

    const saved = await model.setLogoPath(storeId, null, storeDefaults(store));
    await removeLogoFile(previous.logoPath);
    return { data: toForm(saved, null), message: 'Invoice logo removed' };
  }
}
