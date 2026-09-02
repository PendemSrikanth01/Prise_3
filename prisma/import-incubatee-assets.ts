import { randomUUID } from 'node:crypto';
import { chown, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { PrismaClient, StartupStatus } from '@prisma/client';

type AssetEntry = {
  sNo: number;
  startupName: string;
  logoFile?: string;
  profilePdfFile?: string;
};

type PreparedAsset = { bytes: Uint8Array; extension: string; mimeType: string; sourceName: string };

const prisma = new PrismaClient();
const manifestPath = resolve(process.env.INCUBATEE_ASSETS_MANIFEST || 'private-imports/incubatee-assets/manifest.json');
const importRoot = dirname(manifestPath);
const uploadRoot = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const apply = process.env.INCUBATEE_ASSETS_APPLY === 'true';
const MAX_BYTES = 10 * 1024 * 1024;

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function insideImportRoot(relativePath: string) {
  const path = resolve(importRoot, relativePath);
  if (path !== importRoot && !path.startsWith(`${importRoot}${sep}`)) throw new Error(`Asset path escapes import directory: ${relativePath}`);
  return path;
}

function detect(bytes: Uint8Array, kind: 'logo' | 'pdf') {
  const head = Buffer.from(bytes.slice(0, 16));
  const hex = head.toString('hex');
  if (kind === 'pdf') {
    if (head.subarray(0, 5).toString() !== '%PDF-') throw new Error('Profile document is not a valid PDF.');
    return { extension: '.pdf', mimeType: 'application/pdf' };
  }
  if (hex.startsWith('ffd8ff')) return { extension: '.jpg', mimeType: 'image/jpeg' };
  if (hex.startsWith('89504e470d0a1a0a')) return { extension: '.png', mimeType: 'image/png' };
  if (hex.startsWith('52494646') && head.subarray(8, 12).toString() === 'WEBP') return { extension: '.webp', mimeType: 'image/webp' };
  if (head.subarray(4, 12).toString() === 'ftypavif') return { extension: '.avif', mimeType: 'image/avif' };
  throw new Error('Logo must be a valid JPEG, PNG, WebP or AVIF image.');
}

async function prepare(relativePath: string, kind: 'logo' | 'pdf'): Promise<PreparedAsset> {
  const sourcePath = insideImportRoot(relativePath);
  const bytes = new Uint8Array(await readFile(sourcePath));
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error(`${relativePath} must be between 1 byte and 10 MB.`);
  return { bytes, ...detect(bytes, kind), sourceName: sourcePath.split(/[\\/]/).at(-1) || relativePath };
}

async function store(asset: PreparedAsset) {
  const storageKey = `${randomUUID()}${asset.extension}`;
  await mkdir(uploadRoot, { recursive: true });
  const destination = join(uploadRoot, storageKey);
  await writeFile(destination, asset.bytes, { flag: 'wx', mode: 0o600 });
  await chown(destination, 1001, 1001).catch(() => undefined);
  return storageKey;
}

async function remove(storageKey?: string | null) {
  if (!storageKey || !/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(storageKey)) return;
  await unlink(join(uploadRoot, storageKey)).catch(() => undefined);
}

async function main() {
  const entries = JSON.parse(await readFile(manifestPath, 'utf8')) as AssetEntry[];
  if (!Array.isArray(entries) || !entries.length) throw new Error('Incubatee asset manifest is empty.');
  if (new Set(entries.map(({ sNo }) => sNo)).size !== entries.length) throw new Error('Manifest contains duplicate startup numbers.');

  const startups = await prisma.startup.findMany({
    where: { sNo: { in: entries.map(({ sNo }) => sNo) }, status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] } },
    select: { id: true, sNo: true, name: true, logoStorageKey: true, profilePdfStorageKey: true },
  });
  const prepared = [] as Array<{ entry: AssetEntry; startup: (typeof startups)[number]; logo?: PreparedAsset; pdf?: PreparedAsset }>;
  for (const entry of entries) {
    const startup = startups.find(({ sNo }) => sNo === entry.sNo);
    if (!startup) throw new Error(`Active startup S.No ${entry.sNo} was not found.`);
    if (normalizedName(startup.name) !== normalizedName(entry.startupName)) throw new Error(`Startup name mismatch for S.No ${entry.sNo}: database is "${startup.name}", manifest is "${entry.startupName}".`);
    prepared.push({ entry, startup, logo: entry.logoFile ? await prepare(entry.logoFile, 'logo') : undefined, pdf: entry.profilePdfFile ? await prepare(entry.profilePdfFile, 'pdf') : undefined });
  }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', startups: prepared.map(({ entry, startup, logo, pdf }) => ({ sNo: entry.sNo, startup: startup.name, logo: logo?.sourceName || 'not supplied', profilePdf: pdf?.sourceName || 'not supplied' })) }, null, 2));
  if (!apply) return;

  for (const { startup, logo, pdf } of prepared) {
    let newLogoKey: string | undefined;
    let newPdfKey: string | undefined;
    try {
      if (logo) newLogoKey = await store(logo);
      if (pdf) newPdfKey = await store(pdf);
      await prisma.$transaction(async (tx) => {
        await tx.startup.update({
          where: { id: startup.id },
          data: {
            ...(logo && newLogoKey ? { logoStorageKey: newLogoKey, logoMimeType: logo.mimeType } : {}),
            ...(pdf && newPdfKey ? { profilePdfStorageKey: newPdfKey, profilePdfName: pdf.sourceName, profilePdfSizeBytes: pdf.bytes.byteLength } : {}),
          },
        });
        await tx.activityLog.create({ data: { startupId: startup.id, entityType: 'Startup', entityId: startup.id, action: 'incubatee_directory_assets_imported', summary: `${startup.name}: directory assets updated`, meta: { logo: logo?.sourceName || null, profilePdf: pdf?.sourceName || null } } });
      });
    } catch (error) {
      await Promise.all([remove(newLogoKey), remove(newPdfKey)]);
      throw error;
    }
    if (logo) await remove(startup.logoStorageKey);
    if (pdf) await remove(startup.profilePdfStorageKey);
  }
  console.log(`Imported directory assets for ${prepared.length} startups.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
