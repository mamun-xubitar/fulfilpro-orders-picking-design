/** Pure invoice maths, shared by the invoice form (client) and the invoice controller (server). */

export type TaxRegion = 'AU' | 'NZ' | 'NONE';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export const DEFAULT_AUS_TAX_RATE = 11;
export const DEFAULT_NZ_TAX_RATE = 15;

export const round2 = (value: number) => Math.round(value * 100) / 100;

export type TotalsLine = { qty: number; unitPrice: number; discountPercent: number };

export function lineAmount(line: TotalsLine) {
  return round2(line.qty * line.unitPrice * (1 - line.discountPercent / 100));
}

/** Tax contained in a tax-inclusive total: the total itself never changes. */
export function includedTax(total: number, ratePercent: number) {
  if (ratePercent <= 0 || total <= 0) return 0;
  return round2((total * ratePercent) / (100 + ratePercent));
}

export function derivePaymentStatus(total: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return 'UNPAID';
  return amountPaid >= total ? 'PAID' : 'PARTIAL';
}

/** Which store rate applies to a ship-to country. A blank country counts as domestic (Australia). */
export function taxRegionForCountry(country: string | null | undefined): TaxRegion {
  const value = (country ?? '').trim().toLowerCase();
  if (value === '' || value === 'australia' || value === 'au') return 'AU';
  if (value === 'new zealand' || value === 'nz') return 'NZ';
  return 'NONE';
}

export function taxRateForRegion(region: TaxRegion, rates: { aus: number; nz: number }) {
  if (region === 'AU') return rates.aus;
  if (region === 'NZ') return rates.nz;
  return 0;
}

export function computeInvoiceTotals(input: {
  lines: TotalsLine[];
  shipping: number;
  taxRate: number;
  amountPaid: number;
}) {
  const sub = round2(input.lines.reduce((sum, line) => sum + round2(line.qty * line.unitPrice), 0));
  const net = round2(input.lines.reduce((sum, line) => sum + lineAmount(line), 0));
  const discount = round2(sub - net);
  const shipping = round2(input.shipping);
  const total = round2(net + shipping);
  const amountPaid = round2(input.amountPaid);
  return {
    sub,
    discount,
    shipping,
    tax: includedTax(total, input.taxRate),
    total,
    amountPaid,
    balance: round2(total - amountPaid),
    status: derivePaymentStatus(total, amountPaid),
  };
}
