'use server';

import { hash } from 'bcryptjs';
import {
  MilestoneStatus, OnboardingStatus, PaymentStatus, Priority, ReviewDecision,
  Role, StartupStatus, SupportRequestStatus, TaskStatus,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { enumValue, optionalDate, optionalText, positiveMoney, requiredText, text } from '@/lib/form';
import { requirePermission, requireStartupAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function refreshStartup(startupId: string) {
  revalidatePath('/');
  revalidatePath('/startups');
  revalidatePath(`/startups/${startupId}`);
  revalidatePath('/work');
  revalidatePath('/audit');
}

export async function updateStartupAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const session = await requireStartupAccess(startupId, 'startup:update');
  const before = await prisma.startup.findUniqueOrThrow({ where: { id: startupId } });
  const data = {
    name: requiredText(formData, 'name', 180),
    founderName: requiredText(formData, 'founderName', 160),
    founderEmail: optionalText(formData, 'founderEmail', 254),
    founderPhone: optionalText(formData, 'founderPhone', 40),
    operationLocation: optionalText(formData, 'operationLocation', 160),
    state: optionalText(formData, 'state', 100),
    sector: optionalText(formData, 'sector', 160),
    legalStructure: optionalText(formData, 'legalStructure', 160),
    documentFolderLink: optionalText(formData, 'documentFolderLink', 1000),
    healthStatus: optionalText(formData, 'healthStatus', 1000),
    status: enumValue(StartupStatus, formData.get('status'), 'status'),
  };
  await prisma.$transaction(async (tx) => {
    await tx.startup.update({ where: { id: startupId }, data });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Startup', entityId: startupId, action: 'updated', summary: `Updated ${before.name}`, meta: { before: { name: before.name, status: before.status }, after: { name: data.name, status: data.status } } }) });
  });
  refreshStartup(startupId);
}

export async function reviewOnboardingAction(formData: FormData) {
  const itemId = requiredText(formData, 'itemId', 64);
  const item = await prisma.onboardingItem.findUniqueOrThrow({ where: { id: itemId }, include: { startup: { select: { id: true, name: true } } } });
  const session = await requireStartupAccess(item.startupId, 'onboarding:review');
  const status = enumValue(OnboardingStatus, formData.get('status'), 'status');
  if (![OnboardingStatus.APPROVED, OnboardingStatus.NEEDS_REVISION, OnboardingStatus.SUBMITTED, OnboardingStatus.PENDING, OnboardingStatus.NA].includes(status)) throw new Error('Unsupported onboarding decision');
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.onboardingItem.update({ where: { id: itemId }, data: { status, remarks: optionalText(formData, 'remarks', 1500), reviewedById: session.user.id, approvedAt: status === OnboardingStatus.APPROVED ? now : null, submittedAt: status === OnboardingStatus.SUBMITTED && !item.submittedAt ? now : item.submittedAt } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: item.startupId, entityType: 'OnboardingItem', entityId: itemId, action: 'reviewed', summary: `${item.startup.name}: ${item.type.replaceAll('_', ' ')} marked ${status.replaceAll('_', ' ')}`, meta: { from: item.status, to: status } }) });
  });
  refreshStartup(item.startupId);
}

