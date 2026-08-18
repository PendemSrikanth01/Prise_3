import Link from 'next/link';
import { MilestoneStatus, ReviewDecision, Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { reviewMilestoneAction } from '@/app/actions/workflows';
import { SubmitButton } from '@/components/ui/FormButtons';
import { accessibleStartupWhere, hasPermission, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const inputClass = 'h-11 rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';

export default async function ReviewsPage() {
  const auth = await requireSession();
  if (auth.user.role === Role.INVESTOR) redirect('/portfolio');
  const scope = accessibleStartupWhere(auth.user);
  const canReview = hasPermission(auth.user.role, 'milestone:review');
  const milestones = await prisma.milestone.findMany({ where: { startup: scope, status: { in: [MilestoneStatus.SUBMITTED, MilestoneStatus.NEEDS_REVISION, MilestoneStatus.IN_PROGRESS] } }, include: { startup: { select: { name: true } }, reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }], take: 150 });
  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8"><div><h1 className="text-2xl font-bold tracking-tight">Reviews</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Give focused feedback where a mentee is waiting or needs a course correction.</p></div><div className="mt-6 space-y-3">{milestones.map((milestone) => <section key={milestone.id} className="rounded-card border bg-white p-5 shadow-card"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.08em] text-prise-primary">{milestone.startup.name}</div><h2 className="mt-1 font-semibold">{milestone.title}</h2><p className="mt-2 text-sm text-prise-text-secondary">{milestone.deliverable || milestone.keyActivity || 'Review milestone progress and agree the next action.'}</p></div><span className="w-fit rounded-pill bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning">{milestone.status.replaceAll('_', ' ').toLowerCase()}</span></div>{canReview ? <form action={reviewMilestoneAction} className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-[220px_1fr_auto]"><input type="hidden" name="milestoneId" value={milestone.id} /><select name="decision" defaultValue={ReviewDecision.COMMENTED} className={inputClass}>{Object.values(ReviewDecision).map((value) => <option key={value}>{value}</option>)}</select><input name="feedback" required placeholder="Specific feedback and next step" className={inputClass} /><SubmitButton>Record review</SubmitButton></form> : null}{milestone.reviews[0] ? <div className="mt-4 text-xs text-prise-text-secondary">Latest: {milestone.reviews[0].decision.replaceAll('_', ' ').toLowerCase()} by {milestone.reviews[0].reviewer.name}</div> : null}<Link href={`/startups/${milestone.startupId}`} className="mt-4 inline-block text-sm font-semibold text-prise-primary">Open startup →</Link></section>)}{milestones.length === 0 ? <div className="rounded-card border border-dashed p-12 text-center text-sm text-prise-text-secondary">No milestones need review.</div> : null}</div></div>;
}
