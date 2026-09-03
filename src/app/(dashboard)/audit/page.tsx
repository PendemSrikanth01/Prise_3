import Link from 'next/link';
import { requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
type SearchParams = Promise<{ startupId?: string; entityType?: string }>;

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission('audit:view');
  const { startupId, entityType } = await searchParams;
  const [events, startups] = await Promise.all([
    prisma.activityLog.findMany({ where: { startupId: startupId || undefined, entityType: entityType || undefined, OR: [{ actorId: null }, { actor: { isActive: true } }] }, orderBy: { createdAt: 'desc' }, take: 200, include: { actor: { select: { name: true } }, startup: { select: { name: true } } } }),
    prisma.startup.findMany({ where: { NOT: { name: { startsWith: 'Deleted startup ' } } }, orderBy: { sNo: 'asc' }, select: { id: true, name: true } }),
  ]);
  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8"><div><div className="inline-flex rounded-pill bg-accent-purple-bg px-3 py-1 text-xs font-semibold text-accent-purple">Append-only operational evidence</div><h1 className="mt-3 text-2xl font-bold tracking-tight">Audit history</h1><p className="mt-2 text-sm text-prise-text-secondary">Latest 200 recorded mutations with actor-role snapshots.</p></div><form className="mt-6 grid gap-3 rounded-card border bg-white p-4 shadow-card sm:grid-cols-[1fr_220px_auto]"><select name="startupId" defaultValue={startupId ?? ''} className="h-11 rounded-input border bg-white px-3 text-sm"><option value="">All startups</option>{startups.map((startup) => <option key={startup.id} value={startup.id}>{startup.name}</option>)}</select><select name="entityType" defaultValue={entityType ?? ''} className="h-11 rounded-input border bg-white px-3 text-sm"><option value="">All record types</option>{['Startup','OnboardingItem','Milestone','Task','PaymentInstallment','SupportRequest','Person'].map((value) => <option key={value}>{value}</option>)}</select><button className="rounded-button bg-prise-sidebar px-4 text-sm font-semibold text-white">Filter</button></form><div className="mt-5 overflow-hidden rounded-card border bg-white shadow-card"><div className="divide-y">{events.map((event) => <div key={event.id} className="grid gap-2 px-5 py-4 md:grid-cols-[150px_1fr_220px]"><div className="text-xs text-prise-text-muted">{event.createdAt.toLocaleString('en-IN')}</div><div><div className="text-sm font-semibold">{event.summary}</div><div className="mt-1 text-xs text-prise-text-secondary">{event.entityType} · {event.action.replaceAll('_', ' ')}</div></div><div className="text-xs text-prise-text-secondary md:text-right"><div>{event.actor?.name ?? 'System'} · {(event.actorRole ?? 'SYSTEM').replaceAll('_', ' ').toLowerCase()}</div>{event.startup ? <Link className="mt-1 inline-block text-prise-primary" href={`/startups/${event.startupId}`}>{event.startup.name}</Link> : null}</div></div>)}{events.length === 0 ? <div className="p-12 text-center text-sm text-prise-text-secondary">No events match this view.</div> : null}</div></div></div>;
}
