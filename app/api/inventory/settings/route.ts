import { NextRequest } from 'next/server';
import { InventorySettingsController } from '@/controllers/inventory-settings.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new InventorySettingsController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET() {
  const session = await auth();
  const result = await controller.get(session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: 'Inventory settings retrieved', data: result.data });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const body = await request.json().catch(() => ({}));
  const result = await controller.update(body, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
