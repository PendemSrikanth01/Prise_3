import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPrivateUpload } from '@/lib/uploads';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const mentor = await prisma.person.findFirst({
    where: { id, role: Role.MENTOR, isActive: true, profilePhotoKey: { not: null } },
    select: { profilePhotoKey: true, profilePhotoMimeType: true },
  });
  if (!mentor?.profilePhotoKey) return new NextResponse(null, { status: 404 });
  const bytes = await readPrivateUpload(mentor.profilePhotoKey);
  return new NextResponse(bytes, { headers: { 'Content-Type': mentor.profilePhotoMimeType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': 'inline' } });
}
