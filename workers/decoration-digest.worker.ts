import 'dotenv/config';
import moment from 'moment-timezone';
import prisma from '@/lib/prisma.server';
import { runDecorationDigest } from '@/lib/decoration-digest.server';
import { DECORATOR_ROLES } from '@/lib/roles';

const POLL_INTERVAL_MS = Number(process.env.DECORATION_DIGEST_WORKER_POLL_MS ?? 30000);
const RUN_ONCE = process.env.DECORATION_DIGEST_WORKER_ONCE === '1';
const DEFAULT_TZ = 'Australia/Sydney';

let shuttingDown = false;
// Tracks the last minute (YYYY-MM-DD HH:mm) each schedule key fired, so a schedule
// fires at most once per minute even though we poll several times within it.
const lastFired = new Map<string, string>();

async function tick() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: { timezone: true, decorationDigestMode: true, decorationDigestTime: true },
  });

  const timezone = settings?.timezone ?? DEFAULT_TZ;
  const mode = settings?.decorationDigestMode === 'per_user_working_hour' ? 'per_user_working_hour' : 'global_time';
  const now = new Date();
  const zoned = moment(now).tz(timezone);
  const currentHHmm = zoned.format('HH:mm');
  const minuteKey = zoned.format('YYYY-MM-DD HH:mm');

  if (mode === 'global_time') {
    const target = settings?.decorationDigestTime ?? '17:00';
    if (currentHHmm === target && lastFired.get('global') !== minuteKey) {
      lastFired.set('global', minuteKey);
      await fire('global', () => runDecorationDigest({ now }));
    }
    return;
  }

  // per_user_working_hour: fire each decorator's digest at their own staffAccessEnd.
  const decorators = await prisma.user.findMany({
    where: { active: true, role: { in: [...DECORATOR_ROLES] } },
    select: { id: true, name: true, staffAccessEnd: true },
  });

  for (const decorator of decorators) {
    const target = decorator.staffAccessEnd ?? '16:00';
    if (currentHHmm === target && lastFired.get(decorator.id) !== minuteKey) {
      lastFired.set(decorator.id, minuteKey);
      await fire(`${decorator.name} (${decorator.id})`, () => runDecorationDigest({ workerId: decorator.id, now }));
    }
  }
}

async function fire(label: string, run: () => ReturnType<typeof runDecorationDigest>) {
  try {
    const result = await run();
    if (result.sent) {
      console.log(`Decoration digest sent for ${label}: ${result.workCount} work record(s), ${result.totalDone} item(s)`);
    } else {
      console.log(`Decoration digest skipped for ${label}: ${result.reason}`);
    }
  } catch (error) {
    console.error(`Decoration digest failed for ${label}`, error);
  }
}

async function main() {
  console.log('Decoration digest worker started');

  while (!shuttingDown) {
    try {
      await tick();
    } catch (error) {
      console.error('Decoration digest tick failed', error);
    }

    if (RUN_ONCE) break;
    await sleep(POLL_INTERVAL_MS);
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await prisma.$disconnect();
  } finally {
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
