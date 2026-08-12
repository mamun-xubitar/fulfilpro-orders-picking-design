/**
 * Demo fixtures for the Products screen.
 *
 * This is the ONLY file that fabricates data. When the page is wired to the
 * database, replace the body of `fetchDemoProducts` with a real request — every
 * component above it already speaks the `types.ts` contract.
 */

import type { ActivityEntry, ProductImage, ProductRecord, ProductsResponse, StoreListing, VariantRow } from './types';

/** Self-contained SVG placeholder so the demo never depends on the network. */
function placeholderImage(hex: string, label: string, sub: string): string {
  const dark = ['#111827', '#1e3a8a', '#065f46', '#374151', '#dc2626'].includes(hex);
  const ink = dark ? '#ffffff' : '#111827';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
<rect width="640" height="640" fill="${hex}"/>
<circle cx="320" cy="286" r="132" fill="${ink}" opacity="0.08"/>
<path d="M188 366c0-73 59-132 132-132s132 59 132 132z" fill="${ink}" opacity="0.16"/>
<rect x="150" y="366" width="340" height="34" rx="17" fill="${ink}" opacity="0.16"/>
<text x="320" y="474" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="bold" fill="${ink}" text-anchor="middle">${label}</text>
<text x="320" y="514" font-family="Arial,Helvetica,sans-serif" font-size="24" fill="${ink}" opacity="0.7" text-anchor="middle">${sub}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type VariantSeed = {
  colour: string;
  size: string;
  sku: string;
  barcode: string;
  stockOnHand: number;
  allocated: number;
  incoming: number;
  forwardOrders: number;
  trigger: number;
};

function buildVariants(seeds: VariantSeed[], buyPrice: number, sellPrice: number): VariantRow[] {
  return seeds.map((seed, index) => ({
    id: `${seed.sku}-${index}`,
    sku: seed.sku,
    barcode: seed.barcode,
    colour: seed.colour,
    size: seed.size,
    stockOnHand: seed.stockOnHand,
    buyPrice,
    sellPrice,
    trigger: seed.trigger,
    allocated: seed.allocated,
    incoming: seed.incoming,
    forwardOrders: seed.forwardOrders,
  }));
}

function buildImages(productLabel: string, colours: { name: string; hex: string }[], extras: string[]): ProductImage[] {
  const coloured = colours.map<ProductImage>((c, i) => ({
    id: `img-colour-${i}`,
    url: placeholderImage(c.hex, productLabel, c.name),
    altText: `${productLabel} — ${c.name}`,
    colour: c.name,
  }));
  const rest = extras.map<ProductImage>((label, i) => ({
    id: `img-extra-${i}`,
    url: placeholderImage('#e5e7eb', productLabel, label),
    altText: `${productLabel} — ${label}`,
    colour: null,
  }));
  return [...coloured, ...rest];
}

// — Product 1: reproduces the reference screenshot exactly —

const FLEX_KINDY_SEEDS: VariantSeed[] = [
  { colour: 'Aqua', size: '50', sku: 'FKBH-AQ-50', barcode: '9331234567891', stockOnHand: 290, allocated: 40, incoming: 0, forwardOrders: 200, trigger: 300 },
  { colour: 'Aqua', size: '54', sku: 'FKBH-AQ-54', barcode: '9331234567892', stockOnHand: 266, allocated: 46, incoming: 0, forwardOrders: 200, trigger: 300 },
  { colour: 'Aqua', size: '58', sku: 'FKBH-AQ-58', barcode: '9331234567893', stockOnHand: 122, allocated: 20, incoming: 100, forwardOrders: 200, trigger: 250 },
  { colour: 'Aqua', size: '60', sku: 'FKBH-AQ-60', barcode: '9331234567894', stockOnHand: 383, allocated: 56, incoming: 0, forwardOrders: 100, trigger: 400 },
  { colour: 'Black', size: '50', sku: 'FKBH-BK-50', barcode: '9331234567895', stockOnHand: 322, allocated: 57, incoming: 0, forwardOrders: 200, trigger: 300 },
  { colour: 'Black', size: '54', sku: 'FKBH-BK-54', barcode: '9331234567896', stockOnHand: 221, allocated: 30, incoming: 0, forwardOrders: 200, trigger: 250 },
  { colour: 'Black', size: '58', sku: 'FKBH-BK-58', barcode: '9331234567897', stockOnHand: 171, allocated: 29, incoming: 0, forwardOrders: 200, trigger: 200 },
  { colour: 'Black', size: '60', sku: 'FKBH-BK-60', barcode: '9331234567898', stockOnHand: 142, allocated: 22, incoming: 0, forwardOrders: 100, trigger: 200 },
  { colour: 'Hot Pink', size: '54', sku: 'FKBH-HP-54', barcode: '9331234567899', stockOnHand: 52, allocated: 10, incoming: 0, forwardOrders: 100, trigger: 150 },
];

const FLEX_KINDY_STORES: StoreListing[] = [
  { id: 'st-1', name: 'Mad Hats', domain: 'madhats.com.au', status: 'ACTIVE', externalId: '6633188262024', price: 8.99, url: 'https://madhats.com.au/products/flex-kindy-bucket-hat' },
  { id: 'st-2', name: 'FunGear', domain: 'fungear.com.au', status: 'ACTIVE', externalId: '746075987080', price: 9.95, url: 'https://fungear.com.au/products/flex-kindy-bucket-hat' },
  { id: 'st-3', name: 'Kustom Teamwear', domain: 'kustomteamwear.com.au', status: 'ACTIVE', externalId: '634414178440', price: 10.5, url: 'https://kustomteamwear.com.au/products/flex-kindy-bucket-hat' },
  { id: 'st-4', name: 'Flag Factory', domain: 'flagfactory.com.au', status: 'DRAFT', externalId: '8311174604936', price: 9.5, url: null },
];

const FLEX_KINDY_ACTIVITY: ActivityEntry[] = [
  { id: 'ac-1', at: '2026-08-12T01:15:00.000Z', actor: 'Terry', message: 'Updated trigger for FKBH-AQ-58 from 200 to 250' },
  { id: 'ac-2', at: '2026-08-11T23:40:00.000Z', actor: 'System', message: 'Received 100 units against PO-00214' },
  { id: 'ac-3', at: '2026-08-11T06:02:00.000Z', actor: 'Alice Wong', message: 'Changed sell price to 8.99 AUD on Mad Hats' },
  { id: 'ac-4', at: '2026-08-10T22:18:00.000Z', actor: 'Terry', message: 'Marked product as verified' },
  { id: 'ac-5', at: '2026-08-09T04:55:00.000Z', actor: 'System', message: 'Synced 9 variants from Shopify' },
];

// — Product 2: exercises all three statuses, zero stock, and a wide colour set —

const TOUR_CAP_SEEDS: VariantSeed[] = [
  { colour: 'Navy', size: 'S', sku: 'TRC-NV-S', barcode: '9331234570011', stockOnHand: 640, allocated: 40, incoming: 0, forwardOrders: 0, trigger: 200 },
  { colour: 'Navy', size: 'M', sku: 'TRC-NV-M', barcode: '9331234570012', stockOnHand: 512, allocated: 92, incoming: 0, forwardOrders: 0, trigger: 250 },
  { colour: 'Navy', size: 'L', sku: 'TRC-NV-L', barcode: '9331234570013', stockOnHand: 268, allocated: 48, incoming: 0, forwardOrders: 0, trigger: 200 },
  { colour: 'Red', size: 'S', sku: 'TRC-RD-S', barcode: '9331234570021', stockOnHand: 226, allocated: 16, incoming: 0, forwardOrders: 0, trigger: 200 },
  { colour: 'Red', size: 'M', sku: 'TRC-RD-M', barcode: '9331234570022', stockOnHand: 130, allocated: 10, incoming: 150, forwardOrders: 60, trigger: 220 },
  { colour: 'Red', size: 'L', sku: 'TRC-RD-L', barcode: '9331234570023', stockOnHand: 0, allocated: 0, incoming: 200, forwardOrders: 120, trigger: 180 },
  { colour: 'Lime', size: 'M', sku: 'TRC-LM-M', barcode: '9331234570031', stockOnHand: 348, allocated: 24, incoming: 0, forwardOrders: 0, trigger: 300 },
  { colour: 'Lime', size: 'L', sku: 'TRC-LM-L', barcode: '9331234570032', stockOnHand: 0, allocated: 0, incoming: 0, forwardOrders: 0, trigger: 150 },
  { colour: 'Yellow', size: 'M', sku: 'TRC-YL-M', barcode: '9331234570041', stockOnHand: 96, allocated: 18, incoming: 0, forwardOrders: 80, trigger: 160 },
  { colour: 'White', size: 'M', sku: 'TRC-WH-M', barcode: '9331234570051', stockOnHand: 704, allocated: 64, incoming: 0, forwardOrders: 0, trigger: 250 },
  { colour: 'Charcoal', size: 'M', sku: 'TRC-CH-M', barcode: '9331234570061', stockOnHand: 214, allocated: 34, incoming: 0, forwardOrders: 0, trigger: 180 },
  { colour: 'Royal', size: 'M', sku: 'TRC-RY-M', barcode: '9331234570071', stockOnHand: 0, allocated: 0, incoming: 0, forwardOrders: 40, trigger: 120 },
];

// — Product 3: single colourway, no store listings —

const CANVAS_TOTE_SEEDS: VariantSeed[] = [
  { colour: 'Sand', size: 'One Size', sku: 'CVT-SD-OS', barcode: '9331234580011', stockOnHand: 418, allocated: 62, incoming: 0, forwardOrders: 0, trigger: 250 },
];

// — Product 4: no images, no activity, unverified —

const SAMPLE_VISOR_SEEDS: VariantSeed[] = [
  { colour: 'Bottle', size: 'S/M', sku: 'SPV-BT-SM', barcode: '9331234590011', stockOnHand: 44, allocated: 4, incoming: 0, forwardOrders: 60, trigger: 100 },
  { colour: 'Bottle', size: 'L/XL', sku: 'SPV-BT-LX', barcode: '9331234590012', stockOnHand: 38, allocated: 6, incoming: 0, forwardOrders: 40, trigger: 100 },
  { colour: 'Grey', size: 'S/M', sku: 'SPV-GY-SM', barcode: '9331234590021', stockOnHand: 51, allocated: 3, incoming: 60, forwardOrders: 0, trigger: 80 },
];

const DEMO_PRODUCTS: ProductRecord[] = [
  {
    id: 'prd-canvas-tote',
    itemNo: '07731',
    brand: 'HARBOUR CO',
    name: 'HARBOUR CANVAS TOTE',
    category: 'Luggage & Bags > Totes',
    sku: 'HARBOUR CANVAS',
    description: 'A heavyweight 16oz cotton canvas tote with reinforced webbing handles and a boxed base. Built for repeat use and easy to decorate.',
    deliveryRemarks: '400 SAND (SINGLE COLOURWAY, 1 CARTON OF 400)',
    status: 'ACTIVE',
    verified: true,
    createdAt: '2026-05-02T09:00:00.000Z',
    images: buildImages('HARBOUR TOTE', [{ name: 'Sand', hex: '#d6c7a1' }], ['Packshot', 'Detail']),
    variants: buildVariants(CANVAS_TOTE_SEEDS, 4.2, 14.95),
    pricing: { currencyCode: 'USD', exchangeRate: 1.55, buyingPrice: 2.71, freight: 0.4, misc: 0.05, marginPercent: 150, tax: 1.36 },
    stores: [],
    stocktake: { lastAt: '2026-03-18T00:00:00.000Z', nextAt: '2026-09-18T00:00:00.000Z' },
    adjustments: { lastAt: '2026-04-02T00:00:00.000Z', thisMonth: 2 },
    activity: [{ id: 'ac-t1', at: '2026-08-05T10:00:00.000Z', actor: 'Alice Wong', message: 'Adjusted stock on hand by +40' }],
  },
  {
    id: 'prd-sample-visor',
    itemNo: '09102',
    brand: 'SUNPEAK',
    name: 'SUNPEAK SPORT VISOR',
    category: 'Apparel & Accessories > Hats',
    sku: 'SUNPEAK VISOR',
    description: 'Lightweight performance visor with a moisture-wicking sweatband and adjustable rear closure. Sample stock only — not yet released to stores.',
    deliveryRemarks: 'SAMPLE RUN ONLY — AWAITING FINAL COLOUR APPROVAL',
    status: 'DRAFT',
    verified: false,
    createdAt: '2026-06-21T09:00:00.000Z',
    images: [],
    variants: buildVariants(SAMPLE_VISOR_SEEDS, 2.48, 6.5),
    pricing: { currencyCode: 'USD', exchangeRate: 1.55, buyingPrice: 1.6, freight: 0.3, misc: 0.04, marginPercent: 150, tax: 0.59 },
    stores: [{ id: 'st-9', name: 'Mad Hats', domain: 'madhats.com.au', status: 'DRAFT', externalId: '6633188999111', price: 6.5, url: null }],
    stocktake: { lastAt: null, nextAt: null },
    adjustments: { lastAt: null, thisMonth: 0 },
    activity: [],
  },
  {
    id: 'prd-tour-cap',
    itemNo: '08265',
    brand: 'TOUR PRO',
    name: 'TOUR PRO STRUCTURED CAP',
    category: 'Apparel & Accessories > Hats > Caps',
    sku: 'TOUR PRO',
    description: 'Six-panel structured cap in brushed heavy cotton twill, with a pre-curved peak and a snapback closure. The core team-wear line.',
    deliveryRemarks: '600 NAVY, 400 RED, 400 LIME, 200 YELLOW, 700 WHITE, 200 CHARCOAL (TOTAL 2500 CAPS)',
    status: 'ACTIVE',
    verified: true,
    createdAt: '2026-07-14T09:00:00.000Z',
    images: buildImages(
      'TOUR PRO CAP',
      [
        { name: 'Navy', hex: '#1e3a8a' },
        { name: 'Red', hex: '#dc2626' },
        { name: 'Lime', hex: '#84cc16' },
        { name: 'Yellow', hex: '#facc15' },
        { name: 'White', hex: '#f3f4f6' },
        { name: 'Charcoal', hex: '#374151' },
        { name: 'Royal', hex: '#2563eb' },
      ],
      ['Packshot', 'Size guide', 'Lifestyle']
    ),
    variants: buildVariants(TOUR_CAP_SEEDS, 5.27, 16.95),
    pricing: { currencyCode: 'USD', exchangeRate: 1.55, buyingPrice: 3.4, freight: 0.55, misc: 0.06, marginPercent: 150, tax: 1.54 },
    stores: [
      { id: 'st-5', name: 'Kustom Teamwear', domain: 'kustomteamwear.com.au', status: 'ACTIVE', externalId: '634414200881', price: 16.95, url: 'https://kustomteamwear.com.au/products/tour-pro-cap' },
      { id: 'st-6', name: 'FunGear', domain: 'fungear.com.au', status: 'ACTIVE', externalId: '746075991002', price: 17.5, url: 'https://fungear.com.au/products/tour-pro-cap' },
    ],
    stocktake: { lastAt: '2026-06-30T00:00:00.000Z', nextAt: '2026-12-30T00:00:00.000Z' },
    adjustments: { lastAt: '2026-07-29T00:00:00.000Z', thisMonth: 5 },
    activity: [
      { id: 'ac-c1', at: '2026-08-11T12:30:00.000Z', actor: 'Terry', message: 'Raised PO-00231 for 350 units of TRC-RD-L' },
      { id: 'ac-c2', at: '2026-08-08T08:10:00.000Z', actor: 'System', message: 'Royal colourway went out of stock' },
    ],
  },
  {
    id: 'prd-flex-kindy',
    itemNo: '09418',
    brand: 'FLEX KINDY',
    name: 'FLEX KINDY BUCKET HAT',
    category: 'Apparel & Accessories > Hats > Bucket Caps',
    sku: 'FLEX KINDY',
    description:
      "The Flex Kindy bucket hat is the perfect accessory for your little one's outdoor adventures. Made with soft and breathable material for all-day comfort.",
    deliveryRemarks: '200 LIME, 200 PINK, 200 AQUA, 200 RED AND 200 YELLOW (TOTAL 1000 HATS)',
    status: 'ACTIVE',
    verified: true,
    createdAt: '2026-08-09T09:00:00.000Z',
    images: buildImages(
      'FLEX KINDY HAT',
      [
        { name: 'Aqua', hex: '#22b8e6' },
        { name: 'Black', hex: '#111827' },
        { name: 'Hot Pink', hex: '#ec4899' },
      ],
      ['Packshot', 'Care label', 'Lifestyle', 'Size guide']
    ),
    variants: buildVariants(FLEX_KINDY_SEEDS, 3.1, 8.99),
    pricing: { currencyCode: 'USD', exchangeRate: 1.55, buyingPrice: 2.0, freight: 0.55, misc: 0.05, marginPercent: 100, tax: 0.93 },
    stores: FLEX_KINDY_STORES,
    stocktake: { lastAt: '2026-05-12T00:00:00.000Z', nextAt: '2026-07-20T00:00:00.000Z' },
    adjustments: { lastAt: '2026-05-18T00:00:00.000Z', thisMonth: 0 },
    activity: FLEX_KINDY_ACTIVITY,
  },
];

/**
 * TODO(integration): replace the body with a real fetch, e.g.
 *   request({ url: '/api/inventory/products', method: 'GET', data: { ... } })
 * The resolved shape must stay `ProductsResponse`.
 */
export async function fetchDemoProducts(): Promise<ProductsResponse> {
  return {
    products: [...DEMO_PRODUCTS].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    globals: {
      exchangeRate: 1.55,
      marginPercent: 150,
      baseCurrency: 'AUD',
      currencies: [
        { code: 'AUD', rate: 1 },
        { code: 'USD', rate: 1.55 },
        { code: 'NZD', rate: 0.92 },
        { code: 'CNY', rate: 0.21 },
      ],
    },
  };
}
