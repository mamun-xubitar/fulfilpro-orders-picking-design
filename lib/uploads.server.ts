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

const OWN_UPLOAD_PREFIX = '/api/uploads/files/';

/** The `uploads/<uuid>` directory behind one of our own upload URLs (bare or prefixed with
 * APP_URL), or null for any other URL. Each upload lives alone in its own `<uuid>` folder. */
export function ownUploadDir(url: string): string | null {
  const base = process.env.APP_URL?.replace(/\/$/, '') ?? '';
  const pathPart = base && url.startsWith(base + OWN_UPLOAD_PREFIX) ? url.slice(base.length) : url;
  if (!pathPart.startsWith(OWN_UPLOAD_PREFIX)) return null;
  const [id] = pathPart.slice(OWN_UPLOAD_PREFIX.length).split('/');
  if (!id) return null;
  try {
    return resolveUploadPath([decodeURIComponent(id)]);
  } catch {
    return null;
  }
}

/** Removes the files behind our own upload URLs. Best-effort: a failure is logged, never thrown,
 * so a stuck file can't fail the delete that triggered it. Other hosts' URLs are ignored. */
export async function deleteUploadedFiles(urls: string[]): Promise<void> {
  const dirs = new Set(urls.map(ownUploadDir).filter((d): d is string => d !== null));
  await Promise.all(
    [...dirs].map((dir) =>
      fs.rm(dir, { recursive: true, force: true }).catch((error) => console.error(`[uploads] could not remove ${dir}`, error))
    )
  );
}

const IMAGE_EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
};
const REMOTE_IMAGE_TIMEOUT_MS = 20_000;
const REMOTE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const REMOTE_IMAGE_CONCURRENCY = 5;

/** Downloads one remote image into our uploads folder and returns its site-relative URL. Throws
 * on a non-http(s) URL, a non-2xx reply, a non-image content-type, a timeout, or a file over 20 MB. */
async function saveRemoteImage(url: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('not an http(s) URL');
  const res = await fetch(parsed, { signal: AbortSignal.timeout(REMOTE_IMAGE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!mime.startsWith('image/')) throw new Error(`not an image (${mime || 'no content-type'})`);
  const declared = Number(res.headers.get('content-length'));
  if (declared > REMOTE_IMAGE_MAX_BYTES) throw new Error('image is larger than 20 MB');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > REMOTE_IMAGE_MAX_BYTES) throw new Error('image is larger than 20 MB');

  let name = sanitizeFileName(decodeURIComponent(parsed.pathname.split('/').pop() || 'image'));
  if (!path.extname(name)) name += IMAGE_EXT_BY_MIME[mime] ?? '.jpg';
  const id = crypto.randomUUID();
  const dir = path.join(UPLOADS_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return `${OWN_UPLOAD_PREFIX}${id}/${encodeURIComponent(name)}`;
}

export type LocalizedImage = { url: string; failed: boolean };

/** Copies each distinct remote image URL into our own storage (5 at a time) and maps it to the
 * local URL. Our own upload URLs map to their site-relative form without a download. A URL that
 * can't be downloaded keeps its original value, flagged `failed`, so the product still has the
 * image and the caller can report it. */
export async function localizeImageUrls(urls: string[]): Promise<Map<string, LocalizedImage>> {
  const result = new Map<string, LocalizedImage>();
  const base = process.env.APP_URL?.replace(/\/$/, '') ?? '';
  const queue: string[] = [];
  for (const url of new Set(urls)) {
    const relative = base && url.startsWith(base + OWN_UPLOAD_PREFIX) ? url.slice(base.length) : url;
    if (relative.startsWith(OWN_UPLOAD_PREFIX)) result.set(url, { url: relative, failed: false });
    else queue.push(url);
  }
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      try {
        result.set(url, { url: await saveRemoteImage(url), failed: false });
      } catch (error) {
        console.error(`[uploads] could not download ${url}`, error instanceof Error ? error.message : error);
        result.set(url, { url, failed: true });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(REMOTE_IMAGE_CONCURRENCY, queue.length) }, worker));
  return result;
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
