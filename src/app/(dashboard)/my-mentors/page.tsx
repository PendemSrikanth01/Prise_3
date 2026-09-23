import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, GraduationCap, Mail } from 'lucide-react';
import { AssignmentRole, Role } from '@prisma/client';
import { notFound } from 'next/navigation';
import { requireSession, resolveFounderStartupId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MyMentorsPage() {
  const session = await requireSession();
  if (session.user.role !== Role.FOUNDER) notFound();
  const startupId = await resolveFounderStartupId(session.user);
  if (!startupId) notFound();

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: {
      name: true,
      assignments: {
        where: { role: AssignmentRole.MENTOR, person: { isActive: true } },
        orderBy: { createdAt: 'asc' },
        select: { person: { select: {
          id: true, name: true, email: true, organization: true, designation: true,
          professionalBio: true, professionalDomain: true, mentorLocation: true,
          mentoringFrequency: true, linkedinUrl: true, expertiseAreas: true,
          languages: true, yearsExperience: true, profilePhotoKey: true,
        } } },
      },
    },
  });
  if (!startup) notFound();

  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
    <div>
      <div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Confirmed assignments</div>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">My Mentors</h1>
      <p className="mt-1.5 text-sm text-prise-text-secondary">Mentors confirmed by the PrISE program team for {startup.name}. Contact them to coordinate your mentoring work and first meeting.</p>
    </div>

    {startup.assignments.length ? <div className="mt-6 grid gap-5 md:grid-cols-2">{startup.assignments.map(({ person: mentor }) => {
      const emailSubject = encodeURIComponent(`PrISE 3.0 mentoring — ${startup.name}`);
      return <article key={mentor.id} className="flex flex-col rounded-card border bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-purple-bg text-sm font-bold text-accent-purple">
            {mentor.profilePhotoKey ? <Image src={`/api/mentor-photo/${mentor.id}`} alt={`${mentor.name} profile`} fill sizes="56px" className="object-cover" unoptimized /> : mentor.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
          </div>
          <div className="min-w-0"><h2 className="truncate text-lg font-bold">{mentor.name}</h2><p className="mt-0.5 text-sm text-prise-text-secondary">{[mentor.designation, mentor.organization].filter(Boolean).join(' · ') || 'PrISE mentor'}</p></div>
        </div>

        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
          <Fact label="Domain" value={mentor.professionalDomain || 'Not added'} />
          <Fact label="Location" value={mentor.mentorLocation || 'Not added'} />
          <Fact label="Mentoring" value={mentor.mentoringFrequency || 'Flexible / As required'} />
          <Fact label="Experience" value={mentor.yearsExperience === null ? 'Not added' : `${mentor.yearsExperience} years`} />
        </div>
        {mentor.expertiseAreas.length ? <div className="mt-4 flex flex-wrap gap-1.5">{mentor.expertiseAreas.map((item) => <span key={item} className="rounded-pill bg-prise-page px-2.5 py-1 text-[11px] font-semibold">{item}</span>)}</div> : null}
        {mentor.professionalBio ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-prise-text-secondary">{mentor.professionalBio}</p> : null}

        <div className="mt-auto flex flex-wrap gap-2 border-t pt-5">
          <a href={`mailto:${mentor.email}?subject=${emailSubject}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white"><Mail size={16} />Email mentor</a>
          <Link href={`/mentors/${mentor.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button border px-4 text-sm font-semibold text-prise-primary"><GraduationCap size={16} />View profile</Link>
          {mentor.linkedinUrl ? <a href={mentor.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button border px-4 text-sm font-semibold text-prise-primary"><ExternalLink size={15} />LinkedIn</a> : null}
        </div>
      </article>;
    })}</div> : <section className="mt-6 rounded-card border border-dashed bg-white p-10 text-center shadow-card">
      <GraduationCap size={28} className="mx-auto text-prise-text-muted" />
      <h2 className="mt-3 font-semibold">No mentor confirmed yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-prise-text-secondary">Your submitted preferences remain visible to the program team. Confirmed mentors will appear here after the final mapping is saved.</p>
      <Link href="/directory?view=mentors" className="mt-4 inline-flex text-sm font-semibold text-prise-primary">Review mentor directory →</Link>
    </section>}
  </div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-prise-page p-3"><div className="text-xs text-prise-text-muted">{label}</div><div className="mt-1 font-semibold">{value}</div></div>;
}
