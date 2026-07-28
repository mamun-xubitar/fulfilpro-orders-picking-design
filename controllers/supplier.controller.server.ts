import prisma from '@/lib/prisma.server';
import { SupplierModel } from '@/models/supplier.model.server';
import { fetchStoreCollections } from '@/lib/shopify-collections-fetch.server';

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
    await model.delete(id);
    return { data: null, message: 'Supplier deleted' };
  }

  async listConnections(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Supplier not found', status: 404 } };
    const connections = await model.listConnections(id);
    return { data: connections, message: 'Connections retrieved' };
  }

  async addConnection(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Supplier not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    if (value.type === 'product') {
      const productId = typeof value.productId === 'string' ? value.productId : '';
      if (!productId) return { error: { message: 'productId is required', status: 400 } };
      await model.linkProduct(id, productId);
      return { data: null, message: 'Product linked' };
    }

    if (value.type === 'collection') {
      const storeId = typeof value.storeId === 'string' ? value.storeId : '';
      const collectionId = typeof value.collectionId === 'string' ? value.collectionId : '';
      const title = typeof value.title === 'string' ? value.title : '';
      const handle = typeof value.handle === 'string' ? value.handle : null;
      if (!storeId || !collectionId || !title) {
        return { error: { message: 'storeId, collectionId and title are required', status: 400 } };
      }
      await model.linkCollection({ supplierId: id, storeId, collectionId, title, handle });
      return { data: null, message: 'Collection linked' };
    }

    return { error: { message: 'Invalid connection type', status: 400 } };
  }

  async removeConnection(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Supplier not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    if (value.type === 'product') {
      const productId = typeof value.productId === 'string' ? value.productId : '';
      if (!productId) return { error: { message: 'productId is required', status: 400 } };
      await model.unlinkProduct(id, productId);
      return { data: null, message: 'Product unlinked' };
    }

    if (value.type === 'collection') {
      const storeId = typeof value.storeId === 'string' ? value.storeId : '';
      const collectionId = typeof value.collectionId === 'string' ? value.collectionId : '';
      if (!storeId || !collectionId) return { error: { message: 'storeId and collectionId are required', status: 400 } };
      await model.unlinkCollection(id, storeId, collectionId);
      return { data: null, message: 'Collection unlinked' };
    }

    return { error: { message: 'Invalid connection type', status: 400 } };
  }

  async listStoreCollections(storeId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!storeId) return { error: { message: 'storeId is required', status: 400 } };

    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { storeDomain: true, accessToken: true } });
    if (!store) return { error: { message: 'Store not found', status: 404 } };
    if (!store.accessToken) return { error: { message: 'Store is not connected', status: 400 } };

    try {
      const collections = await fetchStoreCollections({ storeDomain: store.storeDomain, accessToken: store.accessToken });
      return { data: { collections }, message: 'Collections retrieved' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to fetch collections', status: 400 } };
    }
  }
}
