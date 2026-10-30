import { auth } from '@/auth';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { isBillingAdmin } from '@/lib/billing-access.server';
import { enqueueCustomerSync } from '@/lib/background-jobs.server';

export async function POST() {
  const session = await auth();
  if (!isBillingAdmin(session)) return apiError({ message: 'Forbidden', status: 403 });

  const queued = await enqueueCustomerSync();
  return apiSuccess({
    message: queued ? 'Customer sync queued. It runs in the background worker.' : 'A customer sync is already queued or running.',
    data: { queued },
  });
}
