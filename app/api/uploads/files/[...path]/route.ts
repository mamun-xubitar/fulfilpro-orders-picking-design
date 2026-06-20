import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { resolveUploadPath, mimeForFile } from '@/lib/uploads.server';

// Public, unauthenticated file serving for decoration uploads.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const filePath = resolveUploadPath(segments ?? []);
  if (!filePath) return new NextResponse('Not found', { status: 404 });

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': mimeForFile(filePath),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
