import Link from 'next/link';
import { NotificationTemplateKey } from '@prisma/client';
import { NotificationTemplateManager } from '@/components/admin/NotificationTemplateManager';
import { EmailComposer } from '@/components/notifications/EmailComposer';
import { EmailOutbox } from '@/components/notifications/EmailOutbox';
import { requirePermission } from '@/lib/auth';
import { emailDeliveryConfigured } from '@/lib/email';
import { roleLabel } from '@/lib/labels';
import { NOTIFICATION_TEMPLATE_DEFAULTS, renderTemplateContent, sampleTemplateVariables } from '@/lib/notification-templates';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
type Tab = 'compose' | 'outbox' | 'templates';

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requirePermission('notification:manage');
  const requested = (await searchParams).tab;
  const tab: Tab = requested === 'outbox' || requested === 'templates' ? requested : 'compose';
  const [people, messages, notifications, storedTemplates] = await Promise.all([
    prisma.person.findMany({ where: { isActive: true }, orderBy: [{ role: 'asc' }, { name: 'asc' }], select: { id: true, name: true, email: true, role: true } }),
    prisma.emailMessage.findMany({ include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.notification.findMany({ include: { recipient: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.notificationTemplate.findMany({ orderBy: { key: 'asc' } }),
  ]);
  const configured = emailDeliveryConfigured();
  const from = process.env.MAIL_FROM || 'PrISE 3.0 <notifications@mail.prise.bvcsrb.org>';
  const replyTo = process.env.MAIL_REPLY_TO || 'prise@balavikasa.org';
  const storedByKey = new Map(storedTemplates.map((template) => [template.key, template]));
  const templates = Object.values(NotificationTemplateKey).map((key) => {
    const stored = storedByKey.get(key);
    const fallback = NOTIFICATION_TEMPLATE_DEFAULTS[key];
    const subjectTemplate = stored?.subjectTemplate ?? fallback.subject;
    const bodyTemplate = stored?.bodyTemplate ?? fallback.body;
    const preview = renderTemplateContent(subjectTemplate, bodyTemplate, sampleTemplateVariables(key));
    return { key, name: stored?.name ?? fallback.name, subjectTemplate, bodyTemplate, isActive: stored?.isActive ?? true, autoSend: stored?.autoSend ?? true, previewSubject: preview.subject, previewText: preview.text };
  });

  return <div className="mx-auto w-full max-w-[1350px] p-4 sm:p-6 lg:p-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Organization communication</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Email workspace</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Compose, schedule and audit outgoing PrISE communication in one place.</p></div><span className={`w-fit rounded-pill px-3 py-1.5 text-xs font-semibold ${configured ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{configured ? 'Resend delivery enabled' : 'Delivery disabled'}</span></div>
    <nav className="my-6 flex gap-1 overflow-x-auto rounded-xl border bg-white p-1" aria-label="Email workspace sections"><TabLink tab="compose" current={tab} label="Compose" /><TabLink tab="outbox" current={tab} label="Outbox" count={messages.length + notifications.length} /><TabLink tab="templates" current={tab} label="Templates" count={templates.length} /></nav>
    {tab === 'compose' ? <EmailComposer configured={configured} from={from} replyTo={replyTo} recipients={people.map((person) => ({ id: person.id, email: person.email, label: `${person.name} · ${roleLabel(person.role)}` }))} /> : null}
    {tab === 'outbox' ? <EmailOutbox messages={messages} automated={notifications} /> : null}
    {tab === 'templates' ? <NotificationTemplateManager templates={templates} testRecipient={session.user.email} /> : null}
  </div>;
}

function TabLink({ tab, current, label, count }: { tab: Tab; current: Tab; label: string; count?: number }) {
  const active = tab === current;
  return <Link href={`/notifications?tab=${tab}`} className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ${active ? 'bg-prise-primary text-white' : 'text-prise-text-secondary hover:bg-prise-page'}`}>{label}{count === undefined ? null : <span className={`ml-2 ${active ? 'text-white/70' : 'text-prise-text-muted'}`}>{count}</span>}</Link>;
}
