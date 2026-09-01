import 'server-only';

import { NotificationTemplateKey } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type TemplateVariables = Record<string, string>;

export const NOTIFICATION_TEMPLATE_DEFAULTS: Record<NotificationTemplateKey, {
  name: string;
  subject: string;
  body: string;
  variables: string[];
}> = {
  ACCOUNT_WELCOME: {
    name: 'Welcome',
    subject: 'Welcome to the PrISE 3.0 workspace',
    body: 'Hi {{name}},\n\nYour {{role}} account is ready. Use the temporary password shared by the Program Lead, then choose a private password.\n\nOpen PrISE 3.0: {{appUrl}}',
    variables: ['name', 'role', 'appUrl'],
  },
  TASK_ASSIGNED: {
    name: 'Task assigned',
    subject: 'New task: {{taskTitle}}',
    body: 'Hi {{name}},\n\nA task has been assigned to you for {{startupName}}.\n\nTask: {{taskTitle}}\nDue: {{dueDate}}\n\nOpen task: {{appUrl}}',
    variables: ['name', 'startupName', 'taskTitle', 'dueDate', 'appUrl'],
  },
  TASK_REMINDER: {
    name: 'Task reminder',
    subject: 'Reminder: {{taskTitle}} is due soon',
    body: 'Hi {{name}},\n\nYour task for {{startupName}} is due soon.\n\nTask: {{taskTitle}}\nDue: {{dueDate}}\n\nOpen task: {{appUrl}}',
    variables: ['name', 'startupName', 'taskTitle', 'dueDate', 'appUrl'],
  },
  SESSION_INVITE: {
    name: 'Meeting invitation',
    subject: 'Invitation: {{meetingTitle}}',
    body: 'Hi {{name}},\n\n{{meetingTitle}} with {{startupName}} is scheduled for {{meetingDate}}.\n\nJoin or view meeting: {{meetingLink}}',
    variables: ['name', 'startupName', 'meetingTitle', 'meetingDate', 'meetingLink'],
  },
  SESSION_REMINDER: {
    name: 'Meeting reminder',
    subject: 'Reminder: {{meetingTitle}} starts soon',
    body: 'Hi {{name}},\n\n{{meetingTitle}} with {{startupName}} starts at {{meetingDate}}.\n\nJoin or view meeting: {{meetingLink}}',
    variables: ['name', 'startupName', 'meetingTitle', 'meetingDate', 'meetingLink'],
  },
};

export function sampleTemplateVariables(key: NotificationTemplateKey): TemplateVariables {
  const common = { name: 'Ananya', startupName: 'Sample Startup', appUrl: `${process.env.APP_URL || 'https://prise.bvcsrb.org'}/work` };
  if (key === NotificationTemplateKey.ACCOUNT_WELCOME) return { name: common.name, role: 'incubatee', appUrl: `${process.env.APP_URL || 'https://prise.bvcsrb.org'}/login` };
  if (key === NotificationTemplateKey.TASK_ASSIGNED || key === NotificationTemplateKey.TASK_REMINDER) return { ...common, taskTitle: 'Submit customer validation summary', dueDate: '3 Sep 2026' };
  return { ...common, meetingTitle: 'Weekly mentor review', meetingDate: '3 Sep 2026, 11:00 am', meetingLink: 'https://meet.google.com/example' };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character);
}

function frame(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#17172a"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #e5e7ef;border-radius:16px;overflow:hidden"><div style="padding:22px 28px;background:#151337;color:#fff;font-weight:700;letter-spacing:.08em">PRISE 3.0</div><div style="padding:28px"><h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>${body}<p style="margin:28px 0 0;color:#6b6d7c;font-size:13px">PRISE 3.0 incubation team</p></div></div></body></html>`;
}

function interpolate(template: string, variables: TemplateVariables) {
  return template.replace(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g, (_match, key: string) => variables[key] ?? '');
}

export function renderTemplateContent(subjectTemplate: string, bodyTemplate: string, variables: TemplateVariables) {
  return { subject: interpolate(subjectTemplate, variables), text: interpolate(bodyTemplate, variables) };
}

