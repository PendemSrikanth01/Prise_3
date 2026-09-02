'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Circle, Clock3, Download, Eye, FileText, MessageSquareText, Trash2 } from 'lucide-react';
import { DeliverableStatus, MilestoneStatus, MilestoneStakeholderLane, MilestoneStakeholderState, Prisma, ReviewDecision, Role } from '@prisma/client';
import { archiveDeliverableAction, reviewDeliverableAction } from '@/app/actions/documents';
import { reviewMilestoneWithFeedbackAction, updateMilestoneStatusWithFeedbackAction, type ActionFeedback } from '@/app/actions/workflows';
import { MilestoneUploadForm } from '@/components/documents/MilestoneUploadForm';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { useToast } from '@/components/ui/ToastProvider';

type MilestoneItem = Prisma.MilestoneGetPayload<{ include: {
  template: { select: { phaseName: true } };
  stakeholderStatuses: { include: { updatedBy: { select: { name: true } } } };
  deliverables: { include: { uploader: { select: { name: true } }; reviewer: { select: { name: true } } } };
  reviews: { include: { reviewer: { select: { name: true } } } };
} }>;
type Props = { startupId: string; milestones: MilestoneItem[]; role: Role; currentUserId: string; canAssign: boolean; canReview: boolean; canUpload: boolean };
const inputClass = 'h-10 w-full rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase();

