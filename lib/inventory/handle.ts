/** Shopify-style product handle helpers — a lowercase, URL-safe slug. Pure functions, safe to
 * import from client and server code alike (mirrors lib/inventory/colour.ts). */

/** "AllPro 41800 Men's Polo" -> "allpro-41800-men-s-polo". Strips accents, lowercases, turns
 * every run of non-alphanumerics into a single dash, and trims leading/trailing dashes. */
export function slugifyHandle(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidHandle(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** Appends "-2", "-3", ... until the slug isn't in `taken`. `base` itself is returned unchanged
 * when it's already free. */
export function uniqueHandle(base: string, taken: Set<string>): string {
  const root = base || 'product';
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}
