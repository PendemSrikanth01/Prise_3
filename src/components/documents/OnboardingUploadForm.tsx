'use client';

import { useActionState } from 'react';
import { Upload } from 'lucide-react';
import { uploadOnboardingDocumentAction } from '@/app/actions/documents';

export function OnboardingUploadForm({ onboardingItemId }: { onboardingItemId: string }) {
  const [state, action, pending] = useActionState(uploadOnboardingDocumentAction, undefined);
  return <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <input type="hidden" name="onboardingItemId" value={onboardingItemId} />
    <label className="text-xs font-semibold text-prise-text-secondary">Evidence file<input name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx" className="mt-1.5 block h-10 w-full rounded-input border bg-white px-2 py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-prise-page file:px-2 file:py-1" /></label>
    <label className="text-xs font-semibold text-prise-text-secondary">Submission note<input name="description" maxLength={800} placeholder="What should be reviewed?" className="mt-1.5 h-10 w-full rounded-input border px-3 text-sm font-normal" /></label>
    <button disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-prise-primary px-3 text-sm font-semibold text-white disabled:opacity-50"><Upload size={15} />{pending ? 'Uploading…' : 'Submit'}</button>
    {state?.error ? <p className="text-xs text-danger sm:col-span-3">{state.error}</p> : null}{state?.success ? <p className="text-xs text-success sm:col-span-3">{state.success}</p> : null}
  </form>;
}
