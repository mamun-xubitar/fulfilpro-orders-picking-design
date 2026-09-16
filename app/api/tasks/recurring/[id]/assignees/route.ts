import { type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { RecurringTaskController } from '@/controllers/recurring-task.controller.server';

const controller = new RecurringTaskController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return apiError({ message: 'Unauthorized', status: 401 });
  const { id } = await params;
  const body = await request.json();
  const result = await controller.addAssignee(id, body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data, status: 201 });
}
