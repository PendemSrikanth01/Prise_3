'use client';

import { useActionState } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-prise-text">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="h-12 w-full rounded-input border bg-white px-4 text-sm outline-none transition focus:border-prise-primary" placeholder="you@organisation.org" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-prise-text">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="h-12 w-full rounded-input border bg-white px-4 text-sm outline-none transition focus:border-prise-primary" placeholder="Your secure password" />
      </div>
      {state?.error ? <div role="alert" className="rounded-input bg-danger-bg px-4 py-3 text-sm text-danger">{state.error}</div> : null}
      <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white transition hover:bg-prise-primary-hover disabled:opacity-60">
        {pending ? <LoaderCircle className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
        {pending ? 'Signing in…' : 'Sign in securely'}
        {!pending ? <ArrowRight size={17} /> : null}
      </button>
    </form>
  );
}

