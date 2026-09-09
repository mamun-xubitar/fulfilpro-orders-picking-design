/** Builds the system/prompt pair for the Product details AI description generator. Kept
 * provider-agnostic (no vendor SDK types) so it works unchanged behind any AiProvider — see
 * lib/ai/. */

export type DescriptionPromptInput = {
  name: string;
  brand: string;
  category: string;
  sizes: string[];
  colours: string[];
  /** The description currently in the field, if any — improved rather than replaced when present. */
  currentDescription: string;
  remarks: string;
};

const SYSTEM = `You are an ecommerce copywriter generating a product description for an internal inventory system.

Output contract — follow exactly, the result is inserted directly into the page:
- Return ONLY an HTML fragment. Allowed tags: <p>, <ul>, <li>, <strong>, <em>. No markdown, no code fences, no <html>/<head>/<body>, no headings.
- Structure: 1-2 short paragraphs in a warm, confident ecommerce voice, optionally followed by a bullet list of 3-5 short feature highlights.
- Never invent facts not present in the supplied product info — no fabric weights, certifications, care instructions, materials, or measurements unless they are explicitly given to you.
- Only mention colours or sizes that appear in the supplied lists.
- If a current description is supplied, rewrite and improve it rather than starting from nothing — keep any facts it states.
- Do not mention the brand name excessively or repeat the product name verbatim more than once.`;

export function buildProductDescriptionPrompt(input: DescriptionPromptInput): { system: string; prompt: string } {
  const lines: string[] = [];
  lines.push(`Product name: ${input.name || '(untitled)'}`);
  if (input.brand) lines.push(`Brand: ${input.brand}`);
  if (input.category) lines.push(`Category: ${input.category}`);
  if (input.colours.length > 0) lines.push(`Available colours: ${input.colours.join(', ')}`);
  if (input.sizes.length > 0) lines.push(`Available sizes: ${input.sizes.join(', ')}`);
  if (input.remarks) lines.push(`Internal remarks (context only, do not quote verbatim): ${input.remarks}`);
  if (input.currentDescription) {
    lines.push('');
    lines.push('Current description (HTML) to rewrite and improve:');
    lines.push(input.currentDescription);
  } else {
    lines.push('');
    lines.push('There is no existing description — write one from scratch using only the facts above.');
  }

  return { system: SYSTEM, prompt: lines.join('\n') };
}
