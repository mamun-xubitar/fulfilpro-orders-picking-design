import { SupplierModel } from '@/models/supplier.model.server';

const model = new SupplierModel();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Session = { user?: { id?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class SupplierController {
  async list(searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const search = searchParams.get('search')?.trim() ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

    const result = await model.list({ search, page, pageSize });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    return {
      data: {
        suppliers: result.suppliers,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      },
    };
  }

  async create(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const poEmail = typeof value.poEmail === 'string' ? value.poEmail.trim() : '';
    const contactEmailRaw = typeof value.contactEmail === 'string' ? value.contactEmail.trim() : '';
    const description = typeof value.description === 'string' ? value.description.trim() : '';

    const errors: string[] = [];
    if (!name) errors.push('name: Name is required');
    if (!poEmail) errors.push('poEmail: PO email is required');
    else if (!EMAIL_RE.test(poEmail)) errors.push('poEmail: Enter a valid email address');
    if (contactEmailRaw && !EMAIL_RE.test(contactEmailRaw)) errors.push('contactEmail: Enter a valid email address');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const supplier = await model.create({
      name,
      poEmail,
      contactEmail: contactEmailRaw || null,
      description: description || null,
    });

    return { data: supplier, message: 'Supplier created' };
  }

  async update(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Supplier not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const name = typeof value.name === 'string' ? value.name.trim() : undefined;
    const poEmail = typeof value.poEmail === 'string' ? value.poEmail.trim() : undefined;
    const contactEmailRaw = typeof value.contactEmail === 'string' ? value.contactEmail.trim() : undefined;
    const description = typeof value.description === 'string' ? value.description.trim() : undefined;

    const errors: string[] = [];
    if (name !== undefined && !name) errors.push('name: Name is required');
    if (poEmail !== undefined) {
      if (!poEmail) errors.push('poEmail: PO email is required');
      else if (!EMAIL_RE.test(poEmail)) errors.push('poEmail: Enter a valid email address');
    }
    if (contactEmailRaw && !EMAIL_RE.test(contactEmailRaw)) errors.push('contactEmail: Enter a valid email address');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const supplier = await model.update(id, {
      ...(name !== undefined ? { name } : {}),
      ...(poEmail !== undefined ? { poEmail } : {}),
      ...(contactEmailRaw !== undefined ? { contactEmail: contactEmailRaw || null } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
    });

    return { data: supplier, message: 'Supplier updated' };
  }

  async delete(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Supplier not found', status: 404 } };
    // A product can have several suppliers now — only refuse when this is some product's ONLY
    // supplier (deleting would leave it with none). Sharing a product with another supplier is
    // fine; that link is simply dropped.
    const soleCount = await model.countSoleSupplierFor(id);
    if (soleCount > 0) {
      return {
        error: {
          message: `This is the only supplier for ${soleCount} product${soleCount === 1 ? '' : 's'} — add another supplier to ${soleCount === 1 ? 'it' : 'them'} first`,
          status: 409,
        },
      };
    }
    await model.delete(id);
    return { data: null, message: 'Supplier deleted' };
  }
}
