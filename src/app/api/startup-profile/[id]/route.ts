import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessStartupProfile } from '@/lib/startup-profile-access';
import { readPrivateUpload, safeDownloadName } from '@/lib/uploads';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (!(await canAccessStartupProfile(session.user, id))) return new NextResponse(null, { status: 404 });
  const startup = await prisma.startup.findFirst({ where: { id, profilePdfStorageKey: { not: null } }, select: { profilePdfStorageKey: true, profilePdfName: true, profilePdfSizeBytes: true } });
  if (!startup?.profilePdfStorageKey) return new NextResponse(null, { status: 404 });
  const bytes = await readPrivateUpload(startup.profilePdfStorageKey);
  const download = new URL(request.url).searchParams.get('download') === '1';
  return new NextResponse(bytes, { headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(startup.profilePdfSizeBytes ?? bytes.byteLength), 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeDownloadName(startup.profilePdfName || 'startup-profile.pdf')}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
