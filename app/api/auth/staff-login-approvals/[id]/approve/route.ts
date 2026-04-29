import { NextRequest, NextResponse } from 'next/server';
import { resolveApproval } from '@/lib/staff-login-approval.server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const approval = await resolveApproval(token, 'approved');

  if (!approval || approval.id !== id) {
    return htmlResponse('Invalid approval link', 'This staff login approval link is invalid.');
  }

  return htmlResponse(
    approval.status === 'approved' ? 'Staff login approved' : 'Approval unavailable',
    approval.status === 'approved'
      ? 'The staff user can now continue signing in.'
      : `This request is already ${approval.status}.`
  );
}

function htmlResponse(title: string, message: string) {
  return new NextResponse(`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;display:grid;min-height:100vh;place-items:center"><main style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:28px;max-width:420px"><h1 style="font-size:20px;margin:0 0 8px;color:#111827">${title}</h1><p style="color:#4b5563;margin:0">${message}</p></main></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
