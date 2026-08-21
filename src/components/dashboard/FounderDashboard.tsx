import Link from 'next/link';
import { CalendarDays, ChevronRight, CircleAlert, FileCheck2, LifeBuoy, ListChecks, Target } from 'lucide-react';
import { DeliverableStatus, MilestoneStatus, PaymentStatus, SessionStatus, SessionType, SupportRequestStatus, TaskStatus, type Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type FounderUser = { id: string; name: string; role: Role; founderOfStartupId: string | null };

export async function FounderDashboard({ user }: { user: FounderUser }) {
  if (!user.founderOfStartupId) return <EmptyFounder />;
  const now = new Date();
  const startup = await prisma.startup.findUnique({
    where: { id: user.founderOfStartupId },
    include: {
      milestones: { include: { _count: { select: { deliverables: true } } }, orderBy: [{ phase: 'asc' }, { dueDate: 'asc' }] },
      tasks: { where: { status: { not: TaskStatus.DONE } }, orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }], take: 5 },
      supportRequests: { where: { status: { in: [SupportRequestStatus.OPEN, SupportRequestStatus.ASSIGNED, SupportRequestStatus.IN_PROGRESS] } }, orderBy: { createdAt: 'desc' }, take: 3 },
      paymentInstallments: { where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] } }, orderBy: { dueDate: 'asc' }, take: 1 },
      sessions: { where: { type: { not: SessionType.WORKSHOP }, status: SessionStatus.SCHEDULED, startsAt: { gte: now } }, orderBy: { startsAt: 'asc' }, take: 1 },
    },
  });
  if (!startup) return <EmptyFounder />;
  const approved = startup.milestones.filter((item) => item.status === MilestoneStatus.APPROVED).length;
  const progress = startup.milestones.length ? Math.round((approved / startup.milestones.length) * 100) : 0;
  const nextMilestone = startup.milestones.find((item) => item.status !== MilestoneStatus.APPROVED);
  const waitingReview = await prisma.deliverable.count({ where: { milestone: { startupId: startup.id }, status: DeliverableStatus.SUBMITTED } });
  const nextSession = startup.sessions[0];

  return <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold tracking-[-.025em] sm:text-[28px]">Good morning, {user.name.split(' ')[0]}</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Keep {startup.name} moving—one clear next action at a time.</p></div>{nextMilestone ? <Link href={`/startups/${startup.id}#milestones`} className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-prise-sidebar px-5 text-sm font-semibold text-white"><Target size={17} />Continue next milestone</Link> : null}</div>
    <section className="mt-6 rounded-card bg-prise-sidebar p-6 text-white shadow-card sm:p-7"><div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center"><div><div className="text-sm text-white/55">Your incubation progress</div><h2 className="mt-2 text-2xl font-bold">{startup.name}</h2><p className="mt-2 text-sm text-white/65">{nextMilestone ? `Next: ${nextMilestone.title}` : 'All assigned milestones are approved.'}</p></div><div><div className="flex items-end justify-between"><span className="text-3xl font-bold">{progress}%</span><span className="text-xs text-white/55">{approved} of {startup.milestones.length} approved</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12"><div className="h-full rounded-full bg-[#52d58b]" style={{ width: `${progress}%` }} /></div></div></div></section>
    <div className="mt-5 grid overflow-hidden rounded-card border bg-white shadow-card sm:grid-cols-3"><Metric icon={ListChecks} value={startup.tasks.length} label="Open tasks" /><Metric icon={FileCheck2} value={waitingReview} label="Awaiting review" /><Metric icon={LifeBuoy} value={startup.supportRequests.length} label="Support requests" /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
      <div className="space-y-5"><Panel title="Next actions" href="/work">{startup.tasks.length ? startup.tasks.map((task) => <Link key={task.id} href="/work" className="grid gap-2 border-t px-5 py-4 first:border-t-0 sm:grid-cols-[1fr_140px_20px] sm:items-center"><div><div className="text-sm font-semibold">{task.title}</div><div className="mt-1 text-xs text-prise-text-secondary">{task.status.replaceAll('_', ' ').toLowerCase()}</div></div><div className="text-xs text-prise-text-secondary">{task.dueDate ? `Due ${task.dueDate.toLocaleDateString('en-IN')}` : 'No due date'}</div><ChevronRight size={16} /></Link>) : <Empty text="No open tasks." />}</Panel><Panel title="Milestone plan" href="/my-milestones">{startup.milestones.slice(0, 4).map((item) => <Link key={item.id} href="/my-milestones" className="grid gap-3 border-t px-5 py-4 first:border-t-0 sm:grid-cols-[70px_1fr_150px] sm:items-center"><div className="text-xs font-semibold text-prise-primary">Phase {item.phase}</div><div><div className="text-sm font-semibold">{item.title}</div><div className="mt-1 text-xs text-prise-text-secondary">{item._count.deliverables} evidence file(s)</div></div><span className="w-fit rounded-pill bg-prise-page px-2.5 py-1 text-xs font-semibold">{item.status.replaceAll('_', ' ').toLowerCase()}</span></Link>)}</Panel></div>
      <div className="space-y-5"><Panel title="Next mentor session" href="/sessions">{nextSession ? <div className="px-5 py-5"><div className="flex items-center gap-2 text-xs font-semibold text-prise-primary"><CalendarDays size={15} />{nextSession.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</div><div className="mt-2 text-sm font-semibold">{nextSession.title}</div>{nextSession.meetingUrl ? <a href={nextSession.meetingUrl} className="mt-4 inline-flex text-sm font-semibold text-prise-primary">Open meeting link →</a> : null}</div> : <Empty text="No session scheduled." />}</Panel><Panel title="Payment position" href="/payments">{startup.paymentInstallments[0] ? <div className="px-5 py-5"><div className="text-2xl font-bold">₹{Number(startup.paymentInstallments[0].amount).toLocaleString('en-IN')}</div><div className="mt-1 text-sm text-prise-text-secondary">Due {startup.paymentInstallments[0].dueDate.toLocaleDateString('en-IN')}</div></div> : <Empty text="No payment currently due." />}</Panel></div>
    </div>
  </div>;
}

function Metric({ icon: Icon, value, label }: { icon: typeof ListChecks; value: number; label: string }) { return <div className="flex items-center justify-center gap-4 border-t px-5 py-6 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"><Icon size={22} className="text-success" /><div><div className="text-2xl font-bold">{value}</div><div className="text-sm text-prise-text-secondary">{label}</div></div></div>; }
function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-card border bg-white shadow-card"><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">{title}</h2><Link href={href} className="text-xs font-semibold text-prise-primary">View all</Link></div>{children}</section>; }
function Empty({ text }: { text: string }) { return <div className="px-5 py-8 text-center text-sm text-prise-text-secondary"><CircleAlert size={18} className="mx-auto mb-2 text-prise-text-muted" />{text}</div>; }
function EmptyFounder() { return <div className="mx-auto max-w-2xl p-8"><div className="rounded-card border border-warning/20 bg-warning-bg p-6"><h1 className="text-xl font-bold">Startup access is not connected yet</h1><p className="mt-2 text-sm text-prise-text-secondary">Ask the Program Lead to connect this founder account to a startup.</p></div></div>; }
