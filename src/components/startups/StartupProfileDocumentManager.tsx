'use client';

import { useActionState } from 'react';
import { FileUp, Trash2 } from 'lucide-react';
import { removeStartupProfilePdfAction, type StartupProfileFeedback, uploadStartupProfilePdfAction } from '@/app/actions/startup-profile';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';

const initialState: StartupProfileFeedback = { status: 'idle', message: '' };

export function StartupProfileDocumentManager({ startupId, currentName }: { startupId: string; currentName: string | null }) {
  const [state, action] = useActionState(uploadStartupProfilePdfAction, initialState);
  return <section className="glass-surface rounded-card p-4 sm:p-5" aria-labelledby="profile-document-title">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 id="profile-document-title" className="font-bold">Incubatee profile document</h2>
        <p className="mt-1 text-sm text-prise-text-secondary">Upload one PDF for the directory. Re-uploading safely replaces the current file.</p>
        {currentName ? <p className="mt-2 text-xs font-semibold text-prise-primary">Current: {currentName}</p> : <p className="mt-2 text-xs font-semibold text-warning">No PDF attached</p>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input type="hidden" name="startupId" value={startupId} />
          <label className="cursor-pointer rounded-button border bg-white/80 px-3 py-2 text-sm font-semibold text-prise-text-secondary transition hover:border-prise-primary hover:text-prise-primary">
            Choose PDF
            <input name="profilePdf" type="file" accept="application/pdf,.pdf" required className="sr-only" />
          </label>
          <SubmitButton className="inline-flex items-center justify-center gap-2"><FileUp size={16} />{currentName ? 'Replace PDF' : 'Attach PDF'}</SubmitButton>
        </form>
        {currentName ? <form action={removeStartupProfilePdfAction}><input type="hidden" name="startupId" value={startupId} /><ConfirmButton message="Remove this incubatee profile PDF?" className="inline-flex min-h-10 items-center justify-center gap-2"><Trash2 size={15} />Remove</ConfirmButton></form> : null}
      </div>
    </div>
    {state.message ? <p role="status" className={`mt-3 text-sm font-semibold ${state.status === 'success' ? 'text-success' : 'text-danger'}`}>{state.message}</p> : null}
  </section>;
}
