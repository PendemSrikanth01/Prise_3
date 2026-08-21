import { Building2, MapPin, Search } from 'lucide-react';
import { Role, StartupStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
type SearchParams = Promise<{ q?: string }>;

export default async function StartupDirectoryPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await requireSession();
  if (auth.user.role !== Role.MENTOR) redirect('/startups');
  const { q = '' } = await searchParams;
  const search = q.trim();
  const startups = await prisma.startup.findMany({
    where: {
      status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] },
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sector: { contains: search, mode: 'insensitive' } }, { state: { contains: search, mode: 'insensitive' } }] } : {}),
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, founderName: true, sector: true, state: true, operationLocation: true, legalStructure: true, assignments: { where: { personId: auth.user.id, role: 'MENTOR' }, select: { id: true }, take: 1 } },
  });
  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Mentor discovery</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Startup directory</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Basic cohort profiles for context. Working data stays private to assigned mentors.</p></div><form className="flex h-11 w-full items-center gap-2 rounded-pill border bg-white px-4 sm:w-80"><Search size={16} className="text-prise-text-muted" /><input name="q" defaultValue={search} placeholder="Search startup, sector or state" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></form></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{startups.map((startup) => <article key={startup.id} className="rounded-card border bg-white p-5 shadow-card"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple-bg text-accent-purple"><Building2 size={19} /></div>{startup.assignments.length ? <span className="rounded-pill bg-success-bg px-2.5 py-1 text-[11px] font-semibold text-success">Assigned to you</span> : <span className="rounded-pill bg-prise-page px-2.5 py-1 text-[11px] font-semibold text-prise-text-secondary">Basic profile</span>}</div><h2 className="mt-4 text-base font-bold">{startup.name}</h2><p className="mt-1 text-sm text-prise-text-secondary">{startup.sector || 'Sector not added'} · {startup.legalStructure || 'Structure not added'}</p><div className="mt-4 border-t pt-4 text-xs leading-5 text-prise-text-secondary"><div>Founder: <span className="font-semibold text-prise-text">{startup.founderName}</span></div><div className="mt-1 flex items-center gap-1.5"><MapPin size={13} />{startup.operationLocation || startup.state || 'Location not added'}</div></div>{startup.assignments.length ? <a href={`/startups/${startup.id}`} className="mt-4 inline-flex text-sm font-semibold text-prise-primary">Open assigned workspace →</a> : null}</article>)}{startups.length === 0 ? <div className="rounded-card border border-dashed p-10 text-center text-sm text-prise-text-secondary sm:col-span-2 lg:col-span-3">No startups match this search.</div> : null}</div>
  </div>;
}
