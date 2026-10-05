import { NextRequest } from 'next/server';
import { StoreListingEditController, type StoreImageSource } from '@/controllers/store-listing-edit.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';

const controller = new StoreListingEditController();
type ErrResult = { error: { message: string; errors?: string[]; status: number } };
type Params = { params: Promise<{ id: string; storeId: string }> };

function respond(result: { error: ErrResult['error'] } | { message: string; data: unknown }, status = 200) {
  if ('error' in result) return apiError({ message: result.error.message, errors: result.error.errors, status: result.error.status });
  return apiSuccess({ message: result.message, data: result.data, status });
}

/** Add and replace accept either JSON (`hubImageId`) or multipart (an uploaded `file`); everything
 * else rides along as plain fields, so both shapes reach the controller as one body object. */
async function readBody(request: NextRequest): Promise<{ body: Record<string, unknown>; source: StoreImageSource }> {
  if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const form = await request.formData();
    const body: Record<string, unknown> = {};
    let file: File | null = null;
    for (const [key, value] of form.entries()) {
      if (value instanceof File) file = value;
      else body[key] = value;
    }
    return { body, source: { file } };
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return { body, source: { hubImageId: typeof body.hubImageId === 'string' ? body.hubImageId : undefined } };
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id, storeId } = await params;
  const { body, source } = await readBody(request);
  if (typeof body.hubImageId === 'string') source.hubImageId = body.hubImageId;
  return respond(await controller.addMedia(id, storeId, body, source, session), 201);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id, storeId } = await params;
  const { body, source } = await readBody(request);
  if (body.action === 'reorder') return respond(await controller.reorderMedia(id, storeId, body, session));
  if (typeof body.hubImageId === 'string') source.hubImageId = body.hubImageId;
  return respond(await controller.updateMedia(id, storeId, body, source, session));
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  const { id, storeId } = await params;
  const body = await request.json().catch(() => ({}));
  return respond(await controller.removeMedia(id, storeId, body, session));
}
