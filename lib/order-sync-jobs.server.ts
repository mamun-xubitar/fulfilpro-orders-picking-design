import prisma from '@/lib/prisma.server';
import { syncConnectedStoreOrders } from '@/lib/shopify-order-sync.server';
import { Prisma } from '@prisma/client';

const ACTIVE_SYNC_STATUSES = ['queued', 'running'];

type OrderSyncJobRow = Awaited<ReturnType<typeof getOrderSyncJobById>>;

export function serializeOrderSyncJob(job: NonNullable<OrderSyncJobRow>) {
  return {
    id: job.id,
    status: job.status,
    storeIds: job.storeIds as string[] | null,
    totalStores: job.totalStores,
    totalFetched: job.totalFetched,
    totalCreated: job.totalCreated,
    totalUpdated: job.totalUpdated,
    failedStores: job.failedStores,
    error: job.error,
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function enqueueOrderSyncJob(storeIds?: string[]) {
  const activeJob = await findActiveOrderSyncJob();
  if (activeJob) {
    return {
      job: serializeOrderSyncJob(activeJob),
      alreadyRunning: true,
    };
  }

  try {
    const job = await prisma.orderSyncJob.create({
      data: {
        storeIds: storeIds && storeIds.length > 0 ? storeIds : undefined,
      },
    });

    return {
      job: serializeOrderSyncJob(job),
      alreadyRunning: false,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const currentActiveJob = await findActiveOrderSyncJob();
      if (currentActiveJob) {
        return {
          job: serializeOrderSyncJob(currentActiveJob),
          alreadyRunning: true,
        };
      }
    }
    throw error;
  }
}

export async function getOrderSyncStatus() {
  const [activeJob, lastSuccessfulJob, latestJob] = await Promise.all([
    findActiveOrderSyncJob(),
    prisma.orderSyncJob.findFirst({
      where: { status: 'completed' },
      orderBy: { finishedAt: 'desc' },
    }),
    prisma.orderSyncJob.findFirst({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    activeJob: activeJob ? serializeOrderSyncJob(activeJob) : null,
    lastSuccessfulJob: lastSuccessfulJob ? serializeOrderSyncJob(lastSuccessfulJob) : null,
    latestJob: latestJob ? serializeOrderSyncJob(latestJob) : null,
  };
}

export async function acquireNextOrderSyncJob() {
  const queuedJob = await prisma.orderSyncJob.findFirst({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
  });

  if (!queuedJob) return null;

  const result = await prisma.orderSyncJob.updateMany({
    where: {
      id: queuedJob.id,
      status: 'queued',
    },
    data: {
      status: 'running',
      startedAt: new Date(),
      error: null,
      totalStores: 0,
      totalFetched: 0,
      totalCreated: 0,
      totalUpdated: 0,
      failedStores: 0,
    },
  });

  if (result.count === 0) return null;
  return getOrderSyncJobById(queuedJob.id);
}

export async function runOrderSyncJob(jobId: string) {
  const job = await getOrderSyncJobById(jobId);
  if (!job) throw new Error(`Order sync job ${jobId} was not found`);
  if (job.status !== 'running') throw new Error(`Order sync job ${jobId} is not running`);

  try {
    const result = await syncConnectedStoreOrders({
      storeIds: job.storeIds as string[] | null,
      onStoreSynced: async (storeResult) => {
        await prisma.orderSyncJob.update({
          where: { id: job.id },
          data: {
            totalFetched: { increment: storeResult.fetched },
            totalCreated: { increment: storeResult.created },
            totalUpdated: { increment: storeResult.updated },
            failedStores: { increment: storeResult.error ? 1 : 0 },
          },
        });
      },
    });

    const completedJob = await prisma.orderSyncJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        totalStores: result.totalStores,
        totalFetched: result.totalFetched,
        totalCreated: result.totalCreated,
        totalUpdated: result.totalUpdated,
        failedStores: result.failedStores,
        finishedAt: new Date(),
        error: result.failedStores > 0 ? `${result.failedStores} store sync failed` : null,
      },
    });

    return serializeOrderSyncJob(completedJob);
  } catch (error) {
    const failedJob = await markOrderSyncJobFailed(
      job.id,
      error instanceof Error ? error.message : 'Order sync failed'
    );
    return serializeOrderSyncJob(failedJob);
  }
}

export async function markOrderSyncJobFailed(jobId: string, message: string) {
  return prisma.orderSyncJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      error: message,
      finishedAt: new Date(),
    },
  });
}

async function findActiveOrderSyncJob() {
  return prisma.orderSyncJob.findFirst({
    where: { status: { in: ACTIVE_SYNC_STATUSES } },
    orderBy: { createdAt: 'desc' },
  });
}

function getOrderSyncJobById(id: string) {
  return prisma.orderSyncJob.findUnique({
    where: { id },
  });
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
