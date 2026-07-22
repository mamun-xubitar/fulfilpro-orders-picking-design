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

const carrierNameByCode = new Map<number, string>(
  (carriers as CarrierEntry[]).map((e) => [e.key, e._name]),
);

export function resolveCarrierCode(company: string | null | undefined): number | undefined {
  if (!company) return undefined;
  const normalized = normalize(company);
  const resolved = ALIASES[normalized] ?? normalized;
  return carrierMap.get(resolved);
}

export function getCarrierName(code: number | null | undefined): string | null {
  if (code == null) return null;
  return carrierNameByCode.get(code) ?? null;
}

const DEFAULT_LIST_LIMIT = 10;
const DEFAULT_PRIORITY_NAMES = ['Australia Post'];

export function searchCarriers(query: string, limit = 20): { code: number; name: string }[] {
  const trimmed = query.trim().toLowerCase();
  const all = carriers as CarrierEntry[];

  if (!trimmed) {
    const priority = DEFAULT_PRIORITY_NAMES
      .map((name) => all.find((e) => e._name.toLowerCase() === name.toLowerCase()))
      .filter((e): e is CarrierEntry => !!e);
    const priorityKeys = new Set(priority.map((e) => e.key));
    const rest = all
      .filter((e) => !priorityKeys.has(e.key))
      .sort((a, b) => a._name.localeCompare(b._name));
    return [...priority, ...rest].slice(0, DEFAULT_LIST_LIMIT).map((e) => ({ code: e.key, name: e._name }));
  }

  return all
    .filter((e) => e._name.toLowerCase().includes(trimmed))
    .sort((a, b) => a._name.localeCompare(b._name))
    .slice(0, limit)
    .map((e) => ({ code: e.key, name: e._name }));
}
