import { variantOptionKey } from '@/lib/inventory/variant-option-key';

/** Shopify's own built-in option for a product with no custom options — every product has it,
 * and a single variant on `Title = "Default Title"` is what the admin renders as "no variants".
 * `productSet` requires this pair to be sent explicitly (both the `productOptions` entry and each
 * variant's `optionValues`) even though it looks like the "nothing" case — see
 * https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet. */
export const DEFAULT_OPTION_NAME = 'Title';
export const DEFAULT_OPTION_VALUE = 'Default Title';

/** What a blank colour/size axis used to be published as, before this app sent the real
 * Title/"Default Title" pair for simple products. Kept only so `optionMatchKeys` can still map a
 * listing that was published under the old scheme back onto its hub variant. */
export const LEGACY_BLANK_VALUE = 'Default';

export type OptionAxes = { useColour: boolean; useSize: boolean };

/** An axis is in use when ANY variant declares a non-blank value for it — not merely when values
 * differ across variants, so a single-variant product with a real (non-blank) colour or size still
 * publishes that axis as a real Shopify option instead of collapsing to Title/"Default Title".
 * Testing against blank-ness directly (rather than against the 'Default' sentinel some callers used
 * to substitute) also means a colour genuinely named "Default" is never misread as "no colour". */
export function resolveOptionAxes(variants: { colour: string; size: string }[]): OptionAxes {
  return {
    useColour: variants.some((v) => v.colour.trim() !== ''),
    useSize: variants.some((v) => v.size.trim() !== ''),
  };
}

/** The `VariantOptionValueInput[]` for one variant — REQUIRED and non-null on
 * `ProductVariantSetInput` in Admin API 2026-04. Never returns an empty array: a variant with
 * neither axis in use falls back to the built-in Title/"Default Title" pair, which is what avoids
 * "Expected value to not be null" for a simple product. */
export function variantOptionValues(
  v: { colour: string; size: string },
  axes: OptionAxes
): { optionName: string; name: string }[] {
  const values = [
    ...(axes.useColour ? [{ optionName: 'Colour', name: v.colour.trim() || LEGACY_BLANK_VALUE }] : []),
    ...(axes.useSize ? [{ optionName: 'Size', name: v.size.trim() || LEGACY_BLANK_VALUE }] : []),
  ];
  return values.length > 0 ? values : [{ optionName: DEFAULT_OPTION_NAME, name: DEFAULT_OPTION_VALUE }];
}

/** The product-level `productOptions` (`OptionSetInput[]`) matching `variantOptionValues` above.
 * Folds over the same per-variant function rather than re-deriving colours/sizes independently, so
 * the option list and every variant's `optionValues` can never drift apart — Shopify rejects a
 * declared option value with no variant, and a variant referencing an undeclared one. */
export function productOptionsInput(
  variants: { colour: string; size: string }[],
  axes: OptionAxes
): { name: string; values: { name: string }[] }[] {
  const valuesByOption = new Map<string, string[]>();
  for (const v of variants) {
    for (const { optionName, name } of variantOptionValues(v, axes)) {
      const values = valuesByOption.get(optionName) ?? [];
      if (!values.includes(name)) values.push(name);
      valuesByOption.set(optionName, values);
    }
  }
  return [...valuesByOption.entries()].map(([name, values]) => ({ name, values: values.map((name) => ({ name })) }));
}

/** Candidate `variantOptionKey()`s for matching a hub variant against Shopify's `selectedOptions`
 * response, most-specific (what we actually just sent) first:
 *  1. the key for what `variantOptionValues` sends now (handles Title/"Default Title" and any
 *     single-axis product, where Shopify returns only ONE selectedOption — a plain 2-value
 *     ['colour','size'] key would never match that);
 *  2. the legacy ['Default','Default']-style key, for a listing published before this fix;
 *  3. the raw, un-substituted [colour, size] pair, as a last resort.
 * Callers should also try a SKU match first — this is the fallback for once that comes up empty. */
export function optionMatchKeys(v: { colour: string; size: string }, axes: OptionAxes): string[] {
  const sent = variantOptionValues(v, axes).map((o) => o.name);
  const legacy = variantOptionKey([v.colour.trim() || LEGACY_BLANK_VALUE, v.size.trim() || LEGACY_BLANK_VALUE]);
  const raw = variantOptionKey([v.colour, v.size]);
  return [...new Set([variantOptionKey(sent), legacy, raw])];
}
