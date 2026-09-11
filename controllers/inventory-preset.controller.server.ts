import { groupKeyOf, InventoryPresetModel, presetKeyOf } from '@/models/inventory-preset.model.server';

const model = new InventoryPresetModel();

type Session = { user?: { role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

/** Capitalises only the first character, leaving the rest exactly as typed — "xl" -> "Xl" but
 * "XL" stays "XL", so a size code is never mangled by lower-casing the remainder. */
function capitaliseFirst(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export class InventoryPresetController {
  async list(session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const [colours, sizes] = await Promise.all([model.listColourGroups(), model.listSizeGroups()]);
    return { data: { colours, sizes } };
  }

  /** Idempotent — an existing group is a normal (200) outcome, not a 409, since this now fires on
   * every product-details/pricing Save regardless of whether the typed list is new. Only a truly
   * malformed request (missing kind, empty list, an internal duplicate, or the reserved "|"
   * character) is an error. */
  async ensure(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const kind = value.kind === 'colour' || value.kind === 'size' ? value.kind : null;
    if (!kind) return { error: { message: 'kind: Must be "colour" or "size"', status: 400 } };

    const rawItems = Array.isArray(value.items) ? (value.items as unknown[]) : [];
    const trimmed = rawItems.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
    if (trimmed.length === 0) return { error: { message: 'Validation failed', errors: ['items: At least one name is required'], status: 400 } };

    const barred = trimmed.find((name) => name.includes('|'));
    if (barred) {
      return { error: { message: 'Validation failed', errors: [`items: "${barred}" can't contain the "|" character`], status: 400 } };
    }

    const seenKeys = new Set<string>();
    for (const name of trimmed) {
      const key = presetKeyOf(name);
      if (seenKeys.has(key)) return { error: { message: 'Validation failed', errors: [`items: "${name}" is listed more than once`], status: 400 } };
      seenKeys.add(key);
    }

    const items = trimmed.map(capitaliseFirst);
    const key = groupKeyOf(items);

    const findByKey = kind === 'colour' ? model.findColourGroupByKey.bind(model) : model.findSizeGroupByKey.bind(model);
    const createGroup = kind === 'colour' ? model.createColourGroup.bind(model) : model.createSizeGroup.bind(model);

    const existing = await findByKey(key);
    if (existing) return { data: { group: existing, created: false }, message: 'Preset group already exists' };

    try {
      const created = await createGroup({ items, key });
      return { data: { group: created, created: true }, message: `${kind === 'colour' ? 'Colour' : 'Size'} preset group added`, status: 201 };
    } catch {
      // Unique-violation race — another request created the same group between the read above
      // and this write (realistic now that a save can trigger this concurrently from two tabs).
      // Re-read rather than surfacing the DB error, since the end state either request wanted —
      // "this group exists" — was reached either way.
      const race = await findByKey(key);
      if (race) return { data: { group: race, created: false }, message: 'Preset group already exists' };
      return { error: { message: 'Failed to save preset group', status: 500 } };
    }
  }

  async bulkDelete(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const kind = value.kind === 'colour' || value.kind === 'size' ? value.kind : null;
    const ids = Array.isArray(value.ids) ? (value.ids as unknown[]).filter((id): id is string => typeof id === 'string') : [];
    if (!kind) return { error: { message: 'kind: Must be "colour" or "size"', status: 400 } };
    if (ids.length === 0) return { error: { message: 'ids: At least one preset group id is required', status: 400 } };

    const count = kind === 'colour' ? await model.deleteColourGroups(ids) : await model.deleteSizeGroups(ids);
    return { data: { count }, message: `${count} preset group${count === 1 ? '' : 's'} removed` };
  }
}
