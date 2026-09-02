import { createHash } from 'node:crypto';

export const PASSWORD_RESET_MINUTES = 30;

export function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function passwordResetExpiry(now = new Date()) {
  return new Date(now.getTime() + PASSWORD_RESET_MINUTES * 60 * 1000);
}

export function validPasswordResetToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