export async function assignMilestonesAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const session = await requireStartupAccess(startupId, 'milestone:assign');
  const templateIds = [...new Set(formData.getAll('templateId').filter((value): value is string => typeof value === 'string'))];
  if (templateIds.length < 10 || templateIds.length > 15) throw new Error('Select between 10 and 15 milestones.');
  const [startup, templates, existing] = await Promise.all([
    prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true } }),
    prisma.milestoneTemplate.findMany({ where: { id: { in: templateIds }, isActive: true, scope: 'STARTUP' } }),
    prisma.milestone.findMany({ where: { startupId, templateId: { not: null } }, include: { _count: { select: { tasks: true, deliverables: true, reviews: true } } } }),
  ]);
  if (templates.length !== templateIds.length) throw new Error('One or more milestone templates are not assignable.');
  const selected = new Set(templateIds);
  const removals = existing.filter((item) => item.templateId && !selected.has(item.templateId));
  if (removals.some((item) => item.status !== MilestoneStatus.NOT_STARTED || item._count.tasks + item._count.deliverables + item._count.reviews > 0)) throw new Error('A milestone with activity cannot be removed from the plan.');
  await prisma.$transaction(async (tx) => {
    if (removals.length) await tx.milestone.deleteMany({ where: { id: { in: removals.map((item) => item.id) } } });
    for (const template of templates) {
      await tx.milestone.upsert({
        where: { startupId_templateId: { startupId, templateId: template.id } },
        update: { phase: template.phase, title: template.title, keyActivity: template.keyActivity, deliverable: template.deliverable, effort: template.effort },
        create: { startupId, templateId: template.id, phase: template.phase, title: template.title, keyActivity: template.keyActivity, deliverable: template.deliverable, effort: template.effort },
      });
    }
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Startup', entityId: startupId, action: 'milestone_plan_updated', summary: `${startup.name}: milestone plan set to ${templates.length} outcomes`, meta: { selectedTemplateIds: templateIds, removed: removals.map((item) => item.templateId) } }) });
  });
  refreshStartup(startupId);
}

export async function createTaskAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const session = await requireStartupAccess(startupId, 'task:manage');
  const milestoneId = optionalText(formData, 'milestoneId', 64);
  if (milestoneId) {
    const validMilestone = await prisma.milestone.count({ where: { id: milestoneId, startupId } });
    if (!validMilestone) throw new Error('Milestone does not belong to this startup.');
  }
  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({ data: { startupId, milestoneId, title: requiredText(formData, 'title', 220), description: optionalText(formData, 'description', 2000), priority: enumValue(Priority, formData.get('priority'), 'priority'), dueDate: optionalDate(formData, 'dueDate'), assigneeId: optionalText(formData, 'assigneeId', 64) } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Task', entityId: created.id, action: 'created', summary: `Created task: ${created.title}` }) });
    return created;
  });
  refreshStartup(startupId);
  void task.id;
}

export async function updateTaskAction(formData: FormData) {
  const taskId = requiredText(formData, 'taskId', 64);
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (!task.startupId) throw new Error('Program-level task editing is not enabled here.');
  const session = await requireStartupAccess(task.startupId, 'task:manage');
  const status = enumValue(TaskStatus, formData.get('status'), 'status');
  await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({ where: { id: taskId }, data: { title: requiredText(formData, 'title', 220), description: optionalText(formData, 'description', 2000), status, priority: enumValue(Priority, formData.get('priority'), 'priority'), dueDate: optionalDate(formData, 'dueDate'), blockedReason: status === TaskStatus.BLOCKED ? optionalText(formData, 'blockedReason', 1000) : null, completedAt: status === TaskStatus.DONE ? task.completedAt ?? new Date() : null } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: task.startupId, entityType: 'Task', entityId: taskId, action: 'updated', summary: `Updated task: ${updated.title}`, meta: { from: task.status, to: status } }) });
  });
  refreshStartup(task.startupId);
}

export async function deleteTaskAction(formData: FormData) {
  const taskId = requiredText(formData, 'taskId', 64);
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (!task.startupId) throw new Error('Program-level task deletion is not enabled here.');
  const session = await requireStartupAccess(task.startupId, 'task:manage');
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: task.startupId, entityType: 'Task', entityId: taskId, action: 'deleted', summary: `Deleted task: ${task.title}` }) });
    await tx.task.delete({ where: { id: taskId } });
  });
  refreshStartup(task.startupId);
}

