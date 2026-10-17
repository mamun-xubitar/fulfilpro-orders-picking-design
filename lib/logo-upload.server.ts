import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const LOGO_DIR = path.join(process.cwd(), 'public', 'uploaded', 'logos');
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function removeLogoFile(logoPath: string | null) {
  if (!logoPath?.startsWith('uploaded/logos/')) return;
  const filename = path.basename(logoPath);
  try {
    await unlink(path.join(LOGO_DIR, filename));
  } catch {
    // The database value is the source of truth; missing old files should not block updates.
  }
}

/** Validates the `logo` form field. Returns an error message, or the file with its extension. */
export function validateLogoFile(value: FormDataEntryValue | null): { error: string } | { file: File; extension: string } {
  if (!(value instanceof File)) return { error: 'Logo file is required' };

  const extension = ALLOWED_LOGO_TYPES[value.type];
  if (!extension) return { error: 'Logo must be a PNG, JPG, WebP, or GIF image' };

  if (value.size > MAX_LOGO_SIZE) return { error: 'Logo must be 2MB or smaller' };

  return { file: value, extension };
}

/** Writes the file under public/uploaded/logos and returns its DB-relative path. */
export async function writeLogoFile(file: File, extension: string, filenamePrefix: string) {
  await mkdir(LOGO_DIR, { recursive: true });
  const filename = `${filenamePrefix}-${randomUUID()}.${extension}`;
  await writeFile(path.join(LOGO_DIR, filename), Buffer.from(await file.arrayBuffer()));
  return `uploaded/logos/${filename}`;
}
