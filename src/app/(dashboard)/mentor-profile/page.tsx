import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { MentorProfileEditor } from '@/components/mentors/MentorProfileEditor';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MyMentorProfilePage() {
  const auth = await requireSession();
  if (auth.user.role !== Role.MENTOR) redirect(auth.user.role === Role.PROGRAM_LEAD || auth.user.role === Role.PROGRAM_TEAM ? '/mentors' : '/');
  const mentor = await prisma.person.findUniqueOrThrow({
    where: { id: auth.user.id },
    select: {
      id: true, name: true, email: true, phone: true, organization: true, designation: true, professionalBio: true,
      professionalDomain: true, mentorLocation: true, mentoringFrequency: true, linkedinUrl: true,
      expertiseAreas: true, preferredSectors: true, languages: true, maxStartupCapacity: true, acceptingMentees: true,
      yearsExperience: true, profilePhotoKey: true,
      _count: { select: { assignments: { where: { role: 'MENTOR' } } } },
    },
  });
  return <MentorProfileEditor mentor={mentor} canEdit />;
}
