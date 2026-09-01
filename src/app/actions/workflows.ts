'use server';

import { hash } from 'bcryptjs';
import {
  AssignmentRole, MilestoneStakeholderLane, MilestoneStakeholderState, MilestoneStatus, NotificationKind, NotificationStatus, NotificationTemplateKey, OnboardingStatus, PaymentStatus, Priority, ReviewDecision,
  Role, StartupMemberRole, StartupStatus, SupportRequestStatus, TaskStatus,
  SupportAudience,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { enumValue, optionalDate, optionalText, positiveMoney, requiredText, text } from '@/lib/form';
import { canDeleteTaskRecord, canEditTaskRecord, canManageStartupMembers, isProgramRole, requirePermission, requireSession, requireStartupAccess, startupMemberRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validPassword } from '@/lib/password';
import { supportOpportunityTemplate } from '@/lib/notification-templates';
import { queueTemplatedNotification } from '@/lib/notification-automation';
import { setMilestoneLaneState } from '@/lib/milestone-state';
import { canDeleteSupportRequest } from '@/lib/collaboration-policy';

const APP_URL = () => process.env.APP_URL || 'http://127.0.0.1:3010';

function refreshStartup(startupId: string) {
  revalidatePath('/');
  revalidatePath('/startups');
  revalidatePath(`/startups/${startupId}`);
  revalidatePath('/work');
  revalidatePath('/audit');
}

export async function reviewStartupApplicationAction(formData: FormData) {
  const session = await requirePermission('onboarding:review');
  const startupId = requiredText(formData, 'startupId', 64);
  const decision = requiredText(formData, 'decision', 20);
  if (decision !== 'APPROVE' && decision !== 'REJECT') throw new Error('Choose approve or reject.');
  const startup = await prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true, status: true } });
  if (startup.status !== StartupStatus.APPLICATION_PENDING && startup.status !== StartupStatus.REJECTED) throw new Error('This application has already been processed.');
  await prisma.$transaction(async (tx) => {
    if (decision === 'APPROVE') {
      const existingMilestones = await tx.milestone.count({ where: { startupId } });
      if (!existingMilestones) {
        const templates = await tx.milestoneTemplate.findMany({ where: { isActive: true, scope: 'STARTUP' }, orderBy: [{ phase: 'asc' }, { title: 'asc' }], take: 10 });
        if (templates.length) await tx.milestone.createMany({ data: templates.map((template) => ({ startupId, templateId: template.id, phase: template.phase, title: template.title, keyActivity: template.keyActivity, deliverable: template.deliverable, effort: template.effort })) });
      }
      await tx.startup.update({ where: { id: startupId }, data: { status: StartupStatus.ACTIVE, healthStatus: optionalText(formData, 'remarks', 1000) } });
    } else {
      await tx.startup.update({ where: { id: startupId }, data: { status: StartupStatus.REJECTED, healthStatus: requiredText(formData, 'remarks', 1000) } });
    }
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Startup', entityId: startupId, action: decision === 'APPROVE' ? 'application_approved' : 'application_rejected', summary: `${startup.name}: application ${decision === 'APPROVE' ? 'approved' : 'rejected'}`, meta: { from: startup.status, to: decision === 'APPROVE' ? StartupStatus.ACTIVE : StartupStatus.REJECTED } }) });
  });
  refreshStartup(startupId);
  revalidatePath('/application');
}

export async function createStartupMemberAction(formData: FormData) {
  const session = await requireSession();
  const startupId = requiredText(formData, 'startupId', 64);
  await requireStartupAccess(startupId);
  const membershipRole = await startupMemberRole(startupId, session.user.id);
  if (!canManageStartupMembers(session.user.role, membershipRole)) throw new Error('Only startup owners, admins, or program staff can add members.');
  const email = requiredText(formData, 'email', 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
  const password = requiredText(formData, 'password', 128);
  if (!validPassword(password)) throw new Error('Password must contain at least 6 characters.');
  const role = enumValue(StartupMemberRole, formData.get('memberRole'), 'memberRole');
  if (role === StartupMemberRole.OWNER) throw new Error('Ownership transfer is not available here.');
  const account = await prisma.$transaction(async (tx) => {
    let createdNew = false;
    let person = await tx.person.findUnique({ where: { email }, select: { id: true, role: true } });
    if (person && person.role !== Role.FOUNDER) throw new Error('This email belongs to a non-startup account.');
    if (!person) { person = await tx.person.create({ data: { name: requiredText(formData, 'name', 160), email, role: Role.FOUNDER, passwordHash: await hash(password, 12), mustChangePassword: true } }); createdNew = true; }
    const membership = await tx.startupMembership.upsert({ where: { startupId_personId: { startupId, personId: person.id } }, update: { role, isActive: true }, create: { startupId, personId: person.id, role } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'StartupMembership', entityId: membership.id, action: 'member_added', summary: `Added ${email} as ${role.toLowerCase()}` }) });
    return { personId: person.id, createdNew };
  });
  if (account.createdNew) await queueTemplatedNotification({ recipientId: account.personId, recipientEmail: email, kind: NotificationKind.ACCOUNT_WELCOME, templateKey: NotificationTemplateKey.ACCOUNT_WELCOME, variables: { name: requiredText(formData, 'name', 160), role: 'incubatee', appUrl: `${APP_URL()}/login` }, relatedEntityType: 'Person', relatedEntityId: account.personId });
  refreshStartup(startupId);
}

