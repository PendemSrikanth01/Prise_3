'use client';

import { useActionState } from 'react';
import { ArrowLeft, LoaderCircle, Mail } from 'lucide-react';
import { requestPasswordResetAction } from '@/app/actions/auth';

const inputClass = 'h-11 w-full rounded-input border border-prise-border bg-white px-4 text-[15px] text-prise-text outline-none transition placeholder:text-prise-text-muted focus:border-prise-primary focus:ring-4 focus:ring-prise-primary/10';

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);
  return <div>
    {state?.success ? <div className="space-y-4"><div role="status" className="rounded-xl bg-success-bg px-4 py-3 text-sm leading-6 text-success">{state.success}</div><button type="button" onClick={onBack} className="flex h-11 w-full items-center justify-center gap-2 rounded-button border border-prise-border bg-white text-sm font-semibold text-prise-text-secondary hover:border-prise-primary hover:text-prise-primary"><ArrowLeft size={17} />Back to sign in</button></div> : <form action={action} className="space-y-5">
      <div><label htmlFor="reset-email" className="mb-2 block text-sm font-semibold text-prise-text">Account email</label><input id="reset-email" name="email" type="email" autoComplete="email" required autoFocus className={inputClass} placeholder="you@organisation.org" /></div>
      {state?.error ? <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{state.error}</div> : null}
      <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-3 rounded-button bg-prise-action px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgb(229_57_61/20%)] transition hover:bg-prise-action-hover disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={19} /> : <Mail size={19} />}{pending ? 'Sending secure link…' : 'Send reset link'}</button>
      <button type="button" onClick={onBack} className="flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-prise-text-secondary hover:text-prise-primary"><ArrowLeft size={17} />Back to sign in</button>
    </form>}
  </div>;
}
