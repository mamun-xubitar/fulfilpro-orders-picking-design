import { LocationModel } from '@/models/location.model.server';
import { upperTrim } from '@/lib/utils/common';

const model = new LocationModel();

type Session = { user?: { id?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

const forbidden = { error: { message: 'Forbidden', status: 403 } };

export class LocationController {
  async list(searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return forbidden;

    // Every location, name only — what the variant location pickers need.
    if (searchParams.get('options') === '1') return { data: { locations: await model.listOptions() } };

    const search = searchParams.get('search')?.trim() ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));
    const result = await model.list({ search, page, pageSize });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    return {
      data: {
        locations: result.locations,
        pagination: { page, pageSize, total: result.total, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
      },
    };
  }

  async create(body: unknown, session: Session) {
    if (!isAdmin(session)) return forbidden;
    const value = (body ?? {}) as Record<string, unknown>;
    const name = typeof value.name === 'string' ? upperTrim(value.name) : '';
    const description = typeof value.description === 'string' ? value.description.trim() : '';
    if (!name) return { error: { message: 'Validation failed', errors: ['name: Name is required'], status: 400 } };
    if (await model.findByName(name)) return { error: { message: 'Validation failed', errors: ['name: A location with this name already exists'], status: 409 } };
    return { data: await model.create({ name, description: description || null }), message: 'Location created' };
  }

  async update(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return forbidden;
    if (!(await model.findById(id))) return { error: { message: 'Location not found', status: 404 } };
    const value = (body ?? {}) as Record<string, unknown>;
    const name = typeof value.name === 'string' ? upperTrim(value.name) : undefined;
    const description = typeof value.description === 'string' ? value.description.trim() : undefined;
    if (name !== undefined) {
      if (!name) return { error: { message: 'Validation failed', errors: ['name: Name is required'], status: 400 } };
      const clash = await model.findByName(name);
      if (clash && clash.id !== id) return { error: { message: 'Validation failed', errors: ['name: A location with this name already exists'], status: 409 } };
    }
    const row = await model.update(id, {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
    });
    return { data: row, message: 'Location updated' };
  }

  async delete(id: string, session: Session) {
    if (!isAdmin(session)) return forbidden;
    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Location not found', status: 404 } };
    if (existing.variantCount > 0) {
      return {
        error: {
          message: `${existing.variantCount} variant${existing.variantCount === 1 ? ' is' : 's are'} kept here — remove this location from ${existing.variantCount === 1 ? 'it' : 'them'} first`,
          status: 409,
        },
      };
    }
    await model.delete(id);
    return { data: null, message: 'Location deleted' };
  }
}