export async function updateStartupMemberAction(formData: FormData) {
  const session = await requireSession();
  const membershipId = requiredText(formData, 'membershipId', 64);
  const membership = await prisma.startupMembership.findUniqueOrThrow({ where: { id: membershipId }, select: { startupId: true, personId: true, role: true, person: { select: { email: true } } } });
  await requireStartupAccess(membership.startupId);
  const actorMembershipRole = await startupMemberRole(membership.startupId, session.user.id);
  if (!canManageStartupMembers(session.user.role, actorMembershipRole)) throw new Error('Only startup owners, admins, or program staff can manage members.');
  const role = enumValue(StartupMemberRole, formData.get('memberRole'), 'memberRole');
  const isActive = formData.get('isActive') === 'on';
  if (membership.role === StartupMemberRole.OWNER && (!isActive || role !== StartupMemberRole.OWNER)) throw new Error('Transfer ownership before changing the owner account.');
  if (membership.personId === session.user.id && !isActive) throw new Error('You cannot deactivate your own membership.');
  await prisma.$transaction(async (tx) => {
    await tx.startupMembership.update({ where: { id: membershipId }, data: { role, isActive } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: membership.startupId, entityType: 'StartupMembership', entityId: membershipId, action: 'member_updated', summary: `${membership.person.email}: ${role.toLowerCase()} ${isActive ? 'active' : 'inactive'}` }) });
  });
  refreshStartup(membership.startupId);
}

export async function updateStartupAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const session = await requireStartupAccess(startupId, 'startup:update');
  const before = await prisma.startup.findUniqueOrThrow({ where: { id: startupId } });
  const programEditor = isProgramRole(session.user.role);
  const data = {
    name: requiredText(formData, 'name', 180),
    founderName: requiredText(formData, 'founderName', 160),
    founderEmail: optionalText(formData, 'founderEmail', 254),
    founderPhone: optionalText(formData, 'founderPhone', 40),
    operationLocation: optionalText(formData, 'operationLocation', 160),
    state: optionalText(formData, 'state', 100),
    sector: optionalText(formData, 'sector', 160),
    legalStructure: optionalText(formData, 'legalStructure', 160),
    ...(programEditor ? {
      documentFolderLink: optionalText(formData, 'documentFolderLink', 1000),
      healthStatus: optionalText(formData, 'healthStatus', 1000),
      status: enumValue(StartupStatus, formData.get('status'), 'status'),
    } : {}),
  };
  await prisma.$transaction(async (tx) => {
    await tx.startup.update({ where: { id: startupId }, data });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Startup', entityId: startupId, action: 'updated', summary: `Updated ${before.name}`, meta: { before: { name: before.name, status: before.status }, after: { name: data.name, status: programEditor ? data.status : before.status } } }) });
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

export type ActionFeedback = { status: 'idle' | 'success' | 'error'; message: string };

const actionMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

export async function assignMilestonesAction(_previous: ActionFeedback, formData: FormData): Promise<ActionFeedback> {
  try {
  const startupId = requiredText(formData, 'startupId', 64);
  const session = await requireStartupAccess(startupId);
  const canPlan = isProgramRole(session.user.role) || session.user.role === Role.MENTOR || session.user.role === Role.FOUNDER;
  if (!canPlan) throw new Error('Only the startup, assigned mentor, or program team can update this plan.');
  const templateIds = [...new Set(formData.getAll('templateId').filter((value): value is string => typeof value === 'string'))];
  if (templateIds.length < 1) throw new Error('Select at least one milestone.');
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
        update: { phase: template.phase, title: template.title, keyActivity: template.keyActivity, deliverable: template.deliverable, effort: template.effort, isFinalized: isProgramRole(session.user.role) },
        create: { startupId, templateId: template.id, phase: template.phase, title: template.title, keyActivity: template.keyActivity, deliverable: template.deliverable, effort: template.effort, isFinalized: isProgramRole(session.user.role) },
      });
    }
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Startup', entityId: startupId, action: isProgramRole(session.user.role) ? 'milestone_plan_finalized' : 'milestone_plan_proposed', summary: `${startup.name}: ${templates.length} milestones ${isProgramRole(session.user.role) ? 'finalized' : 'proposed'}`, meta: { selectedTemplateIds: templateIds, removed: removals.map((item) => item.templateId) } }) });
  });
  refreshStartup(startupId);
  return { status: 'success', message: isProgramRole(session.user.role) ? 'Milestone plan finalized and saved successfully!' : 'Milestone proposal saved for program confirmation.' };
  } catch (error) {
    return { status: 'error', message: actionMessage(error, 'The milestone plan could not be saved. Please try again.') };
  }
}

