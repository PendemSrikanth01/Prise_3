import { Role } from '@prisma/client';
import { notFound } from 'next/navigation';
import { MentorProfileEditor } from '@/components/mentors/MentorProfileEditor';
import { isProgramRole, requireSession } from '@/lib/auth';
import { mentorCoordinationAndEngagement } from '@/lib/mentor-coordination';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ProgramMentorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  const { id } = await params;
  const mentor = await prisma.person.findFirst({
    where: { id, role: Role.MENTOR },
    select: {
      id: true, name: true, email: true, phone: true, organization: true, designation: true, professionalBio: true,
      professionalDomain: true, mentorLocation: true, mentoringFrequency: true, linkedinUrl: true,
      expertiseAreas: true, preferredSectors: true, languages: true, maxStartupCapacity: true, acceptingMentees: true,
      yearsExperience: true, profilePhotoKey: true,
      availabilityPublishedAt: true,
      mentorAvailability: { where: { isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }], select: { id: true, dayOfWeek: true, startMinute: true, endMinute: true, mode: true } },
      _count: { select: { assignments: { where: { role: 'MENTOR' } } } },
    },
  });
  if (!mentor) notFound();
  const canViewCoordination = auth.user.id === mentor.id || isProgramRole(auth.user.role);
  const coordinationData = canViewCoordination ? await mentorCoordinationAndEngagement(mentor.id) : null;
  return <MentorProfileEditor mentor={mentor} canEdit={canViewCoordination} coordination={coordinationData?.coordination} engagement={coordinationData?.engagement} />;
}
