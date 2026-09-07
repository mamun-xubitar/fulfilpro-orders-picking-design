/** Shared colour resolution for the inventory hub — imported by both client
 * components (app/(shell)/inventory/modules) and server controllers, so this
 * file must stay free of browser globals and 'use client' directives. */

/** The CSS Color Module 4 extended keywords, keyed lowercase with spaces stripped
 * (matches how deriveColorFromName normalises a typed name before lookup). */
export const CSS_NAMED_COLOURS: Record<string, string> = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  grey: '#808080',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
};

/** Trade/apparel colour names not in the CSS Color Module 4 keyword list, keyed the same way
 * (lowercase, spaces stripped) so they resolve through the same lookup as CSS_NAMED_COLOURS. */
export const EXTRA_NAMED_COLOURS: Record<string, string> = {
  sky: '#87ceeb',
  charcoal: '#36454f',
  heathergrey: '#9a9a9a',
  heathergray: '#9a9a9a',
  offwhite: '#faf9f6',
  cream: '#fffdd0',
  bottlegreen: '#00543c',
  burgundy: '#800020',
  mustard: '#ffdb58',
  rust: '#b7410e',
  blush: '#de5d83',
  taupe: '#483c32',
  stone: '#928e85',
  sand: '#c2b280',
  ecru: '#c2b280',
  oatmeal: '#ded4c7',
  graphite: '#41424c',
  denim: '#1560bd',
  camel: '#c19a6b',
  mocha: '#967969',
  emerald: '#50c878',
  petrol: '#005f6a',
  midnight: '#191970',
  natural: '#ede8d0',
  bone: '#e3dac9',
  ash: '#b2beb5',
  berry: '#8b0057',
  mint: '#98ff98',
  lilac: '#c8a2c8',
};

/** Merged lookup — extras first so a trade name never shadows a CSS keyword. */
const ALL_NAMED_COLOURS: Record<string, string> = { ...EXTRA_NAMED_COLOURS, ...CSS_NAMED_COLOURS };

/** Grey dot shown for a colour whose derived CSS value isn't recognized. */
export const FALLBACK_SWATCH = '#cbd5e1';

const HEX_PATTERN = /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i;

export function isValidCssColor(value: string): boolean {
  if (HEX_PATTERN.test(value)) return true;
  return value.toLowerCase().replace(/\s+/g, '') in ALL_NAMED_COLOURS;
}

/** "Hot Pink" -> "HotPink" (a valid CSS keyword); a literal hex token passes through verbatim. */
export function deriveColorFromName(name: string): string {
  const trimmed = name.trim();
  if (HEX_PATTERN.test(trimmed)) return trimmed;
  return trimmed.replace(/\s+/g, '');
}

/** What to actually render as `backgroundColor` — never an unrecognized/invalid CSS value. */
export function resolveSwatch(color: string): string {
  const trimmed = color.trim();
  if (HEX_PATTERN.test(trimmed)) return trimmed;
  return ALL_NAMED_COLOURS[trimmed.toLowerCase().replace(/\s+/g, '')] ?? FALLBACK_SWATCH;
}

/** "Red, Blue, Hot Pink" -> [{name:"Red",color:"Red"}, ..., {name:"Hot Pink",color:"HotPink"}] */
export function parseColoursInput(value: string): { name: string; color: string }[] {
  return value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, color: deriveColorFromName(name) }));
}

export function formatColoursInput(colours: { name: string }[]): string {
  return colours.map((c) => c.name).join(', ');
}

/** Display-only casing: "sky" -> "Sky", "dark gray" -> "Dark Gray". A literal hex token passes
 * through unchanged. Stored values are never touched by this — call it only when rendering. */
export function formatColourName(name: string): string {
  if (HEX_PATTERN.test(name.trim())) return name.trim();
  return name
    .split(/(\s+|-)/)
    .map((part) => (/^[a-z]/i.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join('');
}