export async function createTaskAction(formData: FormData) {
  const startupId = requiredText(formData, 'startupId', 64);
  const session = await requireStartupAccess(startupId, 'task:manage');
  const milestoneId = optionalText(formData, 'milestoneId', 64);
  if (milestoneId) {
    const validMilestone = await prisma.milestone.count({ where: { id: milestoneId, startupId } });
    if (!validMilestone) throw new Error('Milestone does not belong to this startup.');
  }
  const requestedAssigneeId = optionalText(formData, 'assigneeId', 64) ?? (session.user.role === Role.FOUNDER ? session.user.id : null);
  if (requestedAssigneeId) {
    const validAssignee = await prisma.person.count({ where: { id: requestedAssigneeId, isActive: true, OR: [{ founderOfStartupId: startupId }, { startupMemberships: { some: { startupId, isActive: true } } }, { assignments: { some: { startupId } } }, { role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] } }] } });
    if (!validAssignee) throw new Error('Assignee is not part of this startup team.');
  }
  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({ data: { startupId, milestoneId, title: requiredText(formData, 'title', 220), description: optionalText(formData, 'description', 2000), priority: enumValue(Priority, formData.get('priority'), 'priority'), dueDate: optionalDate(formData, 'dueDate'), assigneeId: requestedAssigneeId, createdById: session.user.id } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Task', entityId: created.id, action: 'created', summary: `Created task: ${created.title}` }) });
    return created;
  });
  if (task.assigneeId) await queueTaskAutomation(task, true, true);
  refreshStartup(startupId);
}

export async function updateTaskAction(formData: FormData) {
  const taskId = requiredText(formData, 'taskId', 64);
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (!task.startupId) throw new Error('Program-level task editing is not enabled here.');
  const session = await requireStartupAccess(task.startupId, 'task:manage');
  if (!canEditTaskRecord(session.user, task)) throw new Error('Only the task creator, assignee, or program team can update this task.');
  const status = enumValue(TaskStatus, formData.get('status'), 'status');
  const requestedAssigneeId = optionalText(formData, 'assigneeId', 64);
  const updated = await prisma.$transaction(async (tx) => {
    const canChangeDefinition = isProgramRole(session.user.role) || task.createdById === session.user.id;
    if (canChangeDefinition && requestedAssigneeId) {
      const validAssignee = await tx.person.count({ where: { id: requestedAssigneeId, isActive: true, OR: [{ founderOfStartupId: task.startupId! }, { startupMemberships: { some: { startupId: task.startupId!, isActive: true } } }, { assignments: { some: { startupId: task.startupId! } } }, { role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] } }] } });
      if (!validAssignee) throw new Error('Assignee is not part of this startup team.');
    }
    const updated = await tx.task.update({ where: { id: taskId }, data: { ...(canChangeDefinition ? { title: requiredText(formData, 'title', 220), description: optionalText(formData, 'description', 2000), priority: enumValue(Priority, formData.get('priority'), 'priority'), dueDate: optionalDate(formData, 'dueDate'), assigneeId: requestedAssigneeId } : {}), status, blockedReason: status === TaskStatus.BLOCKED ? optionalText(formData, 'blockedReason', 1000) : null, completedAt: status === TaskStatus.DONE ? task.completedAt ?? new Date() : null } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: task.startupId, entityType: 'Task', entityId: taskId, action: 'updated', summary: `Updated task: ${updated.title}`, meta: { from: task.status, to: status } }) });
    return updated;
  });
  if (updated.assigneeId && updated.status !== TaskStatus.DONE) {
    const assigneeChanged = task.assigneeId !== updated.assigneeId;
    const reminderChanged = assigneeChanged || task.dueDate?.getTime() !== updated.dueDate?.getTime() || task.title !== updated.title;
    if (assigneeChanged) await prisma.notification.updateMany({ where: { relatedEntityId: taskId, kind: NotificationKind.TASK_ASSIGNED, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } }, data: { status: NotificationStatus.CANCELLED } });
    if (reminderChanged) await prisma.notification.updateMany({ where: { relatedEntityId: taskId, kind: NotificationKind.TASK_REMINDER, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } }, data: { status: NotificationStatus.CANCELLED } });
    if (assigneeChanged || reminderChanged) await queueTaskAutomation(updated, assigneeChanged, reminderChanged);
  } else if (!updated.assigneeId || updated.status === TaskStatus.DONE) {
    await prisma.notification.updateMany({ where: { relatedEntityId: taskId, kind: { in: [NotificationKind.TASK_ASSIGNED, NotificationKind.TASK_REMINDER] }, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } }, data: { status: NotificationStatus.CANCELLED } });
  }
  refreshStartup(task.startupId);
}

