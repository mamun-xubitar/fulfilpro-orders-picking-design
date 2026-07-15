export type DecorationFlags = {
  isEmbroidery: boolean;
  isPrint: boolean;
};

export type DecorationKeywords = {
  embroidery: string[];
  print: string[];
};

export const DEFAULT_DECORATION_KEYWORDS: DecorationKeywords = {
  embroidery: ['embroider', 'emb'],
  print: ['print'],
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMatcher(tags: string[]): RegExp | null {
  const escaped = tags.map((tag) => tag.trim()).filter(Boolean).map(escapeRegExp);
  if (escaped.length === 0) return null;
  return new RegExp('\\b(?:' + escaped.join('|') + ')', 'i');
}

/**
 * Detect whether a line item is an embroidery and/or print product by scanning
 * its product title/name against the configured keyword lists.
 * Both flags can be true. Case-insensitive, matched at a word-start boundary.
 */
export function detectDecoration(keywords: DecorationKeywords, ...titles: Array<string | null | undefined>): DecorationFlags {
  const haystack = titles.filter((t): t is string => Boolean(t && t.trim())).join(' ');
  const embroideryMatcher = buildMatcher(keywords.embroidery);
  const printMatcher = buildMatcher(keywords.print);
  return {
    isEmbroidery: embroideryMatcher ? embroideryMatcher.test(haystack) : false,
    isPrint: printMatcher ? printMatcher.test(haystack) : false,
  };
}
