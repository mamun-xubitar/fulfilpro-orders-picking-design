import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { isDecoratorRole } from '@/lib/roles';
import { saveUploadedFile } from '@/lib/uploads.server';

const MAX_FILES = 20;
const MAX_SIZE = 50 * 1024 * 1024; // 25 MB per file

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== 'admin' && !isDecoratorRole(role)) return apiError({ message: 'Forbidden', status: 403 });

  try {
    const formData = await request.formData();
    const entries = formData.getAll('files').filter((f): f is File => f instanceof File);
    if (entries.length === 0) return apiError({ message: 'No files provided', status: 400 });
    if (entries.length > MAX_FILES) return apiError({ message: `You can upload at most ${MAX_FILES} files at once`, status: 400 });
    for (const file of entries) {
      if (file.size > MAX_SIZE) return apiError({ message: `${file.name} exceeds the 25 MB limit`, status: 400 });
    }

    const files = await Promise.all(entries.map((file) => saveUploadedFile(file)));
    return apiSuccess({ message: 'Files uploaded', data: { files }, status: 201 });
  } catch (error) {
    return apiError({ message: error instanceof Error ? error.message : 'Upload failed', status: 400 });
  }
}
