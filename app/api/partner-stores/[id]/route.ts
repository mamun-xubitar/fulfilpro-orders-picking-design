import { apiError, apiSuccess } from '@/lib/api-response.server';
import prisma from '@/lib/prisma.server';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        childStores: true,
      },
    });

    if (!store) {
      return apiError({
        message: 'Partner store not found',
        status: 404,
      });
    }

    if (store.childStores.length > 0) {
      return apiError({
        message: 'Cannot remove partner store that has connected stores',
        status: 400,
      });
    }

    if (store.status === 'partner') {
      await prisma.store.delete({ where: { id } });
    } else {
      return apiError({
        message: 'Cannot remove a connected store from partner stores list',
        status: 400,
      });
    }

    return apiSuccess({
      message: 'Partner store removed successfully.',
      data: { id },
    });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to remove partner store',
      status: 500,
    });
  }
}
