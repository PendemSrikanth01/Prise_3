import Link from 'next/link';
import { TaskStatus, SupportRequestStatus, Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function WorkPage() {
  const session = await requireSession();
  if (session.user.role === Role.INVESTOR) redirect('/portfolio');
  const scope = accessibleStartupWhere(session.user);
  const [tasks, requests] = await Promise.all([
    prisma.task.findMany({ where: { startup: scope }, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }], take: 100, include: { startup: { select: { id: true, name: true } }, assignee: { select: { name: true } } } }),
    prisma.supportRequest.findMany({ where: { startup: scope }, orderBy: { createdAt: 'desc' }, take: 100, include: { startup: { select: { id: true, name: true } }, assignedTo: { select: { name: true } } } }),
  ]);
  const openTasks = tasks.filter((task) => task.status !== TaskStatus.DONE).length;
  const closedRequestStatuses = new Set<SupportRequestStatus>([SupportRequestStatus.RESOLVED, SupportRequestStatus.CANCELLED]);
  const openRequests = requests.filter((request) => !closedRequestStatuses.has(request.status)).length;
  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8"><h1 className="text-2xl font-bold tracking-tight">Work queue</h1><p className="mt-2 text-sm text-prise-text-secondary">The smallest actionable view across milestones, tasks and support.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><Metric value={openTasks} label="Open tasks" /><Metric value={openRequests} label="Open support requests" /></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><List title="Tasks">{tasks.map((task) => <Link key={task.id} href={`/startups/${task.startup?.id}`} className="block border-b px-5 py-4 last:border-0 hover:bg-prise-page"><div className="flex justify-between gap-3"><div className="text-sm font-semibold">{task.title}</div><Tag value={task.status} /></div><div className="mt-1 text-xs text-prise-text-secondary">{task.startup?.name}{task.assignee ? ` · ${task.assignee.name}` : ''}{task.dueDate ? ` · due ${task.dueDate.toLocaleDateString('en-IN')}` : ''}</div></Link>)}</List><List title="Support requests">{requests.map((request) => <Link key={request.id} href={`/startups/${request.startup.id}`} className="block border-b px-5 py-4 last:border-0 hover:bg-prise-page"><div className="flex justify-between gap-3"><div className="text-sm font-semibold">{request.title}</div><Tag value={request.status} /></div><div className="mt-1 text-xs text-prise-text-secondary">{request.startup.name}{request.assignedTo ? ` · ${request.assignedTo.name}` : ' · unassigned'}</div></Link>)}</List></div></div>;
}
function Metric({ value, label }: { value: number; label: string }) { return <div className="rounded-card border bg-white p-5 shadow-card"><div className="text-3xl font-bold">{value}</div><div className="mt-1 text-sm text-prise-text-secondary">{label}</div></div>; }
function List({ title, children }: { title: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-card border bg-white shadow-card"><div className="border-b bg-prise-page px-5 py-4 font-semibold">{title}</div>{children}</section>; }
function Tag({ value }: { value: string }) { return <span className="rounded-pill bg-prise-page px-2 py-1 text-[10px] font-semibold text-prise-text-secondary">{value.replaceAll('_', ' ').toLowerCase()}</span>; }
