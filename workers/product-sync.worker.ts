import 'dotenv/config';
import {
  acquireNextProductSyncJob,
  markProductSyncJobFailed,
  runProductSyncJob,
} from '@/lib/product-sync-jobs.server';
import prisma from '@/lib/prisma.server';

const POLL_INTERVAL_MS = Number(process.env.PRODUCT_SYNC_WORKER_POLL_MS ?? 5000);
const RUN_ONCE = process.env.PRODUCT_SYNC_WORKER_ONCE === '1';

let currentJobId: string | null = null;
let shuttingDown = false;

async function main() {
  console.log('Product sync worker started');

  while (!shuttingDown) {
    const job = await acquireNextProductSyncJob();

    if (!job) {
      if (RUN_ONCE) break;
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    currentJobId = job.id;
    console.log(`Running product sync job ${job.id}`);
    const result = await runProductSyncJob(job.id);
    console.log(`Product sync job ${result.id} finished with status ${result.status}`);
    currentJobId = null;

    if (RUN_ONCE) break;
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    if (currentJobId) {
      await markProductSyncJobFailed(currentJobId, `Worker stopped before completing sync (${signal})`);
      console.error(`Marked product sync job ${currentJobId} as failed after ${signal}`);
      currentJobId = null;
    }
  } catch (error) {
    console.error('Failed to mark running product sync job as failed', error);
  } finally {
    await prisma.$disconnect();
    process.exit(signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('uncaughtException', (error) => {
  console.error(error);
  void shutdown('uncaughtException');
});

process.on('unhandledRejection', (error) => {
  console.error(error);
  void shutdown('unhandledRejection');
});

main()
  .catch((error) => {
    console.error(error);
    return shutdown('worker error');
  })
  .finally(async () => {
    if (!shuttingDown) {
      await prisma.$disconnect();
    }
  });