async function queueTaskAutomation(task: { id: string; startupId: string | null; assigneeId: string | null; title: string; dueDate: Date | null }, assignment: boolean, reminder: boolean) {
  if (!task.startupId || !task.assigneeId) return;
  const [startup, assignee] = await Promise.all([
    prisma.startup.findUniqueOrThrow({ where: { id: task.startupId }, select: { name: true } }),
    prisma.person.findUniqueOrThrow({ where: { id: task.assigneeId }, select: { id: true, name: true, email: true } }),
  ]);
  const dueDate = task.dueDate?.toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }) ?? 'No due date';
  const variables = { name: assignee.name, startupName: startup.name, taskTitle: task.title, dueDate, appUrl: `${APP_URL()}/work` };
  const jobs = [];
  if (assignment) jobs.push(queueTemplatedNotification({ recipientId: assignee.id, recipientEmail: assignee.email, kind: NotificationKind.TASK_ASSIGNED, templateKey: NotificationTemplateKey.TASK_ASSIGNED, variables, relatedEntityType: 'Task', relatedEntityId: task.id }));
  if (reminder && task.dueDate) jobs.push(queueTemplatedNotification({ recipientId: assignee.id, recipientEmail: assignee.email, kind: NotificationKind.TASK_REMINDER, templateKey: NotificationTemplateKey.TASK_REMINDER, variables, relatedEntityType: 'Task', relatedEntityId: task.id, scheduledFor: new Date(task.dueDate.getTime() - 24 * 60 * 60 * 1000) }));
  await Promise.all(jobs);
}

export async function deleteTaskAction(formData: FormData) {
  const taskId = requiredText(formData, 'taskId', 64);
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (!task.startupId) throw new Error('Program-level task deletion is not enabled here.');
  const session = await requireStartupAccess(task.startupId, 'task:manage');
  if (!canDeleteTaskRecord(session.user, task)) throw new Error('Only the task creator or program team can delete this task.');
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
  const lane = session.user.role === Role.MENTOR ? MilestoneStakeholderLane.MENTOR : MilestoneStakeholderLane.PROGRAM;
  const laneState = decision === ReviewDecision.APPROVED ? MilestoneStakeholderState.APPROVED : decision === ReviewDecision.REVISION_REQUESTED ? MilestoneStakeholderState.NEEDS_REVISION : MilestoneStakeholderState.IN_PROGRESS;
  await prisma.$transaction(async (tx) => {
    await tx.milestoneReview.create({ data: { milestoneId, reviewerId: session.user.id, decision, feedback: optionalText(formData, 'feedback', 2500) } });
    const status = await setMilestoneLaneState(tx, { milestoneId, lane, state: laneState, updatedById: session.user.id, note: optionalText(formData, 'feedback', 2500) });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: milestone.startupId, entityType: 'Milestone', entityId: milestoneId, action: 'reviewed', summary: `${milestone.title}: ${decision.replaceAll('_', ' ')}`, meta: { from: milestone.status, to: status, lane } }) });
  });
  refreshStartup(milestone.startupId);
}

export async function reviewMilestoneWithFeedbackAction(_previous: ActionFeedback, formData: FormData): Promise<ActionFeedback> {
  try {
    await reviewMilestoneAction(formData);
    return { status: 'success', message: 'Review submitted!' };
  } catch (error) {
    return { status: 'error', message: actionMessage(error, 'The review could not be submitted.') };
  }
}

