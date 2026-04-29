import prisma from '@/lib/prisma.server';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isTempPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserData = {
  name: string;
  email: string;
  role: string;
  password: string;
  isTempPassword: boolean;
};

export type UpdateUserData = Partial<{
  name: string;
  email: string;
  role: string;
  password: string;
  active: boolean;
  isTempPassword: boolean;
}>;

export class UserModel {
  async findMany(): Promise<UserRow[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toUserRow);
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: CreateUserData): Promise<UserRow> {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        password: data.password,
        active: true,
        isTempPassword: data.isTempPassword,
      },
    });

    return toUserRow(user);
  }

  async update(id: string, data: UpdateUserData): Promise<UserRow> {
    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return toUserRow(user);
  }
}

function toUserRow(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isTempPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    isTempPassword: user.isTempPassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
