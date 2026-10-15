import prisma from '@/lib/prisma.server';

export type InvoiceSettingValues = {
  storeName: string | null;
  businessName: string | null;
  email: string | null;
  websiteUrl: string | null;
  abn: string | null;
  invoicePrefix: string | null;
  paymentInstructions: string | null;
  accentColor: string | null;
};

export class StoreInvoiceSettingModel {
  async findStore(storeId: string) {
    return prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, storeDomain: true, email: true, url: true },
    });
  }

  async findByStoreId(storeId: string) {
    return prisma.storeInvoiceSetting.findUnique({ where: { storeId } });
  }

  async upsert(storeId: string, values: InvoiceSettingValues) {
    return prisma.storeInvoiceSetting.upsert({
      where: { storeId },
      create: { storeId, ...values },
      update: values,
    });
  }

  /** Sets (or clears) the logo. On first use the row is created from `defaults`, so a logo
   * upload on an unconfigured store doesn't leave a row with no store name. */
  async setLogoPath(storeId: string, logoPath: string | null, defaults: InvoiceSettingValues) {
    return prisma.storeInvoiceSetting.upsert({
      where: { storeId },
      create: { storeId, ...defaults, logoPath },
      update: { logoPath },
    });
  }
}
