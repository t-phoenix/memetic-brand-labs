import { createHash } from 'crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashIp(ip: string, salt: string): string {
  return sha256(`${salt}:${ip}`);
}

export function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}
