import prisma from '@/lib/prisma.server';

export type CurrencyRateRow = { id: string; code: string; rate: number; createdAt: string; updatedAt: string };

export class CurrencyRateModel {
  async list(): Promise<CurrencyRateRow[]> {
    const rows = await prisma.currencyRate.findMany({ orderBy: { code: 'asc' } });
    return rows.map(toCurrencyRateRow);
  }

  async findById(id: string): Promise<CurrencyRateRow | null> {
    const row = await prisma.currencyRate.findUnique({ where: { id } });
    return row ? toCurrencyRateRow(row) : null;
  }

  async findByCode(code: string): Promise<CurrencyRateRow | null> {
    const row = await prisma.currencyRate.findUnique({ where: { code } });
    return row ? toCurrencyRateRow(row) : null;
  }

  async create(data: { code: string; rate: number }): Promise<CurrencyRateRow> {
    const row = await prisma.currencyRate.create({ data });
    return toCurrencyRateRow(row);
  }

  async updateRate(id: string, rate: number): Promise<CurrencyRateRow> {
    const row = await prisma.currencyRate.update({ where: { id }, data: { rate } });
    return toCurrencyRateRow(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.currencyRate.delete({ where: { id } });
  }
}

function toCurrencyRateRow(row: { id: string; code: string; rate: unknown; createdAt: Date; updatedAt: Date }): CurrencyRateRow {
  return {
    id: row.id,
    code: row.code,
    rate: Number(row.rate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
