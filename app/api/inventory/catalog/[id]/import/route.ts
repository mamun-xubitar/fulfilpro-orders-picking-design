import { NextRequest } from 'next/server';
import { InventoryImportController } from '@/controllers/inventory-import.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new InventoryImportController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await controller.importVariants(id, body, session);
    if ('error' in result) {
      const { error } = result as ErrResult;
      return apiError({ message: error.message, errors: error.errors, status: error.status });
    }
    return apiSuccess({ message: result.message, data: result.data });
  } catch {
    return apiError({ message: 'Import failed. Please try again.', status: 500 });
  }
}
