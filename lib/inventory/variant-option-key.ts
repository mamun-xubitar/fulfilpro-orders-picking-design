/** Normalized option key — order-insensitive, case-insensitive — so 1-, 2- or 3-option products
 * and renamed options (Color vs Colour) still remap without dropping mappings. Shared by the
 * publish path (matching Shopify's response back onto hub variants) and the publish/bulk-update
 * modals (seeding SKU, barcode, image and live stock from a store's existing listing), so the two
 * can never drift — they did, and a blank hub size published as 'Default' stopped matching
 * client-side entirely. */
export function variantOptionKey(values: string[]): string {
  return values.map((v) => v.trim().toLowerCase()).sort().join('::');
}
