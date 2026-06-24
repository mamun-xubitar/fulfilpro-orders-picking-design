import carriers from './data/seventrack-carriers.json';

// Shopify tracking_company variants that won't normalize to the official _name
const ALIASES: Record<string, string> = {
  auspost: 'australiapost',
  'australia post express': 'australiapost',
  royalmail: 'royalmail',
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

type CarrierEntry = { key: number; _name: string };

const carrierMap = new Map<string, number>(
  (carriers as CarrierEntry[]).map((e) => [normalize(e._name), e.key]),
);

export function resolveCarrierCode(company: string | null | undefined): number | undefined {
  if (!company) return undefined;
  const normalized = normalize(company);
  const resolved = ALIASES[normalized] ?? normalized;
  return carrierMap.get(resolved);
}
