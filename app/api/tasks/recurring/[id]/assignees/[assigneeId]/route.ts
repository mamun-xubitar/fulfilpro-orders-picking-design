import { type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { RecurringTaskController } from '@/controllers/recurring-task.controller.server';

const controller = new RecurringTaskController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; assigneeId: string }> }) {
  const session = await auth();
  if (!session?.user) return apiError({ message: 'Unauthorized', status: 401 });
  const { id, assigneeId } = await params;
  const result = await controller.removeAssignee(id, assigneeId, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
