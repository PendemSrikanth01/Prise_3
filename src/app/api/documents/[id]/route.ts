import { NextResponse } from 'next/server';
import { DeliverableStatus, Role } from '@prisma/client';
import { accessibleStartupWhere, isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPrivateUpload, safeDownloadName } from '@/lib/uploads';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  let deliverable = await prisma.deliverable.findFirst({
    where: session.user.role === Role.INVESTOR
      ? { id, status: DeliverableStatus.APPROVED, milestone: { startup: { investorShares: { some: { investorId: session.user.id, canViewDocuments: true } } } } }
      : { id, milestone: { startup: accessibleStartupWhere(session.user) } },
    select: { name: true, storageKey: true, mimeType: true, sizeBytes: true },
  });
  if (!deliverable && isProgramRole(session.user.role)) {
    deliverable = await prisma.programActionEvidence.findUnique({ where: { id }, select: { name: true, storageKey: true, mimeType: true, sizeBytes: true } });
  }
  if (!deliverable) return new NextResponse('Not found', { status: 404 });
  try {
    const bytes = await readPrivateUpload(deliverable.storageKey);
    const disposition = new URL(request.url).searchParams.get('view') === '1' ? 'inline' : 'attachment';
    return new NextResponse(bytes, { headers: { 'Content-Type': deliverable.mimeType || 'application/octet-stream', 'Content-Length': String(deliverable.sizeBytes ?? bytes.byteLength), 'Content-Disposition': `${disposition}; filename="${safeDownloadName(deliverable.name)}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new NextResponse('File unavailable', { status: 404 });
  }
}
