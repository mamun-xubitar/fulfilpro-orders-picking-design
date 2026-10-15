import { NextRequest } from 'next/server';
import { StoreInvoiceSettingController } from '@/controllers/store-invoice-setting.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';

const controller = new StoreInvoiceSettingController();

type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await controller.get(id);

  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: result.message, data: result.data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as unknown;
  const result = await controller.save(id, body);

  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }

  return apiSuccess({ message: result.message, data: result.data });
}
