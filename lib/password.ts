import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function saltAndHashPassword(password: string | unknown): string {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedHashBuffer = scryptSync(password, salt, 64);

  if (hashBuffer.length !== suppliedHashBuffer.length) return false;

  return timingSafeEqual(hashBuffer, suppliedHashBuffer);
}
