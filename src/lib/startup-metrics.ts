import 'server-only';

import {
  AssignmentRole,
  DeliverableStatus,
  MilestoneStakeholderState,
  MilestoneStatus,
  OnboardingStatus,
  PaymentStatus,
  Prisma,
  StartupStatus,
  SupportRequestStatus,
  TaskStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const OFFICIAL_COHORT_WHERE = {
  cohort: 'PrISE 3.0',
  sNo: { not: null },
} satisfies Prisma.StartupWhereInput;

const pulseInclude = {
  onboardingItems: { select: { type: true, status: true } },
  milestones: {
    select: {
      id: true,
      phase: true,
      title: true,
      status: true,
      dueDate: true,
      deliverables: { select: { status: true } },
      stakeholderStatuses: { select: { state: true } },
      tasks: { select: { title: true, status: true, dueDate: true, blockedReason: true } },
    },
  },
  assignments: {
    where: { role: AssignmentRole.MENTOR },
    select: { person: { select: { id: true, name: true } } },
  },
  supportRequests: {
    where: { status: { in: [SupportRequestStatus.OPEN, SupportRequestStatus.ASSIGNED, SupportRequestStatus.IN_PROGRESS] } },
    select: { title: true, priority: true, dueDate: true, status: true },
  },
  paymentInstallments: { select: { status: true, dueDate: true } },
} satisfies Prisma.StartupInclude;

type PulseStartup = Prisma.StartupGetPayload<{ include: typeof pulseInclude }>;
export type StartupPulse = ReturnType<typeof calculateStartupPulse>;

export async function getStartupPulses(options?: { activeOnly?: boolean }) {
  const startups = await prisma.startup.findMany({
    where: {
      ...OFFICIAL_COHORT_WHERE,
      ...(options?.activeOnly ? { status: { in: [StartupStatus.ACTIVE, StartupStatus.NEEDS_ATTENTION] } } : {}),
    },
    include: pulseInclude,
    orderBy: { sNo: 'asc' },
  });
  return startups.map(calculateStartupPulse);
}

export function calculateStartupPulse(startup: PulseStartup) {
  const now = new Date();
  const considered = startup.milestones.filter((milestone) => milestone.status !== MilestoneStatus.NA);
  const done = considered.filter((milestone) => milestone.status === MilestoneStatus.APPROVED).length;
  const left = considered.length - done;
  const incomplete = considered.filter((milestone) => milestone.status !== MilestoneStatus.APPROVED);
  const currentPhase = incomplete.length
    ? Math.min(...incomplete.map((milestone) => milestone.phase))
    : considered.length
      ? Math.max(...considered.map((milestone) => milestone.phase))
      : 1;
  const phaseMilestones = considered.filter((milestone) => milestone.phase === currentPhase);
  const phaseDone = phaseMilestones.filter((milestone) => milestone.status === MilestoneStatus.APPROVED).length;
  const overdueMilestones = incomplete.filter((milestone) => milestone.dueDate && milestone.dueDate < now);
  const tasks = considered.flatMap((milestone) => milestone.tasks.map((task) => ({ ...task, milestoneTitle: milestone.title })));
  const overdueTasks = tasks.filter((task) => task.status !== TaskStatus.DONE && task.dueDate && task.dueDate < now);
  const blockedTasks = tasks.filter((task) => task.status === TaskStatus.BLOCKED);
  const revisionCount = considered.filter((milestone) => milestone.status === MilestoneStatus.NEEDS_REVISION).length
    + considered.flatMap((milestone) => milestone.deliverables).filter((deliverable) => deliverable.status === DeliverableStatus.NEEDS_REVISION).length;
  const stakeholderBlocks = considered.flatMap((milestone) => milestone.stakeholderStatuses).filter((lane) => lane.state === MilestoneStakeholderState.BLOCKED).length;
  const readyStatuses = new Set<OnboardingStatus>([OnboardingStatus.SUBMITTED, OnboardingStatus.APPROVED, OnboardingStatus.NA]);
  const onboardingReady = startup.onboardingItems.filter((item) => readyStatuses.has(item.status)).length;
  const onboardingPending = startup.onboardingItems.length - onboardingReady;
  const overduePayments = startup.paymentInstallments.filter((payment) => payment.status === PaymentStatus.OVERDUE || (payment.status === PaymentStatus.PENDING && payment.dueDate < now)).length;
  const mentor = startup.assignments[0]?.person ?? null;
  const urgentSupport = startup.supportRequests.filter((request) => request.priority === 'HIGH').length;
  const submittedFiles = considered.flatMap((milestone) => milestone.deliverables).filter((deliverable) => deliverable.status !== DeliverableStatus.ARCHIVED).length;
  const paid = Number(startup.totalFeePaid ?? 0);
  const agreed = Number(startup.agreedFee ?? 0);

  let health: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  let healthReason = 'No active blocker recorded';
  if (revisionCount > 0) {
    health = 'RED'; healthReason = `${revisionCount} submission${revisionCount === 1 ? '' : 's'} need revision`;
  } else if (overdueMilestones.length + overdueTasks.length + overduePayments > 0) {
    const total = overdueMilestones.length + overdueTasks.length + overduePayments;
    health = 'RED'; healthReason = `${total} overdue commitment${total === 1 ? '' : 's'}`;
  } else if (blockedTasks.length + stakeholderBlocks > 0) {
    health = 'RED'; healthReason = `${blockedTasks.length + stakeholderBlocks} blocked item${blockedTasks.length + stakeholderBlocks === 1 ? '' : 's'}`;
  } else if (urgentSupport > 0) {
    health = 'RED'; healthReason = `${urgentSupport} high-priority support request${urgentSupport === 1 ? '' : 's'}`;
  } else if (considered.length === 0) {
    health = 'YELLOW'; healthReason = 'Milestones are not assigned yet';
  } else if (!mentor) {
    health = 'YELLOW'; healthReason = 'Mentor is not assigned';
  } else if (onboardingPending > 0) {
    health = 'YELLOW'; healthReason = `${onboardingPending} onboarding item${onboardingPending === 1 ? '' : 's'} pending`;
  }

  const nextMilestone = [...incomplete].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.phase - b.phase;
  })[0];
  const nextAction = overdueTasks[0]?.title
    ?? overdueMilestones[0]?.title
    ?? (revisionCount ? 'Review requested changes' : null)
    ?? (onboardingPending ? 'Complete onboarding evidence' : null)
    ?? nextMilestone?.title
    ?? 'Set the next milestone';

  return {
    id: startup.id,
    sNo: startup.sNo,
    name: startup.name,
    status: startup.status,
    state: startup.state ?? 'Not recorded',
    sector: startup.sector ?? 'Not recorded',
    legalStructure: startup.legalStructure ?? 'Not recorded',
    currentPhase,
    milestones: { done, left, total: considered.length, percent: considered.length ? Math.round(done / considered.length * 100) : 0 },
    phaseProgress: { done: phaseDone, total: phaseMilestones.length },
    onboarding: { ready: onboardingReady, total: startup.onboardingItems.length, pending: onboardingPending },
    payment: { paid, agreed, percent: agreed ? Math.min(100, Math.round(paid / agreed * 100)) : 0, overdue: overduePayments },
    mentor,
    nextAction,
    files: submittedFiles,
    reviewsNeeded: revisionCount,
    health,
    healthReason,
  };
}
