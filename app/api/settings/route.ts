import { NextRequest } from 'next/server';
import { SettingsController } from '@/controllers/settings.controller.server';
import { apiError, apiSuccess } from '@/lib/api-response.server';

const controller = new SettingsController();

type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET() {
  const result = await controller.get();
  return apiSuccess({ message: 'Settings retrieved', data: result.data });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json() as unknown;
  const result = await controller.update(body);

  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }

  return apiSuccess({ message: result.message!, data: result.data });
}
