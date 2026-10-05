import { NextRequest } from 'next/server';
import { InventoryCsvImportController } from '@/controllers/inventory-csv-import.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new InventoryCsvImportController();
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

/** Imports a Shopify product CSV. `commit=false` (the default) parses and validates without writing, for the import modal's preview table;
 * `commit=true` re-parses the same file and applies it. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return apiError({ message: 'No file provided', status: 400 });
    if (file.size > MAX_SIZE) return apiError({ message: 'File exceeds the 10 MB limit', status: 400 });

    const commit = formData.get('commit') === 'true';
    // Overwrite defaults to today's always-replace behaviour when the client omits it.
    const overwrite = formData.get('overwrite') !== 'false';
    const markVerified = formData.get('markVerified') === 'true';
    const result = commit
      ? await controller.commit(id, file, session, { overwrite, markVerified })
      : await controller.preview(id, file, session, { overwrite, markVerified });
    if ('error' in result) {
      const { error } = result as ErrResult;
      return apiError({ message: error.message, errors: error.errors, status: error.status });
    }
    return apiSuccess({ message: result.message, data: result.data });
  } catch {
    return apiError({ message: 'Import failed. Please try again.', status: 500 });
  }
}
