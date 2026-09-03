import { redirect } from 'next/navigation';
import { AssignmentRole, Role, StartupStatus } from '@prisma/client';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MentorMappingMatrix } from '@/components/directory/MentorMappingMatrix';

export const dynamic = 'force-dynamic';

export default async function MentorMappingPage() {
  const session = await requireSession();

  // Restrict to Program Lead and Program Team
  if (session.user.role !== Role.PROGRAM_LEAD && session.user.role !== Role.PROGRAM_TEAM) {
    redirect('/directory');
  }

  const [mentors, startups, preferences, mentorAssignments] = await Promise.all([
    prisma.person.findMany({
      where: { role: Role.MENTOR, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        organization: true,
        designation: true,
        professionalDomain: true,
        mentorLocation: true,
        expertiseAreas: true,
      },
    }),
    prisma.startup.findMany({
      where: { status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] } },
      orderBy: [{ sNo: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        founderName: true,
        sector: true,
        operationLocation: true,
        state: true,
      },
    }),
    prisma.mentorMatchPreference.findMany({
      include: {
        mentor: { select: { id: true, name: true } },
        startup: { select: { id: true, name: true } },
      },
      orderBy: [{ source: 'asc' }, { rank: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.startupAssignment.findMany({
      where: { role: AssignmentRole.MENTOR },
      select: { startupId: true, personId: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8">
      <MentorMappingMatrix
        mentors={mentors}
        startups={startups}
        preferences={preferences}
        assignments={mentorAssignments}
      />
    </div>
  );
}