export function MilestonePlan({ startupId, milestones, role, currentUserId, canAssign, canReview, canUpload }: Props) {
  const editableLane = role === Role.FOUNDER ? MilestoneStakeholderLane.STARTUP : role === Role.MENTOR ? MilestoneStakeholderLane.MENTOR : role === Role.PROGRAM_LEAD || role === Role.PROGRAM_TEAM ? MilestoneStakeholderLane.PROGRAM : null;
  const phases = [...milestones.reduce((groups, milestone) => {
    const key = `${milestone.phase}|${milestone.template?.phaseName ?? `Phase ${milestone.phase}`}`;
    const group = groups.get(key) ?? [];
    group.push(milestone);
    groups.set(key, group);
    return groups;
  }, new Map<string, MilestoneItem[]>()).entries()];
  const [openPhases, setOpenPhases] = useState(() => new Set(phases.slice(0, 1).map(([key]) => key)));
  const [openMilestones, setOpenMilestones] = useState<Set<string>>(() => new Set());
  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => setter((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return <section id="milestones" className="scroll-mt-20 rounded-card border bg-white p-4 shadow-card sm:p-5">
    <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold">Milestone progress</h2><p className="mt-1 text-xs text-prise-text-secondary">See all phases, then open a row only when you need files, comments or an update.</p></div>{canAssign ? <Link href={`/startups/${startupId}/milestones/assign`} className="shrink-0 rounded-button bg-prise-primary px-3 py-2 text-xs font-semibold text-white">Edit plan</Link> : null}</div>
    {milestones.length ? <div className="space-y-2">{phases.map(([phaseKey, items]) => {
      const [phaseNumber, phaseName] = phaseKey.split('|');
      const complete = items.filter((item) => item.status === MilestoneStatus.APPROVED).length;
      const phaseOpen = openPhases.has(phaseKey);
      return <section key={phaseKey} className="overflow-hidden rounded-xl border border-prise-border">
        <button type="button" onClick={() => toggle(setOpenPhases, phaseKey)} aria-expanded={phaseOpen} className="w-full bg-slate-50 px-3 py-2.5 text-left"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-prise-primary">Phase {phaseNumber}</span><span className="ml-2 text-sm font-semibold">{phaseName}</span></div><div className="flex shrink-0 items-center gap-2"><span className="text-[11px] font-semibold text-prise-text-secondary">{complete}/{items.length}</span><ChevronDown size={15} className={`transition ${phaseOpen ? 'rotate-180' : ''}`} /></div></div></button>
        {phaseOpen ? <div className="space-y-1.5 p-2">{items.map((milestone) => {
          const startupState = resolvedLaneState(milestone.status, MilestoneStakeholderLane.STARTUP, milestone.stakeholderStatuses.find((item) => item.lane === MilestoneStakeholderLane.STARTUP)?.state);
          const mentorState = resolvedLaneState(milestone.status, MilestoneStakeholderLane.MENTOR, milestone.stakeholderStatuses.find((item) => item.lane === MilestoneStakeholderLane.MENTOR)?.state);
          const programState = resolvedLaneState(milestone.status, MilestoneStakeholderLane.PROGRAM, milestone.stakeholderStatuses.find((item) => item.lane === MilestoneStakeholderLane.PROGRAM)?.state);
          const milestoneOpen = openMilestones.has(milestone.id);
          return <article key={milestone.id} className={`rounded-lg border ${milestone.isFinalized ? 'border-emerald-200 bg-emerald-50/55' : 'border-rose-200 bg-rose-50/60'}`}>
            <button type="button" onClick={() => toggle(setOpenMilestones, milestone.id)} aria-expanded={milestoneOpen} className="w-full px-3 py-2.5 text-left"><div className="grid items-center gap-2 lg:grid-cols-[minmax(220px,1fr)_auto_auto]">
              <div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{milestone.title}</span><span className={`rounded-pill px-2 py-0.5 text-[9px] font-bold uppercase ${milestone.isFinalized ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{milestone.isFinalized ? 'selected' : 'proposed'}</span></div><p className="mt-0.5 truncate text-[11px] text-prise-text-secondary">{milestone.keyActivity || milestone.deliverable || 'Track the agreed outcome and evidence.'}</p></div>
              <div className="flex flex-wrap gap-1"><LanePill lane={MilestoneStakeholderLane.STARTUP} state={startupState} /><LanePill lane={MilestoneStakeholderLane.MENTOR} state={mentorState} startupState={startupState} /><LanePill lane={MilestoneStakeholderLane.PROGRAM} state={programState} mentorState={mentorState} /></div>
              <div className="flex items-center justify-end gap-2 text-[11px] font-semibold text-prise-primary"><FileText size={13} />Evidence ({milestone.deliverables.length})<ChevronDown size={14} className={`transition ${milestoneOpen ? 'rotate-180' : ''}`} /></div>
            </div></button>
            {milestoneOpen ? <div className="space-y-3 border-t border-black/5 bg-white/85 p-3">
              <EvidenceList milestone={milestone} canReview={canReview} role={role} currentUserId={currentUserId} />
              {canUpload ? <MilestoneUploadForm milestoneId={milestone.id} /> : null}
              {editableLane ? <MilestoneStatusForm milestone={milestone} lane={editableLane} /> : null}
              {milestone.reviews[0] ? <div className="flex items-start gap-2 rounded-input bg-prise-page p-3 text-xs text-prise-text-secondary"><MessageSquareText size={14} className="mt-0.5 shrink-0 text-prise-primary" /><span><strong>{milestone.reviews[0].reviewer.name}:</strong> {label(milestone.reviews[0].decision)}{milestone.reviews[0].feedback ? ` · ${milestone.reviews[0].feedback}` : ''}</span></div> : null}
              {canReview ? <MilestoneReviewForm milestoneId={milestone.id} /> : null}
            </div> : null}
          </article>;
        })}</div> : null}
      </section>;
    })}</div> : <div className="rounded-input border border-dashed bg-prise-page p-5"><p className="text-sm font-semibold">No milestones assigned yet</p><p className="mt-1 text-xs leading-5 text-prise-text-secondary">Select only the outcomes that materially move this startup forward.</p></div>}
  </section>;
}

const initialActionState: ActionFeedback = { status: 'idle', message: '' };

function MilestoneStatusForm({ milestone, lane }: { milestone: MilestoneItem; lane: MilestoneStakeholderLane }) {
  const [state, action] = useActionState(updateMilestoneStatusWithFeedbackAction, initialActionState);
  const { notify } = useToast();
  useEffect(() => { if (state.status !== 'idle') notify(state.message, state.status); }, [state, notify]);
  return <form action={action} className="grid gap-2 sm:grid-cols-[170px_1fr_auto]"><input type="hidden" name="milestoneId" value={milestone.id} /><input type="hidden" name="lane" value={lane} /><select name="state" defaultValue={resolvedLaneState(milestone.status, lane, milestone.stakeholderStatuses.find((item) => item.lane === lane)?.state)} className={inputClass}>{laneStates(lane).map((value) => <option key={value} value={value}>{laneActionLabel(lane, value)}</option>)}</select><input name="note" defaultValue={milestone.stakeholderStatuses.find((item) => item.lane === lane)?.note ?? ''} placeholder={lane === MilestoneStakeholderLane.MENTOR ? 'Mentor comment or correction' : lane === MilestoneStakeholderLane.PROGRAM ? 'Completion note' : 'Progress note for review'} className={inputClass} /><SubmitButton className="!py-2">Save</SubmitButton></form>;
}

function MilestoneReviewForm({ milestoneId }: { milestoneId: string }) {
  const [state, action] = useActionState(reviewMilestoneWithFeedbackAction, initialActionState);
  const { notify } = useToast();
  useEffect(() => { if (state.status !== 'idle') notify(state.message, state.status); }, [state, notify]);
  return <form action={action} className="grid gap-2 sm:grid-cols-[170px_1fr_auto]"><input type="hidden" name="milestoneId" value={milestoneId} /><select name="decision" defaultValue={ReviewDecision.COMMENTED} className={inputClass}>{Object.values(ReviewDecision).map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}</select><input name="feedback" placeholder="Add review comments" className={inputClass} /><SubmitButton className="!py-2">Add review</SubmitButton></form>;
}

function EvidenceList({ milestone, canReview, role, currentUserId }: { milestone: MilestoneItem; canReview: boolean; role: Role; currentUserId: string }) {
  return <section aria-label="Evidence"><div className="mb-2 text-xs font-bold uppercase tracking-[.08em] text-prise-text-secondary">Evidence</div>{milestone.deliverables.length ? <div className="space-y-2">{milestone.deliverables.map((file) => {
    const previewable = file.mimeType === 'application/pdf' || file.mimeType?.startsWith('image/');
    const removable = role === Role.PROGRAM_LEAD || (role === Role.FOUNDER && file.uploaderId === currentUserId && file.status !== DeliverableStatus.APPROVED);
    return <div key={file.id} className="rounded-lg border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">{file.name}</div><div className="mt-1 text-[11px] text-prise-text-secondary">v{file.version} · {file.uploader?.name ?? 'Team member'} · {file.sizeBytes ? `${(file.sizeBytes / 1024 / 1024).toFixed(1)} MB` : 'file'}</div></div><Badge value={file.status} /></div><div className="mt-2 flex flex-wrap items-center gap-1">{previewable ? <details className="w-full"><summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-semibold text-prise-primary hover:bg-prise-page"><Eye size={14} />View</summary><iframe title={`Preview ${file.name}`} src={`/api/documents/${file.id}?view=1`} className="mt-2 h-[min(62vh,560px)] w-full rounded-lg border bg-slate-50" /></details> : <a href={`/api/documents/${file.id}?view=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-semibold text-prise-primary hover:bg-prise-page"><Eye size={14} />View</a>}<a href={`/api/documents/${file.id}`} className="inline-flex items-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-semibold text-prise-primary hover:bg-prise-page"><Download size={14} />Download</a>{removable ? <form action={archiveDeliverableAction}><input type="hidden" name="deliverableId" value={file.id} /><ConfirmButton message={`Remove ${file.name}? The audit record will be retained.`} className="!px-2.5 !py-1.5 !text-xs"><Trash2 size={14} className="mr-1 inline" />Remove</ConfirmButton></form> : null}</div>{file.description ? <p className="mt-2 text-xs text-prise-text-secondary">{file.description}</p> : null}{file.feedback ? <p className="mt-2 rounded-lg bg-prise-page p-2 text-xs text-prise-text-secondary">Review: {file.feedback}</p> : null}{canReview && file.status === DeliverableStatus.SUBMITTED ? <form action={reviewDeliverableAction} className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto]"><input type="hidden" name="deliverableId" value={file.id} /><select name="status" defaultValue={DeliverableStatus.APPROVED} className={inputClass}><option value={DeliverableStatus.APPROVED}>APPROVE</option><option value={DeliverableStatus.NEEDS_REVISION}>NEEDS REVISION</option></select><input name="feedback" placeholder="Review feedback" className={inputClass} /><SubmitButton className="!py-2">Review</SubmitButton></form> : null}</div>;
  })}</div> : <p className="rounded-lg border border-dashed p-3 text-xs text-prise-text-secondary">No evidence added. You can update progress without uploading a document.</p>}</section>;
}

function Badge({ value }: { value: string }) { return <span className="shrink-0 rounded-pill bg-prise-page px-2.5 py-1 text-[11px] font-semibold text-prise-text-secondary">{label(value)}</span>; }

function LanePill({ lane, state, startupState, mentorState }: { lane: MilestoneStakeholderLane; state: MilestoneStakeholderState; startupState?: MilestoneStakeholderState; mentorState?: MilestoneStakeholderState }) {
  const positive = state === MilestoneStakeholderState.APPROVED || state === MilestoneStakeholderState.SUBMITTED;
  const attention = state === MilestoneStakeholderState.NEEDS_REVISION || state === MilestoneStakeholderState.BLOCKED;
  const Icon = positive ? CheckCircle2 : state === MilestoneStakeholderState.IN_PROGRESS ? Clock3 : attention ? AlertCircle : Circle;
  const tone = positive ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : attention ? 'border-rose-200 bg-rose-100 text-rose-700' : state === MilestoneStakeholderState.IN_PROGRESS ? 'border-amber-200 bg-amber-100 text-amber-700' : 'border-slate-200 bg-white text-slate-500';
  let stateLabel = label(state);
  if (lane === MilestoneStakeholderLane.MENTOR && state === MilestoneStakeholderState.NOT_STARTED && startupState === MilestoneStakeholderState.SUBMITTED) stateLabel = 'review requested';
  if (lane === MilestoneStakeholderLane.PROGRAM && state === MilestoneStakeholderState.APPROVED) stateLabel = 'completed';
  if (lane === MilestoneStakeholderLane.PROGRAM && state === MilestoneStakeholderState.NOT_STARTED && mentorState === MilestoneStakeholderState.APPROVED) stateLabel = 'ready';
  return <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[9px] font-semibold ${tone}`} title={`${label(lane)}: ${stateLabel}`}><Icon size={11} /><span className="uppercase">{label(lane)}</span><span className="hidden sm:inline">· {stateLabel}</span></span>;
}

function laneActionLabel(lane: MilestoneStakeholderLane, state: MilestoneStakeholderState) {
  if (lane === MilestoneStakeholderLane.STARTUP && state === MilestoneStakeholderState.SUBMITTED) return 'Submit / ask for review';
  if (lane === MilestoneStakeholderLane.MENTOR && state === MilestoneStakeholderState.APPROVED) return 'Approve milestone';
  if (lane === MilestoneStakeholderLane.MENTOR && state === MilestoneStakeholderState.NEEDS_REVISION) return 'Request changes';
  if (lane === MilestoneStakeholderLane.PROGRAM && state === MilestoneStakeholderState.APPROVED) return 'Mark completed';
  if (lane === MilestoneStakeholderLane.PROGRAM && state === MilestoneStakeholderState.NEEDS_REVISION) return 'Return for correction';
  return label(state);
}

function laneStates(lane: MilestoneStakeholderLane) { return lane === MilestoneStakeholderLane.STARTUP ? [MilestoneStakeholderState.NOT_STARTED, MilestoneStakeholderState.IN_PROGRESS, MilestoneStakeholderState.SUBMITTED, MilestoneStakeholderState.BLOCKED] : [MilestoneStakeholderState.NOT_STARTED, MilestoneStakeholderState.IN_PROGRESS, MilestoneStakeholderState.APPROVED, MilestoneStakeholderState.NEEDS_REVISION]; }
function resolvedLaneState(overall: MilestoneStatus, lane: MilestoneStakeholderLane, actual?: MilestoneStakeholderState) { if (actual) return actual; if (overall === MilestoneStatus.APPROVED) return lane === MilestoneStakeholderLane.STARTUP ? MilestoneStakeholderState.SUBMITTED : MilestoneStakeholderState.APPROVED; if (lane === MilestoneStakeholderLane.STARTUP && overall === MilestoneStatus.SUBMITTED) return MilestoneStakeholderState.SUBMITTED; if (overall === MilestoneStatus.IN_PROGRESS) return MilestoneStakeholderState.IN_PROGRESS; if (overall === MilestoneStatus.NEEDS_REVISION && lane === MilestoneStakeholderLane.STARTUP) return MilestoneStakeholderState.BLOCKED; return MilestoneStakeholderState.NOT_STARTED; }
