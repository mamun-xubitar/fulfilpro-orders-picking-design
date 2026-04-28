import { NextRequest } from 'next/server';
import { StoreController } from '@/controllers/store.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';

const controller = new StoreController();

export async function GET() {
  const result = await controller.list();
  return apiSuccess({ message: 'Stores retrieved', data: result.data });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as unknown;
  const result = await controller.create(body);

  if ('error' in result) {
    const { error } = result as { error: { message: string; errors?: string[]; status: number } };
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }

  return apiSuccess({ message: result.message!, data: result.data, status: 201 });
}
