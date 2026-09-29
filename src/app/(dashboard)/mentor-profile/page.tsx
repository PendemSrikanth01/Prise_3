import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { MentorProfileEditor } from '@/components/mentors/MentorProfileEditor';
import { requireSession } from '@/lib/auth';
import { mentorCoordinationAndEngagement } from '@/lib/mentor-coordination';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MyMentorProfilePage() {
  const auth = await requireSession();
  if (auth.user.role !== Role.MENTOR) redirect(auth.user.role === Role.PROGRAM_LEAD || auth.user.role === Role.PROGRAM_TEAM ? '/mentors' : '/');
  const [mentor, coordinationData] = await Promise.all([
    prisma.person.findUniqueOrThrow({
      where: { id: auth.user.id },
      select: {
        id: true, name: true, email: true, phone: true, organization: true, designation: true, professionalBio: true,
        professionalDomain: true, mentorLocation: true, mentoringFrequency: true, linkedinUrl: true,
        expertiseAreas: true, preferredSectors: true, languages: true, maxStartupCapacity: true, acceptingMentees: true,
        yearsExperience: true, profilePhotoKey: true,
        availabilityPublishedAt: true,
        mentorAvailability: { where: { isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }], select: { id: true, dayOfWeek: true, startMinute: true, endMinute: true, mode: true } },
        _count: { select: { assignments: { where: { role: 'MENTOR' } } } },
      },
    }),
    mentorCoordinationAndEngagement(auth.user.id),
  ]);
  return <MentorProfileEditor mentor={mentor} canEdit coordination={coordinationData.coordination} engagement={coordinationData.engagement} />;
}