export async function updateMilestoneStakeholderStatusAction(formData: FormData) {
  const session = await requireSession();
  const milestoneId = requiredText(formData, 'milestoneId', 64);
  const milestone = await prisma.milestone.findUniqueOrThrow({ where: { id: milestoneId }, select: { startupId: true, title: true } });
  await requireStartupAccess(milestone.startupId);
  const lane = enumValue(MilestoneStakeholderLane, formData.get('lane'), 'lane');
  const state = enumValue(MilestoneStakeholderState, formData.get('state'), 'state');
  const allowedLane = session.user.role === Role.FOUNDER
    ? MilestoneStakeholderLane.STARTUP
    : session.user.role === Role.MENTOR
      ? MilestoneStakeholderLane.MENTOR
      : session.user.role === Role.PROGRAM_LEAD || session.user.role === Role.PROGRAM_TEAM
        ? MilestoneStakeholderLane.PROGRAM
        : null;
  if (lane !== allowedLane) throw new Error('You can update only your role status.');
  const laneStates: Record<MilestoneStakeholderLane, MilestoneStakeholderState[]> = {
    STARTUP: [MilestoneStakeholderState.NOT_STARTED, MilestoneStakeholderState.IN_PROGRESS, MilestoneStakeholderState.SUBMITTED, MilestoneStakeholderState.BLOCKED],
    MENTOR: [MilestoneStakeholderState.NOT_STARTED, MilestoneStakeholderState.IN_PROGRESS, MilestoneStakeholderState.APPROVED, MilestoneStakeholderState.NEEDS_REVISION],
    PROGRAM: [MilestoneStakeholderState.NOT_STARTED, MilestoneStakeholderState.IN_PROGRESS, MilestoneStakeholderState.APPROVED, MilestoneStakeholderState.NEEDS_REVISION],
  };
  if (!laneStates[lane].includes(state)) throw new Error('That status is not available for this role.');
  await prisma.$transaction(async (tx) => {
    const before = await tx.milestoneStakeholderStatus.findUnique({ where: { milestoneId_lane: { milestoneId, lane } }, select: { state: true } });
    await setMilestoneLaneState(tx, { milestoneId, lane, state, updatedById: session.user.id, note: optionalText(formData, 'note', 1000) });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: milestone.startupId, entityType: 'Milestone', entityId: milestoneId, action: 'stakeholder_status_updated', summary: `${milestone.title}: ${lane.toLowerCase()} marked ${state.replaceAll('_', ' ').toLowerCase()}`, meta: { lane, from: before?.state ?? MilestoneStakeholderState.NOT_STARTED, to: state } }) });
  });
  refreshStartup(milestone.startupId);
}

