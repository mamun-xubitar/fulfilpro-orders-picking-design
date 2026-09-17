import { InventoryOptionLibraryController } from '@/controllers/inventory-option-library.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new InventoryOptionLibraryController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function DELETE(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const session = await auth();
  const { kind, id } = await params;
  const result = await controller.remove(kind, id, session);
  if ('error' in result) {
    const { error } = result as ErrResult;
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }
  return apiSuccess({ message: result.message, data: result.data });
}
