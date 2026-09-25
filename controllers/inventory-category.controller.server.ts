import { InventoryCategoryModel } from '@/models/inventory-category.model.server';

const model = new InventoryCategoryModel();

type Session = { user?: { role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class InventoryCategoryController {
  async list(session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const categories = await model.list();
    return { data: { categories } };
  }

  /** Idempotent against an existing case-insensitive match — returns that row instead of erroring,
   * so the "Add" button in the picker can always call this and then select whatever comes back. */
  async create(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    if (!name) return { error: { message: 'Validation failed', errors: ['name: Category name is required'], status: 400 } };

    const existing = await model.findByName(name);
    if (existing) return { data: { category: existing }, message: 'Category already exists' };

    const category = await model.create(name);
    return { data: { category }, message: 'Category added' };
  }
}
