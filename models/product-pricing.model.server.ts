import prisma from '@/lib/prisma.server';

export type ProductPricingRow = {
  currencyCode: string;
  exchangeRate: number;
  buyingPrice: number;
  freight: number;
  misc: number;
  marginPercent: number;
  tax: number;
};

export type ProductPricingInput = {
  currencyCode: string;
  exchangeRate: number;
  buyingPrice: number;
  freight: number;
  misc: number;
  marginPercent: number;
  tax: number;
};

export class ProductPricingModel {
  async findByProductId(productId: string): Promise<ProductPricingRow | null> {
    const row = await prisma.productPricing.findUnique({ where: { productId } });
    return row ? toPricingRow(row) : null;
  }

  async upsert(productId: string, data: ProductPricingInput): Promise<ProductPricingRow> {
    const row = await prisma.productPricing.upsert({
      where: { productId },
      update: data,
      create: { productId, ...data },
    });
    return toPricingRow(row);
  }
}

function toPricingRow(row: {
  currencyCode: string;
  exchangeRate: unknown;
  buyingPrice: unknown;
  freight: unknown;
  misc: unknown;
  marginPercent: unknown;
  tax: unknown;
}): ProductPricingRow {
  return {
    currencyCode: row.currencyCode,
    exchangeRate: Number(row.exchangeRate),
    buyingPrice: Number(row.buyingPrice),
    freight: Number(row.freight),
    misc: Number(row.misc),
    marginPercent: Number(row.marginPercent),
    tax: Number(row.tax),
  };
}
