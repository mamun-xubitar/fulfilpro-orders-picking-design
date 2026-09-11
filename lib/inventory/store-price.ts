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

/** The margin resolution chain for a store's price: a product-specific per-store margin
 * (SupplierProductStoreListing.marginPercent) wins when set; failing that, the store's own
 * global default (Store.defaultMarginPercent, set on the inventory toolbar's "Per store margin"
 * section); failing that too, `null` — meaning "no margin resolves here at all", so the caller
 * should fall back to the product's own sell price (computePricing's sellingIncTax) rather than
 * this formula. Shared by client (storeDraft.ts) and server (store-listing.controller.server.ts)
 * so the two can never resolve a store's price differently. */
export function resolveStoreMargin(productMargin: number | null, storeDefaultMargin: number | null): number | null {
  return productMargin ?? storeDefaultMargin ?? null;
}
