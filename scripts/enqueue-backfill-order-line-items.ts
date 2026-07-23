import 'dotenv/config';
import { enqueueJob } from '@/lib/background-jobs.server';
import prisma from '@/lib/prisma.server';

async function main() {
  const job = await enqueueJob('backfill_order_line_items');
  console.log(`Enqueued backfill_order_line_items job ${job.id}. Run "npm run worker:background" to process it.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
