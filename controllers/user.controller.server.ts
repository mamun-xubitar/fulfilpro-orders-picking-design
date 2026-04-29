import { Prisma } from '@prisma/client';
import { UserModel, type CreateUserData, type UpdateUserData } from '@/models/user.model.server';

const model = new UserModel();

const ROLES = new Set(['admin', 'staff']);

export class UserController {
  async list() {
    const users = await model.findMany();
    return { data: users };
  }

  async create(body: unknown) {
    const data = body as Record<string, unknown>;
    const errors = validateUserData(data, true);

    if (errors.length) {
      return { error: { message: 'Validation failed', errors, status: 400 } };
    }

    const createData: CreateUserData = {
      name: normalizeString(data.name),
      email: normalizeString(data.email).toLowerCase(),
      role: normalizeString(data.role),
      password: normalizeString(data.password),
      isTempPassword: Boolean(data.isTempPassword),
    };

    try {
      const user = await model.create(createData);
      return { data: user, message: 'User created successfully' };
    } catch (error) {
      return handleWriteError(error);
    }
  }

  async update(id: string, body: unknown) {
    const user = await model.findById(id);
    if (!user) {
      return { error: { message: 'User not found', status: 404 } };
    }

    const data = body as Record<string, unknown>;
    const errors = validateUserData(data, false);

    if (errors.length) {
      return { error: { message: 'Validation failed', errors, status: 400 } };
    }

    const updateData: UpdateUserData = {};
    if ('name' in data) updateData.name = normalizeString(data.name);
    if ('email' in data) updateData.email = normalizeString(data.email).toLowerCase();
    if ('role' in data) updateData.role = normalizeString(data.role);
    if ('active' in data) updateData.active = Boolean(data.active);
    if ('password' in data && normalizeString(data.password)) {
      updateData.password = normalizeString(data.password);
      updateData.isTempPassword = Boolean(data.isTempPassword);
    }

    try {
      const updated = await model.update(id, updateData);
      return { data: updated, message: 'User updated successfully' };
    } catch (error) {
      return handleWriteError(error);
    }
  }
}

function validateUserData(data: Record<string, unknown>, creating: boolean) {
  const errors: string[] = [];

  if (creating || 'name' in data) {
    if (!normalizeString(data.name)) errors.push('name: Full name is required');
  }

  if (creating || 'email' in data) {
    const email = normalizeString(data.email);
    if (!email) {
      errors.push('email: Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('email: Enter a valid email address');
    }
  }

  if (creating || 'role' in data) {
    const role = normalizeString(data.role);
    if (!ROLES.has(role)) errors.push('role: Select a valid role');
  }

  if (creating || 'password' in data) {
    const password = normalizeString(data.password);
    if (creating && !password) {
      errors.push('password: Password is required');
    } else if (password && password.length < 8) {
      errors.push('password: Password must be at least 8 characters');
    }
  }

  if ('active' in data && typeof data.active !== 'boolean') {
    errors.push('active: Active must be true or false');
  }

  return errors;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function handleWriteError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'field';
    return { error: { message: `A user with that ${target} already exists`, status: 409 } };
  }

  throw error;
}
