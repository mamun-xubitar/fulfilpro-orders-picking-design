import { auth } from '@/auth';
import { DecorationController } from '@/controllers/decoration.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new DecorationController();

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'admin') return apiError({ message: 'Forbidden', status: 403 });

  try {
    const result = await controller.listDecoratorUsers();
    return apiSuccess({ message: result.message, data: result.data });
  } catch (error) {
    return apiError({
      message: error instanceof Error ? error.message : 'Failed to load decorators',
      status: 400,
    });
  }
}