export async function updateMilestoneStatusWithFeedbackAction(_previous: ActionFeedback, formData: FormData): Promise<ActionFeedback> {
  try {
    await updateMilestoneStakeholderStatusAction(formData);
    return { status: 'success', message: 'Milestone status updated!' };
  } catch (error) {
    return { status: 'error', message: actionMessage(error, 'The milestone status could not be updated.') };
  }
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
  const audience = enumValue(SupportAudience, formData.get('audience') ?? SupportAudience.STARTUP_AND_MENTORS, 'audience');
  const requestedParticipantIds = [...new Set(formData.getAll('participantId').filter((value): value is string => typeof value === 'string'))];
  const eligibleParticipants = requestedParticipantIds.length ? await prisma.person.findMany({
    where: { id: { in: requestedParticipantIds }, isActive: true, OR: [{ role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] } }, { founderOfStartupId: startupId }, { startupMemberships: { some: { startupId, isActive: true } } }, { assignments: { some: { startupId } } }] },
    select: { id: true },
  }) : [];
  if (eligibleParticipants.length !== requestedParticipantIds.length) throw new Error('One or more selected people do not belong to this startup workspace.');
  const participantIds = new Set(eligibleParticipants.map((person) => person.id));
  participantIds.add(session.user.id);
  if (audience === SupportAudience.SELECTED_PEOPLE && participantIds.size < 2) throw new Error('Select at least one person for this conversation.');
  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.supportRequest.create({ data: { startupId, requestedById: session.user.id, title: requiredText(formData, 'title', 220), description: optionalText(formData, 'description', 2500), priority: enumValue(Priority, formData.get('priority'), 'priority'), dueDate: optionalDate(formData, 'dueDate'), audience, participants: { create: [...participantIds].map((personId) => ({ personId })) } } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'SupportRequest', entityId: created.id, action: 'created', summary: `Requested support: ${created.title}` }) });
    return created;
  });
  const startup = await prisma.startup.findUniqueOrThrow({
    where: { id: startupId },
    select: {
      name: true,
      assignments: {
        where: { role: { in: [AssignmentRole.MENTOR, AssignmentRole.EXPERT] }, person: { isActive: true } },
        select: { person: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  await prisma.notification.createMany({
    data: startup.assignments.map(({ person }) => {
      const template = supportOpportunityTemplate({ mentorName: person.name, startupName: startup.name, requestTitle: request.title, description: request.description, url: `${APP_URL()}/support` });
      return { recipientId: person.id, recipientEmail: person.email, kind: NotificationKind.SUPPORT_OPPORTUNITY, subject: template.subject, htmlBody: template.html, textBody: template.text, relatedEntityType: 'SupportRequest', relatedEntityId: request.id };
    }),
  });
  revalidatePath('/notifications');
  refreshStartup(startupId);
  void request.id;
}

export async function updateSupportAction(formData: FormData) {
  const requestId = requiredText(formData, 'requestId', 64);
  const request = await prisma.supportRequest.findUniqueOrThrow({ where: { id: requestId } });
  const session = await requireStartupAccess(request.startupId, 'support:manage');
  const status = enumValue(SupportRequestStatus, formData.get('status'), 'status');
  const programManager = isProgramRole(session.user.role);
  const requestedAssigneeId = programManager ? optionalText(formData, 'assignedToId', 64) : request.assignedToId;
  if (programManager && requestedAssigneeId) {
    const validAssignee = await prisma.person.count({ where: { id: requestedAssigneeId, isActive: true, OR: [{ role: { in: [Role.PROGRAM_LEAD, Role.PROGRAM_TEAM] } }, { assignments: { some: { startupId: request.startupId } } }] } });
    if (!validAssignee) throw new Error('Support owner must belong to this startup workspace.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.supportRequest.update({ where: { id: requestId }, data: { status, assignedToId: requestedAssigneeId, outcome: optionalText(formData, 'outcome', 2000), dueDate: programManager ? optionalDate(formData, 'dueDate') : request.dueDate, resolvedAt: status === SupportRequestStatus.RESOLVED ? request.resolvedAt ?? new Date() : null } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: request.startupId, entityType: 'SupportRequest', entityId: requestId, action: 'updated', summary: `${request.title}: ${status.replaceAll('_', ' ')}`, meta: { from: request.status, to: status } }) });
  });
  refreshStartup(request.startupId);
}

export async function deleteSupportAction(formData: FormData) {
  const requestId = requiredText(formData, 'requestId', 64);
  const request = await prisma.supportRequest.findUniqueOrThrow({ where: { id: requestId } });
  const session = await requireStartupAccess(request.startupId, 'support:manage');
  if (!canDeleteSupportRequest(session.user.role)) throw new Error('Only the program team can delete support requests.');
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
  if (!validPassword(password)) throw new Error('Temporary password must contain at least 6 characters.');
  const role = enumValue(Role, formData.get('role'), 'role');
  const startupId = role === Role.FOUNDER ? optionalText(formData, 'founderOfStartupId', 64) : null;
  const passwordHash = await hash(password, 12);
  const person = await prisma.$transaction(async (tx) => {
    const hasOwner = startupId ? await tx.startupMembership.count({ where: { startupId, role: StartupMemberRole.OWNER, isActive: true } }) : 0;
    const created = await tx.person.create({ data: { name: requiredText(formData, 'name', 160), email, phone: optionalText(formData, 'phone', 40), role, passwordHash, mustChangePassword: true, founderOfStartupId: startupId && !hasOwner ? startupId : null } });
    if (startupId) await tx.startupMembership.create({ data: { startupId, personId: created.id, role: hasOwner ? StartupMemberRole.MEMBER : StartupMemberRole.OWNER } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Person', entityId: created.id, action: 'created', summary: `Created ${role.replaceAll('_', ' ').toLowerCase()} account for ${created.name}` }) });
    return created;
  });
  await queueTemplatedNotification({
    recipientId: person.id,
    recipientEmail: person.email,
    kind: NotificationKind.ACCOUNT_WELCOME,
    templateKey: NotificationTemplateKey.ACCOUNT_WELCOME,
    variables: { name: person.name, role: role === Role.FOUNDER ? 'incubatee' : role.replaceAll('_', ' ').toLowerCase(), appUrl: `${APP_URL()}/login` },
    relatedEntityType: 'Person',
    relatedEntityId: person.id,
  });
  revalidatePath('/settings');
  revalidatePath('/notifications');
  revalidatePath('/people');
  revalidatePath('/audit');
}

export async function updateFounderStartupAccessAction(_previous: ActionFeedback, formData: FormData): Promise<ActionFeedback> {
  try {
    const session = await requirePermission('people:manage');
    const personId = requiredText(formData, 'personId', 64);
    const startupId = optionalText(formData, 'startupId', 64);
    const membershipRole = enumValue(StartupMemberRole, formData.get('membershipRole'), 'membershipRole');
    const confirmed = formData.get('confirmOwnershipChange') === 'on';
    const person = await prisma.person.findUniqueOrThrow({
      where: { id: personId },
      select: { name: true, email: true, role: true, founderOfStartupId: true, startupMemberships: { where: { isActive: true }, select: { startupId: true, role: true } } },
    });
    if (person.role !== Role.FOUNDER) throw new Error('Choose an incubatee account.');

    if (!startupId) {
      if (!confirmed) throw new Error('Confirm the access change before unlinking this incubatee.');
      await prisma.$transaction(async (tx) => {
        await tx.person.update({ where: { id: personId }, data: { founderOfStartupId: null } });
        await tx.startupMembership.updateMany({ where: { personId, isActive: true }, data: { isActive: false } });
        await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Person', entityId: personId, action: 'founder_startup_unlinked', summary: `${person.name}: startup access removed`, meta: { previousPrimaryStartupId: person.founderOfStartupId, previousMemberships: person.startupMemberships } }) });
      });
      revalidatePath('/settings');
      revalidatePath('/startups');
      revalidatePath('/audit');
      return { status: 'success', message: `${person.name} is no longer linked to a startup.` };
    }

    const startup = await prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true, founder: { select: { id: true, name: true } }, memberships: { where: { role: StartupMemberRole.OWNER, isActive: true, personId: { not: personId } }, select: { personId: true, person: { select: { name: true } } } } } });
    const currentOwner = startup.founder && startup.founder.id !== personId ? startup.founder : startup.memberships[0]?.person;
    const movingPrimary = Boolean(person.founderOfStartupId && person.founderOfStartupId !== startupId);
    const demotingPrimary = person.founderOfStartupId === startupId && membershipRole !== StartupMemberRole.OWNER;
    if ((movingPrimary || demotingPrimary || (membershipRole === StartupMemberRole.OWNER && currentOwner)) && !confirmed) {
      throw new Error(currentOwner ? `${startup.name} already has owner ${currentOwner.name}. Confirm ownership transfer to continue.` : 'Confirm the ownership change to continue.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.startupMembership.updateMany({ where: { personId, startupId: { not: startupId }, isActive: true }, data: { isActive: false } });
      if (membershipRole === StartupMemberRole.OWNER) {
        await tx.person.updateMany({ where: { founderOfStartupId: startupId, id: { not: personId } }, data: { founderOfStartupId: null } });
        await tx.startupMembership.updateMany({ where: { startupId, personId: { not: personId }, role: StartupMemberRole.OWNER, isActive: true }, data: { role: StartupMemberRole.ADMIN } });
      }
      await tx.startupMembership.upsert({
        where: { startupId_personId: { startupId, personId } },
        update: { role: membershipRole, isActive: true },
        create: { startupId, personId, role: membershipRole, isActive: true },
      });
      await tx.person.update({ where: { id: personId }, data: { founderOfStartupId: membershipRole === StartupMemberRole.OWNER ? startupId : null } });
      await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'Person', entityId: personId, action: 'founder_startup_access_updated', summary: `${person.name}: linked to ${startup.name} as ${membershipRole.toLowerCase()}`, meta: { previousPrimaryStartupId: person.founderOfStartupId, previousMemberships: person.startupMemberships, startupId, membershipRole, replacedOwner: currentOwner?.name ?? null } }) });
    });
    revalidatePath('/');
    revalidatePath('/settings');
    revalidatePath('/startups');
    revalidatePath(`/startups/${startupId}`);
    revalidatePath('/audit');
    return { status: 'success', message: `${person.name} now has ${membershipRole.toLowerCase()} access to ${startup.name}.` };
  } catch (error) {
    return { status: 'error', message: actionMessage(error, 'Incubatee startup access could not be updated.') };
  }
}

