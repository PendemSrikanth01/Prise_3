'use client';

import { useActionState, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { resetPasswordAction } from '@/app/actions/auth';

const inputClass = 'h-11 w-full rounded-input border border-prise-border bg-white px-4 pr-12 text-[15px] text-prise-text outline-none transition placeholder:text-prise-text-muted focus:border-prise-primary focus:ring-4 focus:ring-prise-primary/10';

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  return <form action={action} className="space-y-4">
    <input type="hidden" name="token" value={token} />
    <div><label htmlFor="new-password" className="mb-2 block text-sm font-semibold">New password</label><div className="relative"><input id="new-password" name="newPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} className={inputClass} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-prise-text-secondary">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
    <div><label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold">Confirm password</label><input id="confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} className={inputClass} /></div>
    {state?.error ? <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{state.error}</div> : null}
    <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-3 rounded-button bg-prise-action px-5 text-sm font-bold text-white transition hover:bg-prise-action-hover disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={19} /> : <LockKeyhole size={19} />}{pending ? 'Updating password…' : 'Update password'}</button>
  </form>;
}
