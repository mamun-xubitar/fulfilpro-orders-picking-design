import prisma from '@/lib/prisma.server';
import type { StoreInvoiceSetting } from '@prisma/client';

export type InvoiceSettingValues = {
  storeName: string | null;
  businessName: string | null;
  email: string | null;
  websiteUrl: string | null;
  abn: string | null;
  invoicePrefix: string | null;
  paymentInstructions: string | null;
  accentColor: string | null;
  ausTaxRate: number;
  nzTaxRate: number;
  defaultTerms: string | null;
};

export type InvoiceSettingRow = Omit<StoreInvoiceSetting, 'ausTaxRate' | 'nzTaxRate'> & {
  ausTaxRate: number;
  nzTaxRate: number;
};

const toRow = (row: StoreInvoiceSetting): InvoiceSettingRow => ({
  ...row,
  ausTaxRate: Number(row.ausTaxRate),
  nzTaxRate: Number(row.nzTaxRate),
});

export class StoreInvoiceSettingModel {
  async findStore(storeId: string) {
    return prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, storeDomain: true, email: true, url: true },
    });
  }

  async findByStoreId(storeId: string) {
    const row = await prisma.storeInvoiceSetting.findUnique({ where: { storeId } });
    return row ? toRow(row) : null;
  }

  async upsert(storeId: string, values: InvoiceSettingValues) {
    const row = await prisma.storeInvoiceSetting.upsert({
      where: { storeId },
      create: { storeId, ...values },
      update: values,
    });
    return toRow(row);
  }

  /** Sets (or clears) the logo. On first use the row is created from `defaults`, so a logo
   * upload on an unconfigured store doesn't leave a row with no store name. */
  async setLogoPath(storeId: string, logoPath: string | null, defaults: InvoiceSettingValues) {
    const row = await prisma.storeInvoiceSetting.upsert({
      where: { storeId },
      create: { storeId, ...defaults, logoPath },
      update: { logoPath },
    });
    return toRow(row);
  }
}
