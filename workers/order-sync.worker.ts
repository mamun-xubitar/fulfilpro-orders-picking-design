import 'dotenv/config';
import {
  acquireNextOrderSyncJob,
  markOrderSyncJobFailed,
  runOrderSyncJob,
} from '@/lib/order-sync-jobs.server';
import prisma from '@/lib/prisma.server';

const POLL_INTERVAL_MS = Number(process.env.ORDER_SYNC_WORKER_POLL_MS ?? 5000);
const RUN_ONCE = process.env.ORDER_SYNC_WORKER_ONCE === '1';

let currentJobId: string | null = null;
let shuttingDown = false;

async function main() {
  console.log('Order sync worker started');

  while (!shuttingDown) {
    const job = await acquireNextOrderSyncJob();

    if (!job) {
      if (RUN_ONCE) break;
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    currentJobId = job.id;
    console.log(`Running order sync job ${job.id}`);
    const result = await runOrderSyncJob(job.id);
    console.log(`Order sync job ${result.id} finished with status ${result.status}`);
    currentJobId = null;

    if (RUN_ONCE) break;
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    if (currentJobId) {
      await markOrderSyncJobFailed(currentJobId, `Worker stopped before completing sync (${signal})`);
      console.error(`Marked order sync job ${currentJobId} as failed after ${signal}`);
      currentJobId = null;
    }
  } catch (error) {
    console.error('Failed to mark running order sync job as failed', error);
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
