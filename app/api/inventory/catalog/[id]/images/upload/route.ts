import { NextRequest } from 'next/server';
import { SupplierProductController } from '@/controllers/supplier-product.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new SupplierProductController();
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
type ErrResult = { error: { message: string; errors?: string[]; status: number } };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    const formData = await request.formData();
    const entries = formData.getAll('files').filter((f): f is File => f instanceof File);
    if (entries.length === 0) return apiError({ message: 'No files provided', status: 400 });
    if (entries.length > MAX_FILES) return apiError({ message: `You can upload at most ${MAX_FILES} files at once`, status: 400 });
    for (const file of entries) {
      if (file.size > MAX_SIZE) return apiError({ message: `${file.name} exceeds the 10 MB limit`, status: 400 });
    }

    const variantIdRaw = formData.get('variantId');
    const variantId = typeof variantIdRaw === 'string' && variantIdRaw.trim() ? variantIdRaw.trim() : null;

    const result = await controller.uploadImages(id, entries, null, session, variantId);
    if ('error' in result) {
      const { error } = result as ErrResult;
      return apiError({ message: error.message, errors: error.errors, status: error.status });
    }
    return apiSuccess({ message: result.message, data: result.data, status: 201 });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Upload failed', status: 400 });
  }
}
