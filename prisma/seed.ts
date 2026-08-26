import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { Pool } from 'pg';
import { saltAndHashPassword } from '../lib/password';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = saltAndHashPassword('password');
  const staffPassword = saltAndHashPassword('password');

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'admin@example.com',
      password: adminPassword,
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
      password: staffPassword,
      role: 'staff',
      active: true,
      isTempPassword: true,
    },
  });

  if ((await prisma.supplier.count()) === 0) {
    await prisma.supplier.createMany({
      data: [
        {
          name: 'Northwind Apparel',
          poEmail: 'orders@northwindapparel.example',
          contactEmail: 'sales@northwindapparel.example',
          description: 'Headwear and soft-goods supplier',
        },
        {
          name: 'Pacific Sportswear',
          poEmail: 'orders@pacificsportswear.example',
          contactEmail: 'accounts@pacificsportswear.example',
          description: 'Teamwear and technical apparel',
        },
      ],
    });
  }

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
      googleEmail: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
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
