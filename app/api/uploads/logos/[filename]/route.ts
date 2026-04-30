import { readFile } from 'fs/promises';
import path from 'path';

const LOGO_DIR = path.join(process.cwd(), 'public', 'uploaded', 'logos');
const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return new Response('Invalid logo path', { status: 400 });
  }

  const extension = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return new Response('Unsupported logo type', { status: 400 });
  }

  try {
    const file = await readFile(path.join(LOGO_DIR, filename));
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Logo not found', { status: 404 });
  }
}
