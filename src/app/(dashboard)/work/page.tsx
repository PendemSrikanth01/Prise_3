import Link from 'next/link';
import { MessageCircle, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Prisma, Priority, Role, StartupMemberRole, TaskStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { addTaskCommentAction } from '@/app/actions/collaboration';
import { deleteTaskAction, updateTaskAction } from '@/app/actions/workflows';
import { TaskCreateForm } from '@/components/work/TaskCreateForm';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { accessibleStartupWhere, canDeleteTaskRecord, canEditTaskRecord, hasStartupPermission, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Disclosure } from '@/components/ui/Disclosure';

export const dynamic = 'force-dynamic';
type SearchParams = Promise<{ status?: string; scope?: string; q?: string }>;
const input = 'h-10 w-full rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';

export default async function WorkPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (session.user.role === Role.INVESTOR) redirect('/portfolio');
  const { status = 'OPEN', scope: taskScope = 'ALL', q = '' } = await searchParams;
  const startupScope = accessibleStartupWhere(session.user);
  const where: Prisma.TaskWhereInput = { startup: startupScope };
  if (status === 'OPEN') where.status = { not: TaskStatus.DONE };
  else if (Object.values(TaskStatus).includes(status as TaskStatus)) where.status = status as TaskStatus;
  if (taskScope === 'MINE') where.assigneeId = session.user.id;
  if (taskScope === 'UNASSIGNED') where.assigneeId = null;
  if (taskScope === 'OVERDUE') { where.status = { not: TaskStatus.DONE }; where.dueDate = { lt: new Date() }; }
  if (q.trim()) where.OR = [{ title: { contains: q.trim(), mode: 'insensitive' } }, { startup: { name: { contains: q.trim(), mode: 'insensitive' } } }];

  const [tasks, startups, programPeople, openCount, blockedCount, overdueCount] = await Promise.all([
    prisma.task.findMany({ where, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }], take: 100, include: { startup: { select: { id: true, name: true } }, milestone: { select: { id: true, title: true } }, assignee: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } }, comments: { orderBy: { createdAt: 'asc' }, take: 50, include: { author: { select: { name: true, role: true } } } } } }),
    prisma.startup.findMany({ where: startupScope, orderBy: { name: 'asc' }, select: { id: true, name: true, milestones: { where: { status: { not: 'NA' } }, orderBy: [{ phase: 'asc' }, { title: 'asc' }], select: { id: true, title: true } }, memberships: { where: { isActive: true, person: { isActive: true } }, select: { personId: true, role: true, person: { select: { id: true, name: true, role: true } } } }, assignments: { where: { person: { isActive: true } }, select: { person: { select: { id: true, name: true, role: true } } } }, founder: { select: { id: true, name: true, role: true } } } }),
    prisma.person.findMany({ where: { isActive: true, role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] } }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true } }),
    prisma.task.count({ where: { startup: startupScope, status: { not: TaskStatus.DONE } } }),
    prisma.task.count({ where: { startup: startupScope, status: TaskStatus.BLOCKED } }),
    prisma.task.count({ where: { startup: startupScope, status: { not: TaskStatus.DONE }, dueDate: { lt: new Date() } } }),
  ]);

  const startupOptions = startups.map((startup) => {
    const people = new Map<string, { id: string; name: string; role: string }>();
    for (const person of programPeople) people.set(person.id, person);
    if (startup.founder) people.set(startup.founder.id, startup.founder);
    for (const membership of startup.memberships) people.set(membership.person.id, membership.person);
    for (const assignment of startup.assignments) people.set(assignment.person.id, assignment.person);
    return { id: startup.id, name: startup.name, milestones: startup.milestones, people: [...people.values()] };
  });
  const createOptions = startupOptions.filter((startup) => {
    if (session.user.role !== Role.FOUNDER) return true;
    const source = startups.find((item) => item.id === startup.id);
    const membershipRole = source?.memberships.find((membership) => membership.personId === session.user.id)?.role ?? (session.user.founderOfStartupId === startup.id ? StartupMemberRole.OWNER : null);
    return hasStartupPermission(session.user.role, 'task:manage', membershipRole);
  });

  return <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Execution workspace</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Tasks</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Create, assign, discuss and finish the work that moves each startup forward.</p></div><Link href="/tickets" className="inline-flex h-11 items-center justify-center gap-2 rounded-button border bg-white px-4 text-sm font-semibold text-prise-primary"><MessageCircle size={17} />Need help? Raise ticket</Link></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric value={openCount} label="Open" /><Metric value={blockedCount} label="Blocked" tone={blockedCount ? 'danger' : undefined} /><Metric value={overdueCount} label="Overdue" tone={overdueCount ? 'warning' : undefined} /></div>
    <Disclosure className="mt-5 rounded-card border bg-white shadow-card" summaryClassName="p-5 font-semibold text-prise-primary" contentClassName="border-t p-5" summary={<span className="flex items-center gap-2"><Plus size={17} />Create task</span>}><TaskCreateForm startups={createOptions} currentUserId={session.user.id} /></Disclosure>
    <form className="mt-5 grid gap-3 rounded-card border bg-white p-4 shadow-card md:grid-cols-[1fr_190px_190px_auto]"><label className="relative"><Search size={16} className="absolute left-3 top-3 text-prise-text-muted" /><input name="q" defaultValue={q} placeholder="Search task or startup" className={`${input} pl-9`} /></label><select name="status" defaultValue={status} className={input} aria-label="Task status filter"><option value="OPEN">All open</option>{Object.values(TaskStatus).map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}</select><select name="scope" defaultValue={taskScope} className={input} aria-label="Task ownership filter"><option value="ALL">Everyone</option><option value="MINE">Assigned to me</option><option value="UNASSIGNED">Unassigned</option><option value="OVERDUE">Overdue</option></select><button className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-prise-sidebar px-4 text-sm font-semibold text-white"><SlidersHorizontal size={15} />Apply</button></form>
    <div className="mt-5 space-y-3">{tasks.map((task) => {
      if (!task.startupId || !task.startup) return null;
      const startup = startups.find((item) => item.id === task.startupId);
      const option = startupOptions.find((item) => item.id === task.startupId);
      const memberRole = startup?.memberships.find((membership) => membership.personId === session.user.id)?.role ?? (session.user.founderOfStartupId === task.startupId ? StartupMemberRole.OWNER : null);
      const canComment = hasStartupPermission(session.user.role, 'task:manage', memberRole);
      const canEdit = canEditTaskRecord(session.user, task);
      const canChangeDefinition = session.user.role === Role.PROGRAM_LEAD || session.user.role === Role.PROGRAM_TEAM || task.createdById === session.user.id;
      const taskSummary = <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{task.title}</h2><TaskBadge status={task.status} /></div><div className="mt-1 text-xs text-prise-text-secondary">{task.startup.name}{task.milestone ? ` · ${task.milestone.title}` : ''} · {task.assignee?.name ?? 'Unassigned'}{task.dueDate ? ` · due ${task.dueDate.toLocaleDateString('en-IN')}` : ''}</div></div><div className="flex items-center gap-2 text-xs text-prise-text-secondary"><MessageCircle size={14} />{task.comments.length} message{task.comments.length === 1 ? '' : 's'}</div></div>;
      return <Disclosure key={task.id} className="overflow-hidden rounded-card border bg-white shadow-card" summaryClassName="px-5 py-4" contentClassName="grid gap-5 border-t p-5 xl:grid-cols-[minmax(0,1fr)_380px]" summary={taskSummary}><div><div className="text-sm font-semibold">Discussion</div><div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">{task.comments.map((comment) => <div key={comment.id} className="rounded-xl bg-prise-page p-3"><div className="flex justify-between gap-3 text-[11px] text-prise-text-muted"><span className="font-semibold text-prise-text-secondary">{comment.author?.name ?? 'Former user'} · {comment.author?.role.replaceAll('_', ' ').toLowerCase() ?? 'account removed'}</span><time>{comment.createdAt.toLocaleString('en-IN')}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.body}</p></div>)}{task.comments.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-prise-text-secondary">No discussion yet. Add the context someone needs to complete this task.</p> : null}</div>{canComment ? <form action={addTaskCommentAction} className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="hidden" name="taskId" value={task.id} /><textarea name="body" required maxLength={3000} rows={2} placeholder="Add a clear update or question" className="min-h-11 flex-1 rounded-input border p-3 text-sm" /><SubmitButton className="self-end">Send</SubmitButton></form> : null}</div>
          <div className="space-y-3"><div className="text-sm font-semibold">Task details</div>{task.description ? <p className="rounded-xl bg-prise-page p-3 text-sm text-prise-text-secondary">{task.description}</p> : null}{canEdit ? <form action={updateTaskAction} className="grid gap-2"><input type="hidden" name="taskId" value={task.id} />{canChangeDefinition ? <><input name="title" defaultValue={task.title} required className={input} /><select name="assigneeId" defaultValue={task.assigneeId ?? ''} className={input}><option value="">Unassigned</option>{option?.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><select name="priority" defaultValue={task.priority} className={input}>{Object.values(Priority).map((value) => <option key={value}>{value}</option>)}</select><input name="dueDate" type="date" defaultValue={dateValue(task.dueDate)} className={input} /><textarea name="description" defaultValue={task.description ?? ''} rows={2} className="rounded-input border p-3 text-sm" placeholder="Definition of done" /></> : null}<select name="status" defaultValue={task.status} className={input}>{Object.values(TaskStatus).map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}</select><input name="blockedReason" defaultValue={task.blockedReason ?? ''} placeholder="Blocked reason, if applicable" className={input} /><SubmitButton>Save task</SubmitButton></form> : <p className="text-sm text-prise-text-secondary">Only the creator, assignee or program team can change this task.</p>}{canDeleteTaskRecord(session.user, task) ? <form action={deleteTaskAction}><input type="hidden" name="taskId" value={task.id} /><ConfirmButton message="Delete this task? Its activity will remain in the audit history.">Delete task</ConfirmButton></form> : null}<Link href={`/startups/${task.startupId}#milestones`} className="inline-block text-sm font-semibold text-prise-primary">Open Startup 360 →</Link></div>
      </Disclosure>;
    })}{tasks.length === 0 ? <div className="rounded-card border border-dashed p-12 text-center text-sm text-prise-text-secondary">No tasks match these filters.</div> : null}</div>
  </div>;
}

function Metric({ value, label, tone }: { value: number; label: string; tone?: 'danger' | 'warning' }) { return <div className="rounded-card border bg-white p-5 shadow-card"><div className={`text-3xl font-bold ${tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : ''}`}>{value}</div><div className="mt-1 text-sm text-prise-text-secondary">{label}</div></div>; }
function TaskBadge({ status }: { status: TaskStatus }) { const tone = status === TaskStatus.DONE ? 'bg-success-bg text-success' : status === TaskStatus.BLOCKED ? 'bg-danger-bg text-danger' : status === TaskStatus.IN_PROGRESS ? 'bg-warning-bg text-warning' : 'bg-prise-page text-prise-text-secondary'; return <span className={`rounded-pill px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{status.replaceAll('_', ' ').toLowerCase()}</span>; }
function dateValue(value: Date | null) { return value ? value.toISOString().slice(0, 10) : ''; }
