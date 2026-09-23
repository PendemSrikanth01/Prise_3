import Link from 'next/link';
import { ArrowLeft, Building2, GraduationCap, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { MentorChatThread } from '@/components/chat/MentorChatThread';
import { requireMentorChatPair } from '@/lib/mentor-chat';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MentorConversationPage({ params }: { params: Promise<{ startupId: string; mentorId: string }> }) {
  const { startupId, mentorId } = await params;
  const access = await requireMentorChatPair(startupId, mentorId).catch(() => null);
  if (!access) notFound();
  const conversation = await prisma.mentorConversation.findUnique({
    where: { startupId_mentorId: { startupId, mentorId } },
    select: { messages: { orderBy: { createdAt: 'asc' }, take: 200, select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { name: true, role: true } } } } },
  });
  const messages = conversation?.messages ?? [];

  return <div className="mx-auto w-full max-w-5xl p-3 sm:p-6 lg:p-8">
    <Link href="/messages" className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-prise-primary"><ArrowLeft size={16} />All messages</Link>
    <section className="overflow-hidden rounded-card border bg-white shadow-card">
      <header className="border-b bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-lg font-bold sm:text-xl">{access.assignment.startup.name}</h1><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-prise-text-secondary"><span className="inline-flex items-center gap-1.5"><GraduationCap size={15} />{access.assignment.person.name}</span><span className="inline-flex items-center gap-1.5"><Building2 size={15} />Mentoring conversation</span></div></div>{!access.canSend ? <span className="inline-flex items-center gap-1.5 rounded-pill bg-prise-page px-3 py-1.5 text-xs font-semibold text-prise-text-secondary"><ShieldCheck size={14} />Read-only oversight</span> : null}</div>
      </header>
      <MentorChatThread
        messages={messages.map((message) => ({ id: message.id, body: message.body, createdAt: message.createdAt.toISOString(), authorId: message.authorId, authorName: message.author?.name || 'Former user', authorRole: message.author?.role || 'FORMER_USER' }))}
        startupId={startupId}
        mentorId={mentorId}
        currentUserId={access.session.user.id}
        canSend={access.canSend}
      />
    </section>
    <p className="mt-3 text-center text-xs leading-5 text-prise-text-muted">Messages are retained for program safeguarding and audit. Do not share passwords, banking credentials or sensitive personal documents in chat.</p>
  </div>;
}
