import { type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { TaskController } from '@/controllers/task.controller.server';

const controller = new TaskController();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return apiError({ message: 'Unauthorized', status: 401 });
  const result = await controller.listRecurringParents(request.nextUrl.searchParams, session);
  return apiSuccess({ message: result.message, data: result.data });
}
