import 'dotenv/config';
import moment from 'moment-timezone';
import prisma from '@/lib/prisma.server';
import { acquireNextJob, runJob, markJobFailed } from '@/lib/background-jobs.server';
import { runPendingShipmentCheck, runPickupReminderCheck } from '@/lib/tracking-checks.server';
import { runTaskReminderCheck } from '@/lib/task-reminders.server';

const POLL_INTERVAL_MS = Number(process.env.BACKGROUND_WORKER_POLL_MS ?? 10000);
const RUN_ONCE = process.env.BACKGROUND_WORKER_ONCE === '1';
const DEFAULT_TZ = 'Australia/Sydney';

let currentJobId: string | null = null;
let shuttingDown = false;
const lastFired = new Map<string, string>();

async function drainJobs() {
  while (!shuttingDown) {
    const job = await acquireNextJob();
    if (!job) break;

    currentJobId = job.id;
    console.log(`Running background job ${job.id} (${job.type})`);
    try {
      await runJob(job.id);
      console.log(`Background job ${job.id} completed`);
    } catch (error) {
      console.error(`Background job ${job.id} failed`, error);
      await markJobFailed(job.id, error instanceof Error ? error.message : String(error));
    }
    currentJobId = null;
  }
}

async function runTimedChecks() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { timezone: true },
  });

  const timezone = settings?.timezone ?? DEFAULT_TZ;
  const now = new Date();
  const minuteKey = moment(now).tz(timezone).format('YYYY-MM-DD HH:mm');

  if (lastFired.get('pending_alert') !== minuteKey) {
    lastFired.set('pending_alert', minuteKey);
    try {
      await runPendingShipmentCheck(now);
    } catch (error) {
      console.error('Pending shipment check failed', error);
    }
  }

  if (lastFired.get('pickup_reminder') !== minuteKey) {
    lastFired.set('pickup_reminder', minuteKey);
    try {
      await runPickupReminderCheck(now);
    } catch (error) {
      console.error('Pickup reminder check failed', error);
    }
  }

  if (lastFired.get('task_reminder') !== minuteKey) {
    lastFired.set('task_reminder', minuteKey);
    try {
      await runTaskReminderCheck(now);
    } catch (error) {
      console.error('Task reminder check failed', error);
    }
  }
}

async function tick() {
  await drainJobs();
  await runTimedChecks();
}

async function main() {
  console.log('Background worker started');

  while (!shuttingDown) {
    try {
      await tick();
    } catch (error) {
      console.error('Background worker tick failed', error);
    }

    if (RUN_ONCE) break;
    await sleep(POLL_INTERVAL_MS);
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    if (currentJobId) {
      await markJobFailed(currentJobId, `Worker stopped before completing job (${signal})`);
      console.error(`Marked background job ${currentJobId} as failed after ${signal}`);
      currentJobId = null;
    }
  } catch (error) {
    console.error('Failed to mark running background job as failed', error);
  } finally {
    await prisma.$disconnect();
    process.exit(signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('uncaughtException', (error) => { console.error(error); void shutdown('uncaughtException'); });
process.on('unhandledRejection', (error) => { console.error(error); void shutdown('unhandledRejection'); });

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