export async function shareStartupWithInvestorAction(formData: FormData) {
  const session = await requirePermission('people:manage');
  const startupId = requiredText(formData, 'startupId', 64);
  const investorId = requiredText(formData, 'investorId', 64);
  const [startup, investor] = await Promise.all([
    prisma.startup.findUniqueOrThrow({ where: { id: startupId }, select: { name: true } }),
    prisma.person.findUniqueOrThrow({ where: { id: investorId }, select: { name: true, role: true, isActive: true } }),
  ]);
  if (investor.role !== Role.INVESTOR || !investor.isActive) throw new Error('Choose an active investor account.');
  const canViewDocuments = formData.get('canViewDocuments') === 'on';
  await prisma.$transaction(async (tx) => {
    const share = await tx.investorStartupShare.upsert({ where: { startupId_investorId: { startupId, investorId } }, update: { canViewDocuments }, create: { startupId, investorId, canViewDocuments } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId, entityType: 'InvestorStartupShare', entityId: share.id, action: 'shared', summary: `Shared approved ${startup.name} progress with ${investor.name}`, meta: { canViewDocuments } }) });
  });
  revalidatePath('/settings');
  revalidatePath('/portfolio');
}

export async function removeInvestorShareAction(formData: FormData) {
  const session = await requirePermission('people:manage');
  const shareId = requiredText(formData, 'shareId', 64);
  const share = await prisma.investorStartupShare.findUniqueOrThrow({ where: { id: shareId }, include: { startup: { select: { name: true } }, investor: { select: { name: true } } } });
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({ data: auditData({ actor: session.user, startupId: share.startupId, entityType: 'InvestorStartupShare', entityId: share.id, action: 'unshared', summary: `Removed ${share.investor.name}'s access to ${share.startup.name}` }) });
    await tx.investorStartupShare.delete({ where: { id: share.id } });
  });
  revalidatePath('/settings');
  revalidatePath('/portfolio');
}

