import { Archive, Download, FileText } from 'lucide-react';
import { DeliverableStatus, Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { archiveDeliverableAction, reviewDeliverableAction, reviewProgramEvidenceAction } from '@/app/actions/documents';
import { UploadForm } from '@/components/documents/UploadForm';
import { ProgramEvidenceUploadForm } from '@/components/documents/ProgramEvidenceUploadForm';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { accessibleStartupWhere, hasPermission, isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const inputClass = 'h-10 rounded-input border bg-white px-3 text-sm';

export default async function DocumentsPage() {
  const auth = await requireSession();
  if (auth.user.role === Role.INVESTOR) redirect('/portfolio');
  const scope = accessibleStartupWhere(auth.user);
  const canUpload = hasPermission(auth.user.role, 'deliverable:upload');
  const canReview = hasPermission(auth.user.role, 'deliverable:review');
  const [milestones, programActions] = await Promise.all([prisma.milestone.findMany({
    where: { startup: scope },
    orderBy: [{ startup: { name: 'asc' } }, { phase: 'asc' }, { dueDate: 'asc' }],
    include: { startup: { select: { name: true } }, deliverables: { where: { status: { not: DeliverableStatus.ARCHIVED } }, include: { uploader: { select: { name: true } }, reviewer: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } },
  }), isProgramRole(auth.user.role) ? prisma.programAction.findMany({ where: { lifecycle: { not: 'ARCHIVED' } }, orderBy: [{ phase: 'asc' }, { position: 'asc' }], include: { subtasks: { orderBy: { position: 'asc' }, select: { id: true, title: true } }, evidence: { where: { status: { not: DeliverableStatus.ARCHIVED } }, include: { uploader: { select: { name: true } }, reviewer: { select: { name: true } }, subtask: { select: { title: true } } }, orderBy: { createdAt: 'desc' } } } }) : Promise.resolve([])]);
  const uploadOptions = milestones.map((item) => ({ id: item.id, title: item.title, startupName: item.startup.name }));
  const documents = milestones.flatMap((item) => item.deliverables);

  const programEvidence = programActions.flatMap((item) => item.evidence);
  const programOptions = programActions.map((item) => ({ id: item.id, title: item.title, phase: item.phase, subtasks: item.subtasks }));

  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
    <div><div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Private evidence library</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Files &amp; Evidence</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Startup milestone files and program action proof in one secure, reviewable workspace.</p></div>
    {canUpload ? <section className="mt-6 rounded-card border bg-white p-5 shadow-card sm:p-6"><h2 className="font-semibold">Upload milestone evidence</h2><div className="mt-5"><UploadForm milestones={uploadOptions} /></div></section> : null}
    {isProgramRole(auth.user.role) ? <section className="mt-4 rounded-card border bg-white p-5 shadow-card sm:p-6"><h2 className="font-semibold">Upload program evidence</h2><p className="mt-1 text-xs text-prise-text-secondary">Attach proof to the 8-phase program action plan or a checklist item.</p><div className="mt-5"><ProgramEvidenceUploadForm actions={programOptions} /></div></section> : null}
    {programActions.filter((item) => item.evidence.length > 0).map((item) => <section key={item.id} className="mt-5 overflow-hidden rounded-card border bg-white shadow-card"><div className="border-b bg-[#fafafe] px-5 py-4"><div className="text-xs font-semibold text-prise-primary">Program action · Phase {item.phase}</div><h2 className="mt-1 font-semibold">{item.title}</h2></div><div className="divide-y">{item.evidence.map((document) => <div key={document.id} className="px-5 py-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-purple-bg text-accent-purple"><FileText size={18} /></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{document.name}</div><div className="mt-1 text-xs text-prise-text-secondary">Version {document.version} · {formatBytes(document.sizeBytes)} · {document.uploader?.name ?? 'Unknown'} · {document.createdAt.toLocaleDateString('en-IN')}{document.subtask ? ` · ${document.subtask.title}` : ''}</div></div></div><Status value={document.status} /><a href={`/api/documents/${document.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-prise-primary"><Download size={15} />Download</a></div>{document.description ? <p className="mt-3 text-sm text-prise-text-secondary">{document.description}</p> : null}{document.feedback ? <div className="mt-3 rounded-input bg-prise-page px-3 py-2 text-sm text-prise-text-secondary"><strong className="text-prise-text">Reviewer feedback:</strong> {document.feedback}{document.reviewer ? ` — ${document.reviewer.name}` : ''}</div> : null}<form action={reviewProgramEvidenceAction} className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-[190px_1fr_auto]"><input type="hidden" name="programEvidenceId" value={document.id} /><select name="status" defaultValue={document.status === DeliverableStatus.APPROVED ? DeliverableStatus.APPROVED : DeliverableStatus.NEEDS_REVISION} className={inputClass}><option value={DeliverableStatus.APPROVED}>Approve</option><option value={DeliverableStatus.NEEDS_REVISION}>Needs revision</option><option value={DeliverableStatus.ARCHIVED}>Archive</option></select><input name="feedback" defaultValue={document.feedback ?? ''} placeholder="Specific feedback and next action" className={inputClass} /><SubmitButton className="!py-2">Save review</SubmitButton></form></div>)}</div></section>)}
    <div className="mt-5 space-y-4">{milestones.filter((item) => item.deliverables.length > 0).map((milestone) => <section key={milestone.id} className="overflow-hidden rounded-card border bg-white shadow-card">
      <div className="border-b bg-[#fafafe] px-5 py-4"><div className="text-xs font-semibold text-prise-primary">{milestone.startup.name} · Phase {milestone.phase}</div><h2 className="mt-1 font-semibold">{milestone.title}</h2></div>
      <div className="divide-y">{milestone.deliverables.map((document) => <div key={document.id} className="px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prise-page text-prise-primary"><FileText size={18} /></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{document.name}</div><div className="mt-1 text-xs text-prise-text-secondary">Version {document.version} · {formatBytes(document.sizeBytes)} · {document.uploader?.name ?? 'Unknown'} · {document.createdAt.toLocaleDateString('en-IN')}</div></div></div><Status value={document.status} /><a href={`/api/documents/${document.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-prise-primary"><Download size={15} />Download</a></div>
        {document.description ? <p className="mt-3 text-sm text-prise-text-secondary">{document.description}</p> : null}
        {document.feedback ? <div className="mt-3 rounded-input bg-prise-page px-3 py-2 text-sm text-prise-text-secondary"><strong className="text-prise-text">Reviewer feedback:</strong> {document.feedback}{document.reviewer ? ` — ${document.reviewer.name}` : ''}</div> : null}
        {canReview ? <form key={`${document.id}-${document.status}-${document.feedback ?? ''}`} action={reviewDeliverableAction} className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-[190px_1fr_auto]"><input type="hidden" name="deliverableId" value={document.id} /><select name="status" defaultValue={document.status === DeliverableStatus.APPROVED ? DeliverableStatus.APPROVED : DeliverableStatus.NEEDS_REVISION} className={inputClass}><option value={DeliverableStatus.APPROVED}>Approve</option><option value={DeliverableStatus.NEEDS_REVISION}>Needs revision</option><option value={DeliverableStatus.ARCHIVED}>Archive</option></select><input name="feedback" defaultValue={document.feedback ?? ''} placeholder="Specific feedback and next action" className={inputClass} /><SubmitButton className="!py-2">Save review</SubmitButton></form> : document.status !== DeliverableStatus.APPROVED ? <form action={archiveDeliverableAction} className="mt-3"><input type="hidden" name="deliverableId" value={document.id} /><ConfirmButton message="Archive this document version?"><Archive size={14} className="mr-1 inline" />Archive</ConfirmButton></form> : null}
      </div>)}</div>
    </section>)}{documents.length + programEvidence.length === 0 ? <div className="rounded-card border border-dashed p-12 text-center text-sm text-prise-text-secondary">No evidence has been uploaded yet.</div> : null}</div>
  </div>;
}

function Status({ value }: { value: DeliverableStatus }) { const tone = value === DeliverableStatus.APPROVED ? 'bg-success-bg text-success' : value === DeliverableStatus.NEEDS_REVISION ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'; return <span className={`w-fit rounded-pill px-2.5 py-1 text-xs font-semibold ${tone}`}>{value.replaceAll('_', ' ').toLowerCase()}</span>; }
function formatBytes(value: number | null) { if (!value) return 'Unknown size'; return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`; }