function bodyHtml(body: string) {
  return body.split(/\n{2,}/).map((paragraph) => {
    const escaped = escapeHtml(paragraph).replace(/\n/g, '<br>');
    const linked = escaped.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#367f9d;font-weight:700">${url}</a>`);
    return `<p style="line-height:1.6">${linked}</p>`;
  }).join('');
}

export async function renderNotificationTemplate(key: NotificationTemplateKey, variables: TemplateVariables) {
  const fallback = NOTIFICATION_TEMPLATE_DEFAULTS[key];
  const stored = await prisma.notificationTemplate.findUnique({ where: { key } });
  const { subject, text } = renderTemplateContent(stored?.subjectTemplate ?? fallback.subject, stored?.bodyTemplate ?? fallback.body, variables);
  return {
    subject,
    text,
    html: frame(subject, bodyHtml(text)),
    isActive: stored?.isActive ?? true,
    autoSend: stored?.autoSend ?? true,
  };
}

export function accountWelcomeTemplate(input: { name: string; role: string; loginUrl: string }) {
  const subject = 'Welcome to the PRISE 3.0 workspace';
  const text = `Hi ${input.name}, your ${input.role} account is ready. Sign in at ${input.loginUrl} using the temporary password shared by the program lead.`;
  return { subject, text, html: frame(subject, `<p>Hi ${escapeHtml(input.name)},</p><p>Your <strong>${escapeHtml(input.role)}</strong> account is ready. Use the temporary password shared by the program lead, then choose a private password.</p><p><a href="${escapeHtml(input.loginUrl)}" style="color:#5948e8;font-weight:700">Open PRISE 3.0</a></p>`) };
}

export function supportOpportunityTemplate(input: { mentorName: string; startupName: string; requestTitle: string; description?: string | null; url: string }) {
  const subject = `Support requested by ${input.startupName}`;
  const text = `Hi ${input.mentorName}, ${input.startupName} requested support: ${input.requestTitle}. ${input.description ?? ''} Open: ${input.url}`;
  return { subject, text, html: frame(subject, `<p>Hi ${escapeHtml(input.mentorName)},</p><p><strong>${escapeHtml(input.startupName)}</strong> has asked for help with:</p><p style="font-size:17px;font-weight:700">${escapeHtml(input.requestTitle)}</p>${input.description ? `<p>${escapeHtml(input.description)}</p>` : ''}<p><a href="${escapeHtml(input.url)}" style="color:#5948e8;font-weight:700">Review the request</a></p>`) };
}

export function sessionInviteTemplate(input: { name: string; startupName?: string | null; title: string; startsAt: Date; meetingUrl?: string | null; url: string }) {
  const subject = `Invitation: ${input.title}`;
  const when = input.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  const text = `Hi ${input.name}, ${input.title}${input.startupName ? ` with ${input.startupName}` : ''} is scheduled for ${when}. ${input.meetingUrl ?? input.url}`;
  return { subject, text, html: frame(subject, `<p>Hi ${escapeHtml(input.name)},</p><p>Your session${input.startupName ? ` with <strong>${escapeHtml(input.startupName)}</strong>` : ''} is scheduled.</p><p><strong>${escapeHtml(when)}</strong></p>${input.meetingUrl ? `<p><a href="${escapeHtml(input.meetingUrl)}" style="color:#5948e8;font-weight:700">Join session</a></p>` : `<p><a href="${escapeHtml(input.url)}" style="color:#5948e8;font-weight:700">View session</a></p>`}`) };
}

export function weeklyProgressTemplate(input: { name: string; startupName: string; completed: number; total: number; overdue: number; url: string }) {
  const subject = `${input.startupName} weekly progress update`;
  const text = `Hi ${input.name}, ${input.completed} of ${input.total} milestones are complete and ${input.overdue} items are overdue. ${input.url}`;
  return { subject, text, html: frame(subject, `<p>Hi ${escapeHtml(input.name)},</p><p><strong>${escapeHtml(input.startupName)}</strong> has completed ${input.completed} of ${input.total} milestones.</p><p>${input.overdue ? `<strong>${input.overdue}</strong> overdue item(s) need attention.` : 'Nothing is overdue.'}</p><p><a href="${escapeHtml(input.url)}" style="color:#5948e8;font-weight:700">Open startup progress</a></p>`) };
}
