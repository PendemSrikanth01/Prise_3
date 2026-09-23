import Link from 'next/link';
import { MessageCircle, Users } from 'lucide-react';
import { AssignmentRole, Role } from '@prisma/client';
import { notFound } from 'next/navigation';
import { accessibleStartupWhere, isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await requireSession();
  if (!([Role.FOUNDER, Role.MENTOR, Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] as Role[]).includes(session.user.role)) notFound();
  const assignments = await prisma.startupAssignment.findMany({
    where: {
      role: AssignmentRole.MENTOR,
      person: { isActive: true },
      ...(session.user.role === Role.MENTOR ? { personId: session.user.id } : {}),
      ...(session.user.role === Role.FOUNDER ? { startup: accessibleStartupWhere(session.user) } : {}),
    },
    select: { startupId: true, personId: true, createdAt: true, startup: { select: { name: true } }, person: { select: { name: true, organization: true } } },
    orderBy: [{ startup: { name: 'asc' } }, { person: { name: 'asc' } }],
  });
  const pairs = assignments.map(({ startupId, personId }) => ({ startupId, mentorId: personId }));
  const programAccess = isProgramRole(session.user.role);
  const conversations = programAccess || pairs.length ? await prisma.mentorConversation.findMany({
    where: programAccess ? {} : { OR: pairs },
    select: {
      id: true,
      startupId: true,
      mentorId: true,
      createdAt: true,
      startup: { select: { name: true } },
      mentor: { select: { name: true, organization: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, createdAt: true, author: { select: { name: true } } } },
      reads: { where: { personId: session.user.id }, take: 1, select: { lastReadAt: true } },
    },
  }) : [];
  const conversationByPair = new Map(conversations.map((conversation) => [`${conversation.startupId}:${conversation.mentorId}`, conversation]));
  const activePairKeys = new Set(assignments.map(({ startupId, personId }) => `${startupId}:${personId}`));
  const rows = [
    ...assignments.map((assignment) => ({ ...assignment, archived: false })),
    ...(programAccess ? conversations.filter((conversation) => !activePairKeys.has(`${conversation.startupId}:${conversation.mentorId}`)).map((conversation) => ({
      startupId: conversation.startupId,
      personId: conversation.mentorId,
      createdAt: conversation.createdAt,
      startup: conversation.startup,
      person: conversation.mentor,
      archived: true,
    })) : []),
  ];

  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Direct coordination</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Mentoring messages</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Secure conversations for confirmed mentor assignments.</p></div><div className="text-xs text-prise-text-muted">Updates refresh every 15 seconds</div></div>

    {rows.length ? <div className="mt-6 grid gap-3">{rows.map((assignment) => {
      const conversation = conversationByPair.get(`${assignment.startupId}:${assignment.personId}`);
      const lastMessage = conversation?.messages[0];
      const lastReadAt = conversation?.reads[0]?.lastReadAt;
      const unread = Boolean(lastMessage && !isProgramRole(session.user.role) && (!lastReadAt || lastMessage.createdAt > lastReadAt));
      return <Link key={`${assignment.startupId}:${assignment.personId}`} href={`/messages/${assignment.startupId}/${assignment.personId}`} className="group flex min-h-24 items-center gap-4 rounded-card border bg-white p-4 shadow-card hover:-translate-y-0.5 hover:border-prise-primary/40 hover:shadow-card-hover sm:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-purple-bg text-accent-purple"><MessageCircle size={20} /></div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate font-bold">{isProgramRole(session.user.role) ? `${assignment.startup.name} · ${assignment.person.name}` : session.user.role === Role.MENTOR ? assignment.startup.name : assignment.person.name}</h2>{assignment.archived ? <span className="rounded-pill bg-prise-page px-2 py-0.5 text-[10px] font-semibold text-prise-text-muted">Archived</span> : null}{unread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-prise-action" aria-label="Unread messages" /> : null}</div><p className="mt-0.5 truncate text-xs text-prise-text-muted">{session.user.role === Role.MENTOR ? 'Startup mentoring conversation' : `${assignment.person.organization || 'PrISE mentor'} · ${assignment.startup.name}`}</p><p className="mt-2 truncate text-sm text-prise-text-secondary">{lastMessage ? `${lastMessage.author?.name || 'Former user'}: ${lastMessage.body}` : 'No messages yet — open the conversation to begin.'}</p></div>
        <span className="hidden text-sm font-semibold text-prise-primary sm:block">Open →</span>
      </Link>;
    })}</div> : <section className="mt-6 rounded-card border border-dashed bg-white p-10 text-center shadow-card"><Users size={28} className="mx-auto text-prise-text-muted" /><h2 className="mt-3 font-semibold">No confirmed mentor conversations</h2><p className="mt-2 text-sm text-prise-text-secondary">A conversation becomes available when the Program Team confirms a mentor assignment.</p></section>}
  </div>;
}
