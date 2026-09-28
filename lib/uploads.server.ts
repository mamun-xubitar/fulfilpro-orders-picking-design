import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export type SavedFile = {
  name: string;
  url: string;
  size: number;
  mimeType: string;
};

export function sanitizeFileName(name: string) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 200) || 'file';
}

export async function saveUploadedFile(file: File): Promise<SavedFile> {
  const id = crypto.randomUUID();
  const safeName = sanitizeFileName(file.name || 'file');
  const dir = path.join(UPLOADS_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, safeName), buffer);
  return {
    name: safeName,
    url: `/api/uploads/files/${id}/${encodeURIComponent(safeName)}`,
    size: buffer.length,
    mimeType: file.type || 'application/octet-stream',
  };
}

/** Shopify fetches image `originalSource` URLs itself, so a site-relative upload path (what
 * saveUploadedFile stores) has to become an absolute public URL first. Returns null when it can't
 * be made public, so callers fail loudly instead of silently publishing a product with no media. */
export function toPublicUrl(url: string): string | null {
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.APP_URL?.replace(/\/$/, '');
  if (!base || !url.startsWith('/')) return null;
  return `${base}${url}`;
}

/** Of the given public URLs, returns the file names of our own uploads (`/api/uploads/files/...`,
 * bare or prefixed with APP_URL) that no longer exist on disk — Shopify would 404 fetching them and
 * report only a generic "Media processing failed". URLs on any other host can't be checked locally
 * and are skipped. */
export async function findMissingUploads(publicUrls: string[]): Promise<string[]> {
  const base = process.env.APP_URL?.replace(/\/$/, '') ?? '';
  const prefix = '/api/uploads/files/';
  const missing: string[] = [];
  for (const url of publicUrls) {
    const pathPart = base && url.startsWith(base + prefix) ? url.slice(base.length) : url;
    if (!pathPart.startsWith(prefix)) continue;
    const rawSegments = pathPart.slice(prefix.length).split('/');
    try {
      const filePath = resolveUploadPath(rawSegments.map(decodeURIComponent));
      if (!filePath) throw new Error('outside uploads');
      await fs.access(filePath);
    } catch {
      missing.push(rawSegments[rawSegments.length - 1] || url);
    }
  }
  return missing;
}

/** Resolve a public file path, guarding against directory traversal. Returns null if outside UPLOADS_DIR. */
export function resolveUploadPath(segments: string[]): string | null {
  const normalized = path.normalize(path.join(UPLOADS_DIR, ...segments));
  if (normalized !== UPLOADS_DIR && !normalized.startsWith(UPLOADS_DIR + path.sep)) {
    return null;
  }
  return normalized;
}

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.zip': 'application/zip',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function mimeForFile(filePath: string): string {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}
