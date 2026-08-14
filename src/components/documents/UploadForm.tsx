'use client';

import { useActionState } from 'react';
import { Upload } from 'lucide-react';
import { uploadDeliverableAction } from '@/app/actions/documents';

export function UploadForm({ milestones }: { milestones: Array<{ id: string; title: string; startupName: string }> }) {
  const [state, action, pending] = useActionState(uploadDeliverableAction, undefined);
  return <form action={action} className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,1fr)_auto] md:items-end">
    <label className="text-xs font-semibold text-prise-text-secondary">Milestone<select name="milestoneId" required className="mt-2 h-11 w-full rounded-input border bg-white px-3 text-sm font-normal"><option value="">Choose milestone</option>{milestones.map((item) => <option key={item.id} value={item.id}>{item.startupName} · {item.title}</option>)}</select></label>
    <label className="text-xs font-semibold text-prise-text-secondary">Evidence file<input name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx" className="mt-2 block h-11 w-full rounded-input border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-button file:border-0 file:bg-prise-page file:px-3 file:py-1 file:text-xs file:font-semibold" /></label>
    <label className="text-xs font-semibold text-prise-text-secondary">Note<input name="description" maxLength={800} placeholder="What should the reviewer check?" className="mt-2 h-11 w-full rounded-input border px-3 text-sm font-normal" /></label>
    <button disabled={pending || milestones.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white disabled:opacity-50"><Upload size={16} />{pending ? 'Uploading…' : 'Submit evidence'}</button>
    <p className="text-xs text-prise-text-secondary md:col-span-4">Private files only · maximum 10 MB · JPG, PNG, WebP, PDF, Word, Excel, CSV or PowerPoint.</p>
    {state?.error ? <div role="alert" className="rounded-input bg-danger-bg px-3 py-2 text-sm text-danger md:col-span-4">{state.error}</div> : null}
    {state?.success ? <div role="status" className="rounded-input bg-success-bg px-3 py-2 text-sm text-success md:col-span-4">{state.success}</div> : null}
  </form>;
}
