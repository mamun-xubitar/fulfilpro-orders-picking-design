import { InventoryOptionLibraryModel } from '@/models/inventory-option-library.model.server';
import { upperTrim } from '@/lib/utils/common';

const model = new InventoryOptionLibraryModel();

type Session = { user?: { role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

/** Normalises + dedupes (case-insensitive) a batch of typed names — shared by add/list flows. */
function cleanNames(raw: unknown): string[] {
  const rawItems = Array.isArray(raw) ? (raw as unknown[]) : [];
  const trimmed = rawItems.filter((v): v is string => typeof v === 'string').map((v) => upperTrim(v)).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of trimmed) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export class InventoryOptionLibraryController {
  async list(session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const [colours, sizes] = await Promise.all([model.listColours(), model.listSizes()]);
    return { data: { colours, sizes } };
  }

  /** Adds every name in the column to the matching global library — idempotent against names
   * already present (case-insensitive), so it's safe to call on every Save regardless of whether
   * anything is actually new. */
  async add(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const kind = value.kind === 'colour' || value.kind === 'size' ? value.kind : null;
    if (!kind) return { error: { message: 'kind: Must be "colour" or "size"', status: 400 } };

    const names = cleanNames(value.names);
    if (names.length === 0) return { error: { message: 'Validation failed', errors: ['names: At least one name is required'], status: 400 } };

    const existing = kind === 'colour' ? await model.listColours() : await model.listSizes();
    const existingKeys = new Set(existing.map((e) => e.name.toLowerCase()));
    const toAdd = names.filter((name) => !existingKeys.has(name.toLowerCase()));

    if (toAdd.length > 0) {
      if (kind === 'colour') await model.addColours(toAdd);
      else await model.addSizes(toAdd);
    }

    const data = kind === 'colour' ? await model.listColours() : await model.listSizes();
    return { data: { [kind === 'colour' ? 'colours' : 'sizes']: data }, message: `${kind === 'colour' ? 'Colours' : 'Sizes'} saved to library` };
  }

  async remove(kind: string, id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (kind !== 'colour' && kind !== 'size') return { error: { message: 'kind: Must be "colour" or "size"', status: 400 } };

    const removed = kind === 'colour' ? await model.deleteColour(id) : await model.deleteSize(id);
    if (!removed) return { error: { message: 'Not found', status: 404 } };
    return { data: null, message: `${kind === 'colour' ? 'Colour' : 'Size'} removed from library` };
  }
}