export async function reviewMilestoneAction(formData: FormData) {
  const milestoneId = requiredText(formData, 'milestoneId', 64);
  const milestone = await prisma.milestone.findUniqueOrThrow({ where: { id: milestoneId }, select: { id: true, startupId: true, title: true, status: true } });
  const session = await requireStartupAccess(milestone.startupId, 'milestone:review');
  const decision = enumValue(ReviewDecision, formData.get('decision'), 'decision');
  const status = decision === ReviewDecision.APPROVED ? MilestoneStatus.APPROVED : decision === ReviewDecision.REVISION_REQUESTED ? MilestoneStatus.NEEDS_REVISION : milestone.status;
  await prisma.$transaction(async (tx) => {
    await tx.milestoneReview.create({ data: { milestoneId, reviewerId: session.user.id, decision, feedback: optionalText(formData, 'feedback', 2500) } });
    await tx.milestone.update({ where: { id: milestoneId }, data: { reviewerId: session.user.id, status, approvedAt: status === MilestoneStatus.APPROVED ? new Date() : null } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: milestone.startupId, entityType: 'Milestone', entityId: milestoneId, action: 'reviewed', summary: `${milestone.title}: ${decision.replaceAll('_', ' ')}`, meta: { from: milestone.status, to: status } }) });
  });
  refreshStartup(milestone.startupId);
}

export async function createPaymentAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const session = await requireStartupAccess(startupId, 'payment:manage');
  const startup = await prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true } });
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentInstallment.create({ data: { startupId, dueDate: optionalDate(formData, 'dueDate') ?? new Date(), amount: positiveMoney(formData, 'amount'), status: enumValue(PaymentStatus, formData.get('status'), 'status'), paidAt: optionalDate(formData, 'paidAt'), reference: optionalText(formData, 'reference', 160), remarks: optionalText(formData, 'remarks', 1000) } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'PaymentInstallment', entityId: created.id, action: 'created', summary: `${startup.name}: recorded payment installment ${created.amount.toString()}` }) });
    return created;
  });
  await syncStartupPaidTotal(startupId);
  refreshStartup(startupId);
  void payment.id;
}

export async function updatePaymentAction(formData: FormData) {
  const paymentId = requiredText(formData, 'paymentId', 64);
  const payment = await prisma.paymentInstallment.findUniqueOrThrow({ where: { id: paymentId } });
  const session = await requireStartupAccess(payment.startupId, 'payment:manage');
  const status = enumValue(PaymentStatus, formData.get('status'), 'status');
  await prisma.$transaction(async (tx) => {
    await tx.paymentInstallment.update({ where: { id: paymentId }, data: { dueDate: optionalDate(formData, 'dueDate') ?? payment.dueDate, amount: positiveMoney(formData, 'amount'), status, paidAt: status === PaymentStatus.PAID ? optionalDate(formData, 'paidAt') ?? payment.paidAt ?? new Date() : null, reference: optionalText(formData, 'reference', 160), remarks: optionalText(formData, 'remarks', 1000) } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: payment.startupId, entityType: 'PaymentInstallment', entityId: paymentId, action: 'updated', summary: `Payment marked ${status}`, meta: { from: payment.status, to: status } }) });
  });
  await syncStartupPaidTotal(payment.startupId);
  refreshStartup(payment.startupId);
}

export async function deletePaymentAction(formData: FormData) {
  const paymentId = requiredText(formData, 'paymentId', 64);
  const payment = await prisma.paymentInstallment.findUniqueOrThrow({ where: { id: paymentId } });
  const session = await requireStartupAccess(payment.startupId, 'payment:manage');
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: payment.startupId, entityType: 'PaymentInstallment', entityId: paymentId, action: 'deleted', summary: `Deleted payment installment ${payment.amount.toString()}` }) });
    await tx.paymentInstallment.delete({ where: { id: paymentId } });
  });
  await syncStartupPaidTotal(payment.startupId);
  refreshStartup(payment.startupId);
}

async function syncStartupPaidTotal(startupId: string) {
  const paid = await prisma.paymentInstallment.aggregate({ where: { startupId, status: PaymentStatus.PAID }, _sum: { amount: true } });
  await prisma.startup.update({ where: { id: startupId }, data: { totalFeePaid: paid._sum.amount ?? 0 } });
}

