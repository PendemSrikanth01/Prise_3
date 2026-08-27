'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';

const inputClass = 'h-11 w-full rounded-input border border-prise-border bg-white px-4 text-[15px] text-prise-text outline-none transition placeholder:text-prise-text-muted focus:border-prise-primary focus:ring-4 focus:ring-prise-primary/10';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-prise-text">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} placeholder="you@organisation.org" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-prise-text">Password</label>
        <div className="relative">
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className={`${inputClass} pr-14`} placeholder="Your secure password" />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-prise-text-secondary transition hover:text-prise-primary">
            {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
          </button>
        </div>
      </div>
      {state?.error ? <div role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-[#b3121a]">{state.error}</div> : null}
      <button disabled={pending} className="group flex h-12 w-full items-center justify-center gap-4 rounded-button bg-prise-action px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgb(229_57_61/20%)] transition hover:bg-prise-action-hover disabled:opacity-60">
        {pending ? <LoaderCircle className="animate-spin" size={19} /> : <LockKeyhole size={19} />}
        <span>{pending ? 'Signing in…' : 'Sign in securely'}</span>
        {!pending ? <ArrowRight className="transition group-hover:translate-x-1" size={20} /> : null}
      </button>
    </form>
  );
}
