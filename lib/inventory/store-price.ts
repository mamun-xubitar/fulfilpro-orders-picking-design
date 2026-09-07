/** Shared landed-cost → sell-price formula. Mirrors computePricing's math
 * (app/(shell)/inventory/modules/utils.ts) but keyed off a store's own margin instead of the
 * product-level one — used both to suggest a per-store draft price client-side and to actually
 * reprice a store on Shopify when its margin is saved, so the two can never drift. */
export function storePriceFromMargin(
  pricing: { buyingPrice: number; exchangeRate: number; freight: number; misc: number; tax: number },
  marginPercent: number
): number {
  const totalBuying = pricing.buyingPrice * pricing.exchangeRate + pricing.freight + pricing.misc;
  const sellingPrice = totalBuying * (1 + marginPercent / 100);
  return Math.round((sellingPrice + sellingPrice * (pricing.tax / 100)) * 100) / 100;
}
