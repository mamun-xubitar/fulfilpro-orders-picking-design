import { NextRequest } from 'next/server';
import { UserController } from '@/controllers/user.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new UserController();

type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as unknown;
  const result = await controller.update(id, body);

  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }

  return apiSuccess({ message: result.message!, data: result.data });
}
