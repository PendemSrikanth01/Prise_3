import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPrivateUpload } from '@/lib/uploads';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const startup = await prisma.startup.findFirst({ where: { id, logoStorageKey: { not: null } }, select: { logoStorageKey: true, logoMimeType: true } });
  if (!startup?.logoStorageKey) return new NextResponse(null, { status: 404 });
  const bytes = await readPrivateUpload(startup.logoStorageKey);
  return new NextResponse(bytes, { headers: { 'Content-Type': startup.logoMimeType || 'image/png', 'Content-Disposition': 'inline', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
