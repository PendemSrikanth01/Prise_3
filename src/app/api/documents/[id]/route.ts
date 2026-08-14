import { NextResponse } from 'next/server';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPrivateUpload, safeDownloadName } from '@/lib/uploads';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const deliverable = await prisma.deliverable.findFirst({ where: { id, milestone: { startup: accessibleStartupWhere(session.user) } }, select: { name: true, storageKey: true, mimeType: true, sizeBytes: true } });
  if (!deliverable) return new NextResponse('Not found', { status: 404 });
  try {
    const bytes = await readPrivateUpload(deliverable.storageKey);
    return new NextResponse(bytes, { headers: { 'Content-Type': deliverable.mimeType || 'application/octet-stream', 'Content-Length': String(deliverable.sizeBytes ?? bytes.byteLength), 'Content-Disposition': `attachment; filename="${safeDownloadName(deliverable.name)}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new NextResponse('File unavailable', { status: 404 });
  }
}
