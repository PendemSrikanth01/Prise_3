import Link from 'next/link';
import { LockKeyhole, MessageCircle, UsersRound } from 'lucide-react';
import { Priority, Role, StartupMemberRole, SupportAudience, SupportRequestStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { addSupportMessageAction, updateSupportAudienceAction } from '@/app/actions/collaboration';
import { deleteSupportAction, updateSupportAction } from '@/app/actions/workflows';
import { SupportCreateForm } from '@/components/support/SupportCreateForm';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { accessibleStartupWhere, hasPermission, hasStartupPermission, requireSession } from '@/lib/auth';
import { canDeleteSupportRequest, supportAudienceLabel } from '@/lib/collaboration-policy';
import { prisma } from '@/lib/prisma';
import { accessibleSupportWhere } from '@/lib/support-access';

export const dynamic = 'force-dynamic';
type SearchParams = Promise<{ status?: string }>;
const input = 'h-10 w-full rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';
const OPEN_STATUSES = [SupportRequestStatus.OPEN, SupportRequestStatus.ASSIGNED, SupportRequestStatus.IN_PROGRESS];

export default async function SupportPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await requireSession();
  if (auth.user.role === Role.INVESTOR) redirect('/portfolio');
  const { status = 'OPEN' } = await searchParams;
  const startupScope = accessibleStartupWhere(auth.user);
  const canCreateByRole = hasPermission(auth.user.role, 'support:create');
  const canManage = hasPermission(auth.user.role, 'support:manage');
  const canAssignSupport = auth.user.role === Role.PROGRAM_LEAD || auth.user.role === Role.PROGRAM_TEAM;
  const requestWhere = accessibleSupportWhere(auth.user);
  if (status === 'OPEN') requestWhere.status = { in: OPEN_STATUSES };
  else if (Object.values(SupportRequestStatus).includes(status as SupportRequestStatus)) requestWhere.status = status as SupportRequestStatus;

  const [startups, requests, programPeople, openCount, urgentCount] = await Promise.all([
    prisma.startup.findMany({ where: startupScope, orderBy: { name: 'asc' }, select: { id: true, name: true, founder: { select: { id: true, name: true, role: true } }, memberships: { where: { isActive: true }, select: { personId: true, role: true, person: { select: { id: true, name: true, role: true } } } }, assignments: { select: { person: { select: { id: true, name: true, role: true } } } } } }),
    prisma.supportRequest.findMany({ where: requestWhere, orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }], take: 100, include: { startup: { select: { id: true, name: true } }, requestedBy: { select: { id: true, name: true, role: true } }, assignedTo: { select: { id: true, name: true } }, participants: { include: { person: { select: { id: true, name: true, role: true } } }, orderBy: { person: { name: 'asc' } } }, messages: { orderBy: { createdAt: 'asc' }, take: 100, include: { author: { select: { name: true, role: true } } } } } }),
    prisma.person.findMany({ where: { isActive: true, role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] } }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true } }),
    prisma.supportRequest.count({ where: { ...accessibleSupportWhere(auth.user), status: { in: OPEN_STATUSES } } }),
    prisma.supportRequest.count({ where: { ...accessibleSupportWhere(auth.user), status: { in: OPEN_STATUSES }, priority: Priority.HIGH } }),
  ]);

  const startupOptions = startups.map((startup) => {
    const people = new Map<string, { id: string; name: string; role: string }>();
    for (const person of programPeople) people.set(person.id, person);
    if (startup.founder) people.set(startup.founder.id, startup.founder);
    for (const membership of startup.memberships) people.set(membership.person.id, membership.person);
    for (const assignment of startup.assignments) people.set(assignment.person.id, assignment.person);
    return { id: startup.id, name: startup.name, people: [...people.values()] };
  });
  const createOptions = startupOptions.filter((startup) => {
    if (auth.user.role !== Role.FOUNDER) return canCreateByRole;
    const source = startups.find((item) => item.id === startup.id);
    const membershipRole = source?.memberships.find((membership) => membership.personId === auth.user.id)?.role ?? (auth.user.founderOfStartupId === startup.id ? StartupMemberRole.OWNER : null);
    return hasStartupPermission(auth.user.role, 'support:create', membershipRole);
  });

  return <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Private program help</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Tickets</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Raise a private request, discuss it with the right program people, and record the resolution.</p></div><Link href="/work" className="inline-flex h-11 items-center justify-center gap-2 rounded-button border bg-white px-4 text-sm font-semibold text-prise-primary"><UsersRound size={17} />Open execution work</Link></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2"><Metric value={openCount} label="Open conversations" /><Metric value={urgentCount} label="High priority" danger={urgentCount > 0} /></div>
    {createOptions.length ? <details className="mt-5 rounded-card border bg-white p-5 shadow-card"><summary className="cursor-pointer list-none font-semibold text-prise-primary">+ Raise ticket</summary><div className="mt-5"><SupportCreateForm startups={createOptions} /></div></details> : null}
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{Object.values(SupportRequestStatus).map((value) => <Link key={value} href={`/tickets?status=${value}`} className={`whitespace-nowrap rounded-pill px-3 py-2 text-xs font-semibold ${status === value ? 'bg-prise-sidebar text-white' : 'border bg-white text-prise-text-secondary'}`}>{value.replaceAll('_', ' ').toLowerCase()}</Link>)}</div>
    <div className="mt-4 space-y-3">{requests.map((request) => {
      const option = startupOptions.find((item) => item.id === request.startupId);
      const canChangeAudience = auth.user.role === Role.PROGRAM_LEAD || auth.user.role === Role.PROGRAM_TEAM || request.requestedById === auth.user.id;
      return <details key={request.id} className="overflow-hidden rounded-card border bg-white shadow-card"><summary className="cursor-pointer list-none px-5 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{request.title}</h2><Status value={request.status} /><PriorityBadge value={request.priority} /></div><div className="mt-1 text-xs text-prise-text-secondary">{request.startup.name} · requested by {request.requestedBy?.name ?? 'Former user'} · {request.assignedTo?.name ?? 'Unassigned'}</div></div><div className="flex items-center gap-3 text-xs text-prise-text-secondary"><span className="inline-flex items-center gap-1"><LockKeyhole size={13} />{supportAudienceLabel(request.audience)}</span><span className="inline-flex items-center gap-1"><MessageCircle size={13} />{request.messages.length}</span></div></div></summary>
        <div className="grid gap-5 border-t p-5 xl:grid-cols-[minmax(0,1fr)_400px]"><div><div className="text-sm font-semibold">Conversation</div>{request.description ? <p className="mt-3 rounded-xl border bg-[#fafafe] p-4 text-sm leading-6 text-prise-text-secondary">{request.description}</p> : null}<div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">{request.messages.map((message) => <div key={message.id} className={`rounded-xl p-3 ${message.authorId === auth.user.id ? 'ml-6 bg-accent-purple-bg' : 'mr-6 bg-prise-page'}`}><div className="flex justify-between gap-3 text-[11px] text-prise-text-muted"><span className="font-semibold text-prise-text-secondary">{message.author?.name ?? 'Former user'} · {message.author?.role.replaceAll('_', ' ').toLowerCase() ?? 'account removed'}</span><time>{message.createdAt.toLocaleString('en-IN')}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p></div>)}{request.messages.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-prise-text-secondary">No replies yet. Start with the exact help or decision needed.</p> : null}</div><form action={addSupportMessageAction} className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="hidden" name="requestId" value={request.id} /><textarea name="body" required maxLength={3000} rows={2} placeholder="Reply to this support conversation" className="min-h-11 flex-1 rounded-input border p-3 text-sm" /><SubmitButton className="self-end">Send</SubmitButton></form></div>
          <aside className="space-y-4"><section className="rounded-xl border p-4"><h3 className="text-sm font-semibold">Access</h3><p className="mt-1 text-xs text-prise-text-secondary">{supportAudienceLabel(request.audience)} · {request.participants.length} explicitly selected</p>{request.participants.length ? <div className="mt-3 flex flex-wrap gap-1.5">{request.participants.map(({ person }) => <span key={person.id} className="rounded-pill bg-prise-page px-2.5 py-1 text-[11px] font-semibold">{person.name}</span>)}</div> : null}{canChangeAudience ? <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-prise-primary">Change participants</summary><form action={updateSupportAudienceAction} className="mt-3 space-y-3"><input type="hidden" name="requestId" value={request.id} /><select name="audience" defaultValue={request.audience} className={input}>{Object.values(SupportAudience).map((value) => <option key={value} value={value}>{supportAudienceLabel(value)}</option>)}</select><fieldset className="max-h-44 overflow-y-auto rounded-xl bg-prise-page p-3"><legend className="px-1 text-[11px] font-semibold text-prise-text-secondary">Selected people</legend>{option?.people.map((person) => <label key={person.id} className="flex items-center gap-2 py-1.5 text-xs"><input type="checkbox" name="participantId" value={person.id} defaultChecked={request.participants.some((item) => item.personId === person.id)} />{person.name} · {person.role.replaceAll('_', ' ').toLowerCase()}</label>)}</fieldset><SubmitButton className="!py-2">Save access</SubmitButton></form></details> : null}</section>
            {canManage ? <section className="rounded-xl border p-4"><h3 className="text-sm font-semibold">Manage request</h3><form action={updateSupportAction} className="mt-3 grid gap-2"><input type="hidden" name="requestId" value={request.id} /><select name="status" defaultValue={request.status} className={input}>{Object.values(SupportRequestStatus).map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}</select>{canAssignSupport ? <><select name="assignedToId" defaultValue={request.assignedToId ?? ''} className={input}><option value="">Unassigned</option>{option?.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><input name="dueDate" type="date" defaultValue={dateValue(request.dueDate)} className={input} /></> : null}<textarea name="outcome" defaultValue={request.outcome ?? ''} rows={2} placeholder="Resolution or agreed outcome" className="rounded-input border p-3 text-sm" /><SubmitButton>Save request</SubmitButton></form></section> : null}
            <div><Link href={`/startups/${request.startupId}`} className="text-sm font-semibold text-prise-primary">Open Startup 360 →</Link>{canDeleteSupportRequest(auth.user.role) ? <form action={deleteSupportAction} className="mt-2"><input type="hidden" name="requestId" value={request.id} /><ConfirmButton message="Delete this support request? Its audit event will remain.">Delete request</ConfirmButton></form> : null}</div></aside></div>
      </details>;
    })}{requests.length === 0 ? <div className="rounded-card border border-dashed p-12 text-center text-sm text-prise-text-secondary">No tickets match this filter.</div> : null}</div>
  </div>;
}

function Metric({ value, label, danger }: { value: number; label: string; danger?: boolean }) { return <div className="rounded-card border bg-white p-5 shadow-card"><div className={`text-3xl font-bold ${danger ? 'text-danger' : ''}`}>{value}</div><div className="mt-1 text-sm text-prise-text-secondary">{label}</div></div>; }
function Status({ value }: { value: SupportRequestStatus }) { const tone = value === SupportRequestStatus.RESOLVED ? 'bg-success-bg text-success' : value === SupportRequestStatus.CANCELLED ? 'bg-prise-page text-prise-text-secondary' : 'bg-info-bg text-info'; return <span className={`rounded-pill px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{value.replaceAll('_', ' ').toLowerCase()}</span>; }
function PriorityBadge({ value }: { value: Priority }) { if (value === Priority.NORMAL || value === Priority.LOW) return null; return <span className="rounded-pill bg-warning-bg px-2.5 py-1 text-[10px] font-semibold text-warning">{value.toLowerCase()}</span>; }
function dateValue(value: Date | null) { return value ? value.toISOString().slice(0, 10) : ''; }
