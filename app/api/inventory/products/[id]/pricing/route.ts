import { NextRequest } from 'next/server';
import { ProductPricingController } from '@/controllers/product-pricing.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new ProductPricingController();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  let allowedStoreIds: string[] | null | undefined;
  if (session?.user?.id && session?.user?.role) {
    allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
  }
  const result = await controller.get(id, session, allowedStoreIds);

  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: 'OK', data: result.data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  let allowedStoreIds: string[] | null | undefined;
  if (session?.user?.id && session?.user?.role) {
    allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
  }
  const body = await request.json().catch(() => ({}));
  const result = await controller.save(id, body, session, allowedStoreIds);

  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number; errors?: string[] } };
    return apiError({ message: error.message, errors: error.errors, status: error.status });
  }

  return apiSuccess({ message: result.message ?? 'Pricing saved', data: result.data });
}
