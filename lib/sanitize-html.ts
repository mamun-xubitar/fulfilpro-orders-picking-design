import DOMPurify from 'isomorphic-dompurify';

/** Allowlist for the Product details "Description" field — imported straight from Shopify's
 * `Body (HTML)` CSV column, and editable in-app via `RichTextField`. Runs on both server (before
 * a save/import is persisted) and client (before a saved value is rendered), so untrusted HTML
 * never reaches the DOM unsanitized either way. */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'a',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'title', 'style'];

/** DOMPurify allows `style` as an attribute name (needed for the rich-text colour picker's
 * `<span style="color:...">`) but doesn't restrict its *value* — without this hook, arbitrary CSS
 * (e.g. a `url(...)`-based exfiltration vector) would pass straight through. The colour picker
 * only ever needs a `color:` declaration, so this strips every other declaration from `style` on
 * every element. */
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName !== 'style') return;
  const match = data.attrValue.match(/color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([\d\s,]+\)|[a-zA-Z]+)\s*;?/);
  data.attrValue = match ? `color: ${match[1]};` : '';
});

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
