import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response.server';
import { getApprovalStatus } from '@/lib/staff-login-approval.server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const approval = await getApprovalStatus(id);

  if (!approval) {
    return apiError({ message: 'Approval request not found', status: 404 });
  }

  return apiSuccess({
    message: 'Approval status retrieved',
    data: {
      id: approval.id,
      status: approval.status,
      expiresAt: approval.expiresAt.toISOString(),
      consumed: Boolean(approval.consumedAt),
    },
  });
}
