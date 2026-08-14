'use client';

import { useActionState } from 'react';
import { Paperclip, Upload } from 'lucide-react';
import { uploadDeliverableAction } from '@/app/actions/documents';

export function MilestoneUploadForm({ milestoneId }: { milestoneId: string }) {
  const [state, action, pending] = useActionState(uploadDeliverableAction, undefined);
  return <form action={action} className="rounded-xl border border-dashed border-prise-border bg-white p-4">
    <input type="hidden" name="milestoneId" value={milestoneId} />
    <div className="flex items-center gap-2 text-sm font-semibold"><Paperclip size={16} className="text-prise-primary" />Add progress evidence</div>
    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end">
      <label className="text-xs font-semibold text-prise-text-secondary">File up to 10 MB<input name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx" className="mt-1.5 block h-11 w-full rounded-input border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-button file:border-0 file:bg-prise-page file:px-3 file:py-1 file:text-xs file:font-semibold" /></label>
      <label className="text-xs font-semibold text-prise-text-secondary">Reviewer note<input name="description" maxLength={800} placeholder="What changed or needs review?" className="mt-1.5 h-11 w-full rounded-input border px-3 text-sm font-normal" /></label>
      <button disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white disabled:opacity-50"><Upload size={16} />{pending ? 'Uploading…' : 'Upload'}</button>
    </div>
    <p className="mt-2 text-[11px] text-prise-text-secondary">Images, PDF, Word, Excel, CSV or PowerPoint. Files stay private to the assigned startup team.</p>
    {state?.error ? <p role="alert" className="mt-3 rounded-input bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p> : null}
    {state?.success ? <p role="status" className="mt-3 rounded-input bg-success-bg px-3 py-2 text-sm text-success">{state.success}</p> : null}
  </form>;
}
