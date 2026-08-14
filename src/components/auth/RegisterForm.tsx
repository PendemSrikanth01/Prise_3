'use client';

import { useActionState } from 'react';
import { ArrowRight, LoaderCircle, UserPlus } from 'lucide-react';
import { registerAction } from '@/app/actions/auth';

const inputClass = 'h-12 w-full rounded-input border bg-white px-4 text-sm outline-none transition focus:border-prise-primary';

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field id="register-name" name="name" label="Your name" autoComplete="name" placeholder="Full name" />
      <Field id="startup-name" name="startupName" label="Startup name" autoComplete="organization" placeholder="Your startup" />
      <Field id="register-email" name="email" label="Email" type="email" autoComplete="email" placeholder="you@organisation.org" />
      <Field id="register-password" name="password" label="Password" type="password" autoComplete="new-password" placeholder="Minimum 6 characters" minLength={6} maxLength={128} />
      <Field id="confirm-password" name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat your password" minLength={6} maxLength={128} />
      <p className="text-xs leading-5 text-prise-text-secondary">Registration creates a startup-member account. Program administrators control privileged roles.</p>
      {state?.error ? <div role="alert" className="rounded-input bg-danger-bg px-4 py-3 text-sm text-danger">{state.error}</div> : null}
      <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white transition hover:bg-prise-primary-hover disabled:opacity-60">
        {pending ? <LoaderCircle className="animate-spin" size={18} /> : <UserPlus size={18} />}
        {pending ? 'Creating account…' : 'Create account'}
        {!pending ? <ArrowRight size={17} /> : null}
      </button>
    </form>
  );
}

function Field({ id, name, label, type = 'text', autoComplete, placeholder, minLength, maxLength }: { id: string; name: string; label: string; type?: string; autoComplete: string; placeholder: string; minLength?: number; maxLength?: number }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium text-prise-text">{label}</label><input id={id} name={name} type={type} autoComplete={autoComplete} required minLength={minLength} maxLength={maxLength} className={inputClass} placeholder={placeholder} /></div>;
}
