import { NextRequest, NextResponse } from 'next/server';
import { FulfillmentRequestController } from '@/controllers/fulfillment-request.controller.server';

const controller = new FulfillmentRequestController();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  const token = new URL(request.url).searchParams.get('token') ?? '';

  try {
    await controller.rejectByToken(requestId, token);
    return htmlResponse('Request Rejected', 'The fulfillment request has been successfully rejected.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject request';
    return htmlResponse('Error', message);
  }
}

function htmlResponse(title: string, message: string) {
  return new NextResponse(`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;display:grid;min-height:100vh;place-items:center"><main style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:28px;max-width:420px"><h1 style="font-size:20px;margin:0 0 8px;color:#111827">${title}</h1><p style="color:#4b5563;margin:0">${message}</p></main></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
