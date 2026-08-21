import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPrivateUpload, safeDownloadName } from '@/lib/uploads';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (session.user.role === Role.INVESTOR) return new NextResponse('Forbidden', { status: 403 });
  const { id } = await params;
  const resource = await prisma.resource.findFirst({ where: { id, isArchived: false, storageKey: { not: null } }, select: { fileName: true, storageKey: true, mimeType: true, sizeBytes: true } });
  if (!resource?.storageKey) return new NextResponse('Not found', { status: 404 });
  try {
    const bytes = await readPrivateUpload(resource.storageKey);
    return new NextResponse(bytes, { headers: {
      'Content-Type': resource.mimeType || 'application/octet-stream',
      'Content-Length': String(resource.sizeBytes ?? bytes.byteLength),
      'Content-Disposition': `attachment; filename="${safeDownloadName(resource.fileName || 'resource')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch {
    return new NextResponse('File unavailable', { status: 404 });
  }
}
