import { NextRequest } from 'next/server';
import { InventoryProductImportController } from '@/controllers/inventory-product-import.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new InventoryProductImportController();
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

/** Bulk "Import products" — creates one product per Handle group in a Shopify product CSV, all
 * under the chosen `supplierId`. `commit=false` (the default) parses and validates without
 * writing, for the import modal's preview table; `commit=true` re-parses the same file and
 * creates the products, skipping any handle that already exists. */
export async function POST(request: NextRequest) {
  const session = await auth();
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return apiError({ message: 'No file provided', status: 400 });
    if (file.size > MAX_SIZE) return apiError({ message: 'File exceeds the 10 MB limit', status: 400 });

    const supplierId = formData.get('supplierId');
    if (typeof supplierId !== 'string' || !supplierId.trim()) return apiError({ message: 'supplierId: Supplier is required', status: 400 });

    const commit = formData.get('commit') === 'true';
    const overwrite = formData.get('overwrite') === 'true';
    const markVerified = formData.get('markVerified') === 'true';
    const result = commit
      ? await controller.commit(file, supplierId, session, { overwrite, markVerified })
      : await controller.preview(file, supplierId, session, { overwrite, markVerified });
    if ('error' in result) {
      const { error } = result as ErrResult;
      return apiError({ message: error.message, errors: error.errors, status: error.status });
    }
    return apiSuccess({ message: result.message, data: result.data });
  } catch {
    return apiError({ message: 'Import failed. Please try again.', status: 500 });
  }
}
