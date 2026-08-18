import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPrivateUpload, safeDownloadName } from '@/lib/uploads';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession({ allowPendingApplication: true });
  if (session.user.role === Role.INVESTOR) return new NextResponse('Not found', { status: 404 });
  const { id } = await params;
  const document = await prisma.onboardingDocument.findFirst({ where: { id, archivedAt: null, onboardingItem: { startup: accessibleStartupWhere(session.user) } }, select: { name: true, storageKey: true, mimeType: true, sizeBytes: true } });
  if (!document) return new NextResponse('Not found', { status: 404 });
  try {
    const bytes = await readPrivateUpload(document.storageKey);
    return new NextResponse(bytes, { headers: { 'Content-Type': document.mimeType || 'application/octet-stream', 'Content-Length': String(document.sizeBytes ?? bytes.byteLength), 'Content-Disposition': `attachment; filename="${safeDownloadName(document.name)}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new NextResponse('File unavailable', { status: 404 });
  }
}
