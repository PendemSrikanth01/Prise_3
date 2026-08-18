'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';

const inputClass = 'h-[58px] w-full rounded-xl border border-[#d8d8dd] bg-white px-5 text-[15px] text-[#171717] outline-none transition placeholder:text-[#9999a1] focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <div>
        <label htmlFor="email" className="mb-2.5 block text-sm font-semibold text-[#171717]">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} placeholder="you@organisation.org" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2.5 block text-sm font-semibold text-[#171717]">Password</label>
        <div className="relative">
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className={`${inputClass} pr-14`} placeholder="Your secure password" />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#505058] transition hover:text-[#ed1c24]">
            {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
          </button>
        </div>
      </div>
      {state?.error ? <div role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-[#b3121a]">{state.error}</div> : null}
      <button disabled={pending} className="group flex h-[60px] w-full items-center justify-center gap-5 rounded-xl bg-gradient-to-r from-[#ed1c24] to-[#d6161d] px-5 text-[15px] font-bold text-white shadow-[0_12px_28px_rgb(237_28_36/20%)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgb(237_28_36/28%)] disabled:translate-y-0 disabled:opacity-60">
        {pending ? <LoaderCircle className="animate-spin" size={19} /> : <LockKeyhole size={19} />}
        <span>{pending ? 'Signing in…' : 'Sign in securely'}</span>
        {!pending ? <ArrowRight className="transition group-hover:translate-x-1" size={20} /> : null}
      </button>
    </form>
  );
}