export async function updatePersonAccessAction(formData: FormData) {
  const session = await requirePermission('people:manage');
  const personId = requiredText(formData, 'personId', 64);
  if (personId === session.user.id && formData.get('isActive') !== 'on') throw new Error('You cannot deactivate your own account.');
  const before = await prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { name: true, email: true, phone: true, role: true, isActive: true } });
  const name = requiredText(formData, 'name', 160);
  const email = requiredText(formData, 'email', 254).toLowerCase();
  const phone = optionalText(formData, 'phone', 40);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
  const role = enumValue(Role, formData.get('role'), 'role');
  const isActive = formData.get('isActive') === 'on';
  if (before.role === Role.PROGRAM_LEAD && before.isActive && (role !== Role.PROGRAM_LEAD || !isActive)) {
    const otherLeads = await prisma.person.count({ where: { id: { not: personId }, role: Role.PROGRAM_LEAD, isActive: true } });
    if (otherLeads === 0) throw new Error('Create another active Program Lead before changing this account.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.person.update({ where: { id: personId }, data: { name, email, phone, role, isActive } });
    if (!isActive) await tx.authSession.updateMany({ where: { personId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Person', entityId: personId, action: 'account_updated', summary: `${before.name}: account details and access updated`, meta: { before, after: { name, email, phone, role, isActive } } }) });
  });
  revalidatePath('/settings');
  revalidatePath('/directory');
  revalidatePath('/audit');
}

export async function archivePersonAction(formData: FormData) {
  const session = await requirePermission('people:manage');
  const personId = requiredText(formData, 'personId', 64);
  if (personId === session.user.id) throw new Error('You cannot delete your own account.');
  const person = await prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { name: true, role: true, isActive: true } });
  if (person.role === Role.PROGRAM_LEAD && person.isActive) {
    const otherLeads = await prisma.person.count({ where: { id: { not: personId }, role: Role.PROGRAM_LEAD, isActive: true } });
    if (otherLeads === 0) throw new Error('The final active Program Lead cannot be deleted.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.person.update({ where: { id: personId }, data: { isActive: false } });
    await tx.authSession.updateMany({ where: { personId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Person', entityId: personId, action: 'account_archived', summary: `${person.name}: user access deleted and account archived` }) });
  });
  revalidatePath('/settings');
  revalidatePath('/directory');
  revalidatePath('/audit');
}

export async function resetPersonPasswordAction(formData: FormData) {
  const session = await requirePermission('people:manage');
  const personId = requiredText(formData, 'personId', 64);
  const password = text(formData, 'password', 256);
  if (!validPassword(password)) throw new Error('Password must contain at least 6 characters.');
  const person = await prisma.person.findUniqueOrThrow({ where: { id: personId }, select: { name: true } });
  await prisma.$transaction(async (tx) => {
    await tx.person.update({ where: { id: personId }, data: { passwordHash: await hash(password, 12), mustChangePassword: false } });
    await tx.authSession.updateMany({ where: { personId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.activityLog.create({ data: auditData({ actor: session.user, entityType: 'Person', entityId: personId, action: 'password_reset', summary: `${person.name}: password updated by administrator` }) });
  });
  revalidatePath('/settings');
  revalidatePath('/audit');
}
