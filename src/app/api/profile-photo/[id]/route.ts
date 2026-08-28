import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPrivateUpload } from '@/lib/uploads';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const person = await prisma.person.findFirst({ where: { id, isActive: true, profilePhotoKey: { not: null } }, select: { profilePhotoKey: true, profilePhotoMimeType: true } });
  if (!person?.profilePhotoKey) return new NextResponse(null, { status: 404 });
  const bytes = await readPrivateUpload(person.profilePhotoKey);
  return new NextResponse(bytes, { headers: { 'Content-Type': person.profilePhotoMimeType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': 'inline' } });
}
