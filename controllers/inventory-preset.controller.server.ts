import { InventoryPresetModel, presetKeyOf } from '@/models/inventory-preset.model.server';

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
    const [colours, sizes] = await Promise.all([model.listColours(), model.listSizes()]);
    return { data: { colours, sizes } };
  }

  async create(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const kind = value.kind === 'colour' || value.kind === 'size' ? value.kind : null;
    const rawName = typeof value.name === 'string' ? value.name.trim() : '';
    if (!kind) return { error: { message: 'kind: Must be "colour" or "size"', status: 400 } };
    if (!rawName) return { error: { message: 'name: A name is required', status: 400 } };

    const name = capitaliseFirst(rawName);
    const key = presetKeyOf(name);

    if (kind === 'colour') {
      const existing = await model.findColourByKey(key);
      if (existing) return { error: { message: 'Validation failed', errors: [`name: "${existing.name}" already exists`], status: 409 } };

      const created = await model.createColour({ name, key });
      return { data: { colour: created }, message: 'Colour preset added' };
    }

    const existing = await model.findSizeByKey(key);
    if (existing) return { error: { message: 'Validation failed', errors: [`name: "${existing.name}" already exists`], status: 409 } };

    const created = await model.createSize({ name, key });
    return { data: { size: created }, message: 'Size preset added' };
  }

  async bulkDelete(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const kind = value.kind === 'colour' || value.kind === 'size' ? value.kind : null;
    const ids = Array.isArray(value.ids) ? (value.ids as unknown[]).filter((id): id is string => typeof id === 'string') : [];
    if (!kind) return { error: { message: 'kind: Must be "colour" or "size"', status: 400 } };
    if (ids.length === 0) return { error: { message: 'ids: At least one preset id is required', status: 400 } };

    const count = kind === 'colour' ? await model.deleteColours(ids) : await model.deleteSizes(ids);
    return { data: { count }, message: `${count} preset${count === 1 ? '' : 's'} removed` };
  }
}
