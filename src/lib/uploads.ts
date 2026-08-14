import 'server-only';

import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream',
]);

function uploadRoot() {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
}

export function safeDownloadName(value: string) {
  return value.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180) || 'document';
}

export async function storePrivateUpload(file: File) {
  const extension = extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error('Use JPG, PNG, WebP, PDF, Word, Excel, CSV or PowerPoint files.');
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new Error('Each file must be between 1 byte and 10 MB.');
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) throw new Error('This file type is not allowed.');

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(extension, bytes)) throw new Error('The file contents do not match the selected file type.');
  const storageKey = `${randomUUID()}${extension}`;
  await mkdir(uploadRoot(), { recursive: true });
  await writeFile(join(/* turbopackIgnore: true */ uploadRoot(), storageKey), bytes, { flag: 'wx', mode: 0o600 });
  return { storageKey, sizeBytes: bytes.byteLength, mimeType: file.type || 'application/octet-stream' };
}

export async function readPrivateUpload(storageKey: string) {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(storageKey)) throw new Error('Invalid storage key.');
  return readFile(join(/* turbopackIgnore: true */ uploadRoot(), storageKey));
}

export async function removePrivateUpload(storageKey: string) {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(storageKey)) return;
  await unlink(join(/* turbopackIgnore: true */ uploadRoot(), storageKey)).catch(() => undefined);
}

function matchesSignature(extension: string, bytes: Uint8Array) {
  const hex = Buffer.from(bytes.slice(0, 12)).toString('hex');
  if (['.jpg', '.jpeg'].includes(extension)) return hex.startsWith('ffd8ff');
  if (extension === '.png') return hex.startsWith('89504e470d0a1a0a');
  if (extension === '.webp') return hex.startsWith('52494646') && Buffer.from(bytes.slice(8, 12)).toString() === 'WEBP';
  if (extension === '.pdf') return Buffer.from(bytes.slice(0, 5)).toString() === '%PDF-';
  if (['.doc', '.xls', '.ppt'].includes(extension)) return hex.startsWith('d0cf11e0a1b11ae1');
  if (['.docx', '.xlsx', '.pptx'].includes(extension)) return hex.startsWith('504b0304') || hex.startsWith('504b0506') || hex.startsWith('504b0708');
  if (extension === '.csv') return !bytes.slice(0, 1024).includes(0);
  return false;
}
