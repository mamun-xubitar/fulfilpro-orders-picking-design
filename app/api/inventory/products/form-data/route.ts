import { ProductController } from '@/controllers/product.controller.server';
import { apiSuccess, apiError } from '@/lib/api-response.server';
import { auth } from '@/auth';
import { getUserAllowedStoreIds } from '@/lib/store-access.server';

const controller = new ProductController();

export async function GET() {
  const session = await auth();
  let allowedStoreIds: string[] | null | undefined;

  if (session?.user?.id && session?.user?.role) {
    allowedStoreIds = await getUserAllowedStoreIds(session.user.id, session.user.role);
  }

  const result = await controller.formData(session, allowedStoreIds);
  if ('error' in result) {
    const { error } = result as { error: { message: string; status: number } };
    return apiError({ message: error.message, status: error.status });
  }

  return apiSuccess({ message: 'Filter options retrieved', data: result.data });
}
