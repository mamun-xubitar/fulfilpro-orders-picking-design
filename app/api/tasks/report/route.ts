import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { TaskController } from '@/controllers/task.controller.server';

const controller = new TaskController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError({ message: 'Unauthorized', status: 401 });
  const result = await controller.report(session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
