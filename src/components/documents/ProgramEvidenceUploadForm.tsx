'use client';

import { useActionState, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadProgramEvidenceAction } from '@/app/actions/documents';

type ActionOption = { id: string; title: string; phase: number; subtasks: Array<{ id: string; title: string }> };

export function ProgramEvidenceUploadForm({ actions, compact = false }: { actions: ActionOption[]; compact?: boolean }) {
  const [state, action, pending] = useActionState(uploadProgramEvidenceAction, undefined);
  const [selected, setSelected] = useState(actions[0]?.id ?? '');
  const subtasks = useMemo(() => actions.find((item) => item.id === selected)?.subtasks ?? [], [actions, selected]);
  return <form action={action} className={`grid gap-3 ${compact ? 'lg:grid-cols-2' : 'md:grid-cols-[minmax(220px,1fr)_minmax(200px,1fr)_minmax(210px,1fr)_auto]'} md:items-end`}>
    <label className="text-xs font-semibold text-prise-text-secondary">Program action<select name="programActionId" value={selected} onChange={(event) => setSelected(event.target.value)} required className="mt-2 h-11 w-full rounded-input border bg-white px-3 text-sm font-normal"><option value="">Choose action</option>{actions.map((item) => <option key={item.id} value={item.id}>Phase {item.phase} · {item.title}</option>)}</select></label>
    {subtasks.length ? <label className="text-xs font-semibold text-prise-text-secondary">Checklist item (optional)<select name="subtaskId" className="mt-2 h-11 w-full rounded-input border bg-white px-3 text-sm font-normal"><option value="">Whole action</option>{subtasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label> : null}
    <label className="text-xs font-semibold text-prise-text-secondary">Evidence file<input name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx" className="mt-2 block h-11 w-full rounded-input border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-button file:border-0 file:bg-prise-page file:px-3 file:py-1 file:text-xs file:font-semibold" /></label>
    <label className="text-xs font-semibold text-prise-text-secondary">Note<input name="description" maxLength={800} placeholder="What does this prove?" className="mt-2 h-11 w-full rounded-input border px-3 text-sm font-normal" /></label>
    <button disabled={pending || actions.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white disabled:opacity-50"><Upload size={16} />{pending ? 'Uploading…' : 'Add evidence'}</button>
    <p className={`${compact ? 'lg:col-span-2' : 'md:col-span-4'} text-xs text-prise-text-secondary`}>Private · maximum 10 MB · images, PDF, Word, Excel, CSV or PowerPoint.</p>
    {state?.error ? <div role="alert" className={`${compact ? 'lg:col-span-2' : 'md:col-span-4'} rounded-input bg-danger-bg px-3 py-2 text-sm text-danger`}>{state.error}</div> : null}
    {state?.success ? <div role="status" className={`${compact ? 'lg:col-span-2' : 'md:col-span-4'} rounded-input bg-success-bg px-3 py-2 text-sm text-success`}>{state.success}</div> : null}
  </form>;
}
