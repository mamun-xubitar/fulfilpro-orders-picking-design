import { Prisma } from '@prisma/client';
import { UserModel, type CreateUserData, type UpdateUserData } from '@/models/user.model.server';
import { VALID_USER_ROLES, isRestrictedSessionRole } from '@/lib/roles';
import prisma from '@/lib/prisma.server';

const model = new UserModel();

const ROLES = new Set<string>(VALID_USER_ROLES);

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

  async delete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      return { error: { message: 'You cannot delete your own account', status: 400 } };
    }

    const user = await model.findById(id);
    if (!user) {
      return { error: { message: 'User not found', status: 404 } };
    }

    await model.delete(id);
    return { data: null, message: 'User deleted successfully' };
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

  async getRestrictions(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        staffAccessDays: true,
        staffAccessStart: true,
        staffAccessEnd: true,
        sessionTimeoutMinutes: true,
        inactivityTimeoutMinutes: true,
      },
    });

    if (!user) {
      return { error: { message: 'User not found', status: 404 } };
    }

    if (!isRestrictedSessionRole(user.role)) {
      return { error: { message: 'Admin users do not have restrictions', status: 400 } };
    }

    return {
      data: {
        staffAccessDays: normalizeDays(user.staffAccessDays),
        staffAccessStart: user.staffAccessStart,
        staffAccessEnd: user.staffAccessEnd,
        sessionTimeoutMinutes: user.sessionTimeoutMinutes,
        inactivityTimeoutMinutes: user.inactivityTimeoutMinutes,
      },
    };
  }

  async updateRestrictions(id: string, body: unknown) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!user) {
      return { error: { message: 'User not found', status: 404 } };
    }

    if (!isRestrictedSessionRole(user.role)) {
      return { error: { message: 'Admin users do not have restrictions', status: 400 } };
    }

    const data = body as Record<string, unknown>;
    const errors = validateRestrictions(data);

    if (errors.length) {
      return { error: { message: 'Validation failed', errors, status: 400 } };
    }

    const updateData: Record<string, unknown> = {};
    if ('staffAccessDays' in data) {
      updateData.staffAccessDays = Array.isArray(data.staffAccessDays) ? data.staffAccessDays : [];
    }
    if ('staffAccessStart' in data) {
      updateData.staffAccessStart = normalizeString(data.staffAccessStart);
    }
    if ('staffAccessEnd' in data) {
      updateData.staffAccessEnd = normalizeString(data.staffAccessEnd);
    }
    if ('sessionTimeoutMinutes' in data) {
      updateData.sessionTimeoutMinutes = Number(data.sessionTimeoutMinutes) || 30;
    }
    if ('inactivityTimeoutMinutes' in data) {
      const val = data.inactivityTimeoutMinutes;
      updateData.inactivityTimeoutMinutes = val === null ? null : Number(val) || null;
    }

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      return {
        data: {
          staffAccessDays: normalizeDays(updated.staffAccessDays),
          staffAccessStart: updated.staffAccessStart,
          staffAccessEnd: updated.staffAccessEnd,
          sessionTimeoutMinutes: updated.sessionTimeoutMinutes,
          inactivityTimeoutMinutes: updated.inactivityTimeoutMinutes,
        },
        message: 'Restrictions updated successfully',
      };
    } catch (error) {
      throw error;
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

function validateRestrictions(data: Record<string, unknown>) {
  const errors: string[] = [];
  const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const SESSION_TIMEOUT_OPTIONS = [15, 30, 60, 120, 240, 480, 720, 1440, 2880, 10080];

  if ('staffAccessDays' in data) {
    if (!Array.isArray(data.staffAccessDays)) {
      errors.push('staffAccessDays: Must be an array');
    } else if (!data.staffAccessDays.every((d) => ALL_DAYS.includes(d))) {
      errors.push('staffAccessDays: Invalid day values');
    }
  }

  if ('staffAccessStart' in data) {
    const start = normalizeString(data.staffAccessStart);
    if (!start || !/^\d{2}:\d{2}$/.test(start)) {
      errors.push('staffAccessStart: Must be in HH:MM format');
    }
  }

  if ('staffAccessEnd' in data) {
    const end = normalizeString(data.staffAccessEnd);
    if (!end || !/^\d{2}:\d{2}$/.test(end)) {
      errors.push('staffAccessEnd: Must be in HH:MM format');
    }
  }


  if ('sessionTimeoutMinutes' in data) {
    const val = Number(data.sessionTimeoutMinutes);
    if (!SESSION_TIMEOUT_OPTIONS.includes(val)) {
      errors.push('sessionTimeoutMinutes: Invalid session timeout value');
    }
  }

  if ('inactivityTimeoutMinutes' in data) {
    const val = data.inactivityTimeoutMinutes;
    if (val !== null && (typeof val !== 'number' || val < 1)) {
      errors.push('inactivityTimeoutMinutes: Must be null or an integer >= 1');
    }
  }

  return errors;
}

function normalizeDays(value: unknown) {
  if (!Array.isArray(value)) return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return value.filter((day): day is string => typeof day === 'string');
}
