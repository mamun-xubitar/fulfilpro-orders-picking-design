import { NextRequest } from 'next/server';
import { InventoryPresetController } from '@/controllers/inventory-preset.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new InventoryPresetController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET() {
  const session = await auth();
  const result = await controller.list(session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Presets retrieved', data: result.data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json().catch(() => ({}));
  const result = await controller.create(body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data, status: 201 });
}
