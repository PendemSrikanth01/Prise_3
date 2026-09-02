import { MilestoneStatus, NotificationStatus, PrismaClient } from '@prisma/client';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

const prisma = new PrismaClient();

async function main() {
  const activeStatuses = Object.values(MilestoneStatus).filter((status) => status !== MilestoneStatus.NOT_STARTED);
  const [milestones, stakeholderUpdates, reviews, evidence, pendingNotifications] = await Promise.all([
    prisma.milestone.count({ where: { OR: [{ status: { in: activeStatuses } }, { submittedAt: { not: null } }, { approvedAt: { not: null } }, { evidenceUrl: { not: null } }] } }),
    prisma.milestoneStakeholderStatus.count(),
    prisma.milestoneReview.count(),
    prisma.deliverable.findMany({ select: { storageKey: true, sizeBytes: true } }),
    prisma.notification.count({ where: { status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] }, relatedEntityType: { in: ['Milestone', 'Deliverable'] } } }),
  ]);
  const bytes = evidence.reduce((total, file) => total + (file.sizeBytes ?? 0), 0);
  const uploadRoot = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  const storedKeys = [...new Set(evidence.map(({ storageKey }) => storageKey))];
  const existingStoredFiles = (await Promise.all(storedKeys.map(async (storageKey) => {
    if (!/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(storageKey)) return false;
    try { await access(join(uploadRoot, storageKey)); return true; } catch { return false; }
  }))).filter(Boolean).length;
  console.log(JSON.stringify({ mode: 'DRY_RUN_ONLY', wouldResetMilestones: milestones, wouldRemoveStakeholderUpdates: stakeholderUpdates, wouldRemoveReviews: reviews, wouldRemoveEvidenceRecords: evidence.length, uniqueStoredFiles: storedKeys.length, existingStoredFiles, missingStoredFiles: storedKeys.length - existingStoredFiles, storedEvidenceBytes: bytes, wouldCancelPendingNotifications: pendingNotifications, preserved: ['accounts', 'profiles', 'startups', 'mentor assignments', 'templates', 'resources', 'meetings', 'tasks', 'directory', 'audit history'] }, null, 2));
}

main().finally(() => prisma.$disconnect());
