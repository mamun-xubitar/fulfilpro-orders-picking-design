import prisma from '@/lib/prisma.server';
import { syncConnectedStoreProducts } from '@/lib/shopify-product-sync.server';
import { Prisma } from '@prisma/client';

const ACTIVE_SYNC_STATUSES = ['queued', 'running'];

type ProductSyncJobRow = Awaited<ReturnType<typeof getProductSyncJobById>>;

export function serializeProductSyncJob(job: NonNullable<ProductSyncJobRow>) {
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

export async function enqueueProductSyncJob(storeIds?: string[]) {
  const activeJob = await findActiveProductSyncJob();
  if (activeJob) {
    return {
      job: serializeProductSyncJob(activeJob),
      alreadyRunning: true,
    };
  }

  try {
    const job = await prisma.productSyncJob.create({
      data: {
        storeIds: storeIds && storeIds.length > 0 ? storeIds : undefined,
      },
    });

    return {
      job: serializeProductSyncJob(job),
      alreadyRunning: false,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const currentActiveJob = await findActiveProductSyncJob();
      if (currentActiveJob) {
        return {
          job: serializeProductSyncJob(currentActiveJob),
          alreadyRunning: true,
        };
      }
    }
    throw error;
  }
}

export async function getProductSyncStatus() {
  const [activeJob, lastSuccessfulJob, latestJob] = await Promise.all([
    findActiveProductSyncJob(),
    prisma.productSyncJob.findFirst({
      where: { status: 'completed' },
      orderBy: { finishedAt: 'desc' },
    }),
    prisma.productSyncJob.findFirst({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    activeJob: activeJob ? serializeProductSyncJob(activeJob) : null,
    lastSuccessfulJob: lastSuccessfulJob ? serializeProductSyncJob(lastSuccessfulJob) : null,
    latestJob: latestJob ? serializeProductSyncJob(latestJob) : null,
  };
}

export async function acquireNextProductSyncJob() {
  const queuedJob = await prisma.productSyncJob.findFirst({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
  });

  if (!queuedJob) return null;

  const result = await prisma.productSyncJob.updateMany({
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
  return getProductSyncJobById(queuedJob.id);
}

export async function runProductSyncJob(jobId: string) {
  const job = await getProductSyncJobById(jobId);
  if (!job) throw new Error(`Product sync job ${jobId} was not found`);
  if (job.status !== 'running') throw new Error(`Product sync job ${jobId} is not running`);

  try {
    const result = await syncConnectedStoreProducts({
      storeIds: job.storeIds as string[] | null,
      onStoreSynced: async (storeResult) => {
        await prisma.productSyncJob.update({
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

    const completedJob = await prisma.productSyncJob.update({
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

    return serializeProductSyncJob(completedJob);
  } catch (error) {
    const failedJob = await markProductSyncJobFailed(
      job.id,
      error instanceof Error ? error.message : 'Product sync failed'
    );
    return serializeProductSyncJob(failedJob);
  }
}

export async function markProductSyncJobFailed(jobId: string, message: string) {
  return prisma.productSyncJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      error: message,
      finishedAt: new Date(),
    },
  });
}

async function findActiveProductSyncJob() {
  return prisma.productSyncJob.findFirst({
    where: { status: { in: ACTIVE_SYNC_STATUSES } },
    orderBy: { createdAt: 'desc' },
  });
}

function getProductSyncJobById(id: string) {
  return prisma.productSyncJob.findUnique({
    where: { id },
  });
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
