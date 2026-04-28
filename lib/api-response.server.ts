import { NextResponse } from 'next/server';

export function apiSuccess<T>({
  message,
  data,
  status = 200,
}: {
  message: string;
  data: T;
  status?: number;
}) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function apiError({
  message,
  errors,
  status = 500,
}: {
  message: string;
  errors?: string[];
  status?: number;
}) {
  return NextResponse.json({ success: false, message, errors: errors ?? [] }, { status });
}
