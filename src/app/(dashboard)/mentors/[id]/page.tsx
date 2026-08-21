import { Role } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import { MentorProfileEditor } from '@/components/mentors/MentorProfileEditor';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ProgramMentorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth.user.role !== Role.PROGRAM_LEAD && auth.user.role !== Role.PROGRAM_TEAM) redirect('/');
  const { id } = await params;
  const mentor = await prisma.person.findFirst({
    where: { id, role: Role.MENTOR },
    select: {
      id: true, name: true, email: true, phone: true, organization: true, designation: true, professionalBio: true,
      expertiseAreas: true, preferredSectors: true, languages: true, maxStartupCapacity: true, acceptingMentees: true,
      preferredMeetingMode: true, timezone: true,
      yearsExperience: true, profilePhotoKey: true,
      mentorAvailability: { where: { isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] },
      _count: { select: { assignments: { where: { role: 'MENTOR' } } } },
    },
  });
  if (!mentor) notFound();
  return <MentorProfileEditor mentor={mentor} canEdit />;
}
