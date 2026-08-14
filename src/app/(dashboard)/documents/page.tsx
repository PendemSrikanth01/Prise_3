import { Archive, Download, FileText } from 'lucide-react';
import { DeliverableStatus } from '@prisma/client';
import { archiveDeliverableAction, reviewDeliverableAction } from '@/app/actions/documents';
import { UploadForm } from '@/components/documents/UploadForm';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { accessibleStartupWhere, hasPermission, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const inputClass = 'h-10 rounded-input border bg-white px-3 text-sm';

export default async function DocumentsPage() {
  const auth = await requireSession();
  const scope = accessibleStartupWhere(auth.user);
  const canUpload = hasPermission(auth.user.role, 'deliverable:upload');
  const canReview = hasPermission(auth.user.role, 'deliverable:review');
  const milestones = await prisma.milestone.findMany({
    where: { startup: scope },
    orderBy: [{ startup: { name: 'asc' } }, { phase: 'asc' }, { dueDate: 'asc' }],
    include: { startup: { select: { name: true } }, deliverables: { where: { status: { not: DeliverableStatus.ARCHIVED } }, include: { uploader: { select: { name: true } }, reviewer: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } },
  });
  const uploadOptions = milestones.map((item) => ({ id: item.id, title: item.title, startupName: item.startup.name }));
  const documents = milestones.flatMap((item) => item.deliverables);

  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
    <div><h1 className="text-2xl font-bold tracking-tight">Documents</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Milestone evidence, reviewer feedback and version history in one private workspace.</p></div>
    {canUpload ? <section className="mt-6 rounded-card border bg-white p-5 shadow-card sm:p-6"><h2 className="font-semibold">Upload milestone evidence</h2><div className="mt-5"><UploadForm milestones={uploadOptions} /></div></section> : null}
    <div className="mt-5 space-y-4">{milestones.filter((item) => item.deliverables.length > 0).map((milestone) => <section key={milestone.id} className="overflow-hidden rounded-card border bg-white shadow-card">
      <div className="border-b bg-[#fafafe] px-5 py-4"><div className="text-xs font-semibold text-prise-primary">{milestone.startup.name} · Phase {milestone.phase}</div><h2 className="mt-1 font-semibold">{milestone.title}</h2></div>
      <div className="divide-y">{milestone.deliverables.map((document) => <div key={document.id} className="px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prise-page text-prise-primary"><FileText size={18} /></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{document.name}</div><div className="mt-1 text-xs text-prise-text-secondary">Version {document.version} · {formatBytes(document.sizeBytes)} · {document.uploader?.name ?? 'Unknown'} · {document.createdAt.toLocaleDateString('en-IN')}</div></div></div><Status value={document.status} /><a href={`/api/documents/${document.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-prise-primary"><Download size={15} />Download</a></div>
        {document.description ? <p className="mt-3 text-sm text-prise-text-secondary">{document.description}</p> : null}
        {document.feedback ? <div className="mt-3 rounded-input bg-prise-page px-3 py-2 text-sm text-prise-text-secondary"><strong className="text-prise-text">Reviewer feedback:</strong> {document.feedback}{document.reviewer ? ` — ${document.reviewer.name}` : ''}</div> : null}
        {canReview ? <form key={`${document.id}-${document.status}-${document.feedback ?? ''}`} action={reviewDeliverableAction} className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-[190px_1fr_auto]"><input type="hidden" name="deliverableId" value={document.id} /><select name="status" defaultValue={document.status === DeliverableStatus.APPROVED ? DeliverableStatus.APPROVED : DeliverableStatus.NEEDS_REVISION} className={inputClass}><option value={DeliverableStatus.APPROVED}>Approve</option><option value={DeliverableStatus.NEEDS_REVISION}>Needs revision</option><option value={DeliverableStatus.ARCHIVED}>Archive</option></select><input name="feedback" defaultValue={document.feedback ?? ''} placeholder="Specific feedback and next action" className={inputClass} /><SubmitButton className="!py-2">Save review</SubmitButton></form> : document.status !== DeliverableStatus.APPROVED ? <form action={archiveDeliverableAction} className="mt-3"><input type="hidden" name="deliverableId" value={document.id} /><ConfirmButton message="Archive this document version?"><Archive size={14} className="mr-1 inline" />Archive</ConfirmButton></form> : null}
      </div>)}</div>
    </section>)}{documents.length === 0 ? <div className="rounded-card border border-dashed p-12 text-center text-sm text-prise-text-secondary">No milestone evidence has been uploaded yet.</div> : null}</div>
  </div>;
}

function Status({ value }: { value: DeliverableStatus }) { const tone = value === DeliverableStatus.APPROVED ? 'bg-success-bg text-success' : value === DeliverableStatus.NEEDS_REVISION ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'; return <span className={`w-fit rounded-pill px-2.5 py-1 text-xs font-semibold ${tone}`}>{value.replaceAll('_', ' ').toLowerCase()}</span>; }
function formatBytes(value: number | null) { if (!value) return 'Unknown size'; return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`; }