export async function createSupportAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const session = await requireStartupAccess(startupId, 'support:create');
  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.supportRequest.create({ data: { startupId, requestedById: session.user.id, title: requiredText(formData, 'title', 220), description: optionalText(formData, 'description', 2500), priority: enumValue(Priority, formData.get('priority'), 'priority'), dueDate: optionalDate(formData, 'dueDate') } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'SupportRequest', entityId: created.id, action: 'created', summary: `Requested support: ${created.title}` }) });
    return created;
  });
  refreshStartup(startupId);
  void request.id;
}

export async function updateSupportAction(formData: FormData) {
  const requestId = requiredText(formData, 'requestId', 64);
  const request = await prisma.supportRequest.findUniqueOrThrow({ where: { id: requestId } });
  const session = await requireStartupAccess(request.startupId, 'support:manage');
  const status = enumValue(SupportRequestStatus, formData.get('status'), 'status');
  await prisma.$transaction(async (tx) => {
    await tx.supportRequest.update({ where: { id: requestId }, data: { status, assignedToId: optionalText(formData, 'assignedToId', 64), outcome: optionalText(formData, 'outcome', 2000), dueDate: optionalDate(formData, 'dueDate'), resolvedAt: status === SupportRequestStatus.RESOLVED ? request.resolvedAt ?? new Date() : null } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: request.startupId, entityType: 'SupportRequest', entityId: requestId, action: 'updated', summary: `${request.title}: ${status.replaceAll('_', ' ')}`, meta: { from: request.status, to: status } }) });
  });
  refreshStartup(request.startupId);
}

export async function deleteSupportAction(formData: FormData) {
  const requestId = requiredText(formData, 'requestId', 64);
  const request = await prisma.supportRequest.findUniqueOrThrow({ where: { id: requestId } });
  const session = await requireStartupAccess(request.startupId, 'support:manage');
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: request.startupId, entityType: 'SupportRequest', entityId: requestId, action: 'deleted', summary: `Deleted support request: ${request.title}` }) });
    await tx.supportRequest.delete({ where: { id: requestId } });
  });
  refreshStartup(request.startupId);
}

export async function createPersonAction(formData: FormData) {
  const session = await requirePermission('people:manage');
  const email = requiredText(formData, 'email', 254).toLowerCase();
  const password = text(formData, 'password', 256);
  if (!(password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password))) {
    throw new Error('Temporary password must have 12+ characters, uppercase, lowercase, a number and a symbol.');
  }
  const role = enumValue(Role, formData.get('role'), 'role');
  const person = await prisma.person.create({ data: { name: requiredText(formData, 'name', 160), email, phone: optionalText(formData, 'phone', 40), role, passwordHash: await hash(password, 12), mustChangePassword: true, founderOfStartupId: role === Role.FOUNDER ? optionalText(formData, 'founderOfStartupId', 64) : null } });
  await prisma.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Person', entityId: person.id, action: 'created', summary: `Created ${role.replaceAll('_', ' ').toLowerCase()} account for ${person.name}` }) });
  revalidatePath('/settings');
  revalidatePath('/people');
  revalidatePath('/audit');
}

export async function updatePersonAccessAction(formData: FormData) {
  const session = await requirePermission('people:manage');
  const personId = requiredText(formData, 'personId', 64);
  if (personId === session.user.id && formData.get('isActive') !== 'on') throw new Error('You cannot deactivate your own account.');
  const before = await prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { name: true, role: true, isActive: true } });
  const role = enumValue(Role, formData.get('role'), 'role');
  const isActive = formData.get('isActive') === 'on';
  await prisma.$transaction(async (tx) => {
    await tx.person.update({ where: { id: personId }, data: { role, isActive } });
    if (!isActive) await tx.authSession.updateMany({ where: { personId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Person', entityId: personId, action: 'access_updated', summary: `${before.name}: access updated`, meta: { before: { role: before.role, isActive: before.isActive }, after: { role, isActive } } }) });
  });
  revalidatePath('/settings');
  revalidatePath('/audit');
}
