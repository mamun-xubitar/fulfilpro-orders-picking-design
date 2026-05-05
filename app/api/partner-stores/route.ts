import { apiError, apiSuccess } from '@/lib/api-response.server';
import prisma from '@/lib/prisma.server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  if (domain) {
    try {
      const trimmedDomain = domain.trim();
      if (!trimmedDomain) {
        return apiError({
          message: 'Store domain is required',
          status: 400,
        });
      }

      const existingStore = await prisma.store.findFirst({
        where: { storeDomain: trimmedDomain },
      });

      if (existingStore) {
        return apiSuccess({
          message: 'Partner store already exists.',
          data: {
            id: existingStore.id,
            name: existingStore.name,
            storeDomain: existingStore.storeDomain,
          },
        });
      }

      const newStore = await prisma.store.create({
        data: {
          storeDomain: trimmedDomain,
          clientId: 'placeholder',
          clientSecret: 'placeholder',
          status: 'partner',
        },
      });

      return apiSuccess({
        message: 'Partner store added successfully.',
        data: {
          id: newStore.id,
          name: newStore.name,
          storeDomain: newStore.storeDomain,
        },
      });
    } catch (error) {
      return apiError({
        message: error instanceof Error ? error.message : 'Failed to add partner store',
        status: 500,
      });
    }
  }

  try {
    const partnerStores = await prisma.store.findMany({
      where: {
        status: 'partner',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        storeDomain: true,
      },
    });

    return apiSuccess({
      message: 'Partner stores retrieved.',
      data: partnerStores,
    });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to retrieve partner stores',
      status: 500,
    });
  }
}
