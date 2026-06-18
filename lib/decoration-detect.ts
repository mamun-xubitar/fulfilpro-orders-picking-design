export type DecorationFlags = {
  isEmbroidery: boolean;
  isPrint: boolean;
};

// Matches "embroidery"/"embroidered"/... and the standalone word "emb".
const EMBROIDERY_REGEX = /embroider|\bemb\b/i;
// Matches "print"/"printed"/"printing"/"prints".
const PRINT_REGEX = /\bprint/i;

/**
 * Detect whether a line item is an embroidery and/or print product by scanning
 * its product title/name for the keywords emb / embroidery / print.
 * Both flags can be true. Case-insensitive.
 */
export function detectDecoration(...titles: Array<string | null | undefined>): DecorationFlags {
  const haystack = titles.filter((t): t is string => Boolean(t && t.trim())).join(' ');
  return {
    isEmbroidery: EMBROIDERY_REGEX.test(haystack),
    isPrint: PRINT_REGEX.test(haystack),
  };
}
