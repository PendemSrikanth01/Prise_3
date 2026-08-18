import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';
import { MilestoneStatus, Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const session = await requireSession();
  if (session.user.role !== Role.INVESTOR) redirect('/startups');
  const shares = await prisma.investorStartupShare.findMany({
    where: { investorId: session.user.id },
    orderBy: { startup: { name: 'asc' } },
    include: { startup: { select: { id: true, name: true, sector: true, state: true, operationLocation: true, healthStatus: true, milestones: { where: { status: MilestoneStatus.APPROVED }, select: { id: true } } } } },
  });
  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8"><div className="flex items-center gap-3"><div className="rounded-xl bg-accent-purple-bg p-3 text-accent-purple"><Building2 size={22} /></div><div><h1 className="text-2xl font-bold tracking-tight">Shared portfolio</h1><p className="mt-1 text-sm text-prise-text-secondary">Only startups explicitly shared with your account appear here.</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-2">{shares.map(({ startup, canViewDocuments }) => <Link key={startup.id} href={`/startups/${startup.id}`} className="rounded-card border bg-white p-5 shadow-card transition hover:border-prise-primary/30"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{startup.name}</h2><p className="mt-1 text-sm text-prise-text-secondary">{startup.sector || 'Sector not specified'} · {startup.operationLocation || startup.state || 'Location not specified'}</p></div><ArrowRight size={18} className="text-prise-primary" /></div><p className="mt-4 line-clamp-2 text-sm leading-6 text-prise-text-secondary">{startup.healthStatus || 'Program-approved startup summary will appear here.'}</p><div className="mt-4 flex gap-3 text-xs font-semibold text-prise-primary"><span>{startup.milestones.length} approved milestones</span><span>·</span><span>{canViewDocuments ? 'Approved files shared' : 'Files private'}</span></div></Link>)}{shares.length === 0 ? <div className="rounded-card border border-dashed p-12 text-center text-sm text-prise-text-secondary md:col-span-2">No startups have been shared with this investor account.</div> : null}</div></div>;
}
