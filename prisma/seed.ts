import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'admin@example.com',
      password: 'password',
      role: 'admin',
      active: true,
      isTempPassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: {
      name: 'Alice Wong',
      email: 'staff@example.com',
      password: 'password',
      role: 'staff',
      active: true,
      isTempPassword: true,
    },
  });

  await prisma.appSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      timezone: 'Australia/Sydney',
      staffAccessDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      staffAccessStart: '08:00',
      staffAccessEnd: '16:00',
      sessionTimeoutMinutes: 30,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
