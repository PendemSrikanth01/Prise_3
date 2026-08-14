'use client';

import { useActionState } from 'react';
import { changePasswordAction } from '@/app/actions/auth';

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <PasswordField name="currentPassword" label="Current password" autoComplete="current-password" />
      <PasswordField name="newPassword" label="New password" autoComplete="new-password" constrained />
      <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" constrained />
      <p className="text-xs leading-5 text-prise-text-secondary">Use at least 6 characters. No special character or number is required.</p>
      {state?.error ? <div role="alert" className="rounded-input bg-danger-bg px-4 py-3 text-sm text-danger">{state.error}</div> : null}
      <button disabled={pending} className="h-11 w-full rounded-button bg-prise-primary text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Updating…' : 'Update password'}</button>
    </form>
  );
}

function PasswordField({ name, label, autoComplete, constrained = false }: { name: string; label: string; autoComplete: string; constrained?: boolean }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-medium">{label}</label><input id={name} name={name} type="password" autoComplete={autoComplete} required minLength={constrained ? 6 : undefined} maxLength={constrained ? 128 : undefined} className="h-12 w-full rounded-input border bg-white px-4 outline-none focus:border-prise-primary" /></div>;
}
