'use client';

import { useActionState } from 'react';
import { ArrowRight, LoaderCircle, UserPlus } from 'lucide-react';
import { registerAction } from '@/app/actions/auth';

const inputClass = 'h-[54px] w-full rounded-xl border border-[#d8d8dd] bg-white px-4 text-sm text-[#171717] outline-none transition placeholder:text-[#9999a1] focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10';

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="register-name" name="name" label="Your name" autoComplete="name" placeholder="Full name" />
        <Field id="startup-name" name="startupName" label="Startup name" autoComplete="organization" placeholder="Your startup" />
      </div>
      <Field id="register-email" name="email" label="Email" type="email" autoComplete="email" placeholder="you@organisation.org" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="register-password" name="password" label="Password" type="password" autoComplete="new-password" placeholder="Minimum 6 characters" minLength={6} maxLength={128} />
        <Field id="confirm-password" name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat password" minLength={6} maxLength={128} />
      </div>
      <p className="text-xs leading-5 text-[#6e6e73]">This creates a startup-member account. Program administrators control privileged roles.</p>
      {state?.error ? <div role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-[#b3121a]">{state.error}</div> : null}
      <button disabled={pending} className="group flex h-[58px] w-full items-center justify-center gap-4 rounded-xl bg-gradient-to-r from-[#ed1c24] to-[#d6161d] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgb(237_28_36/20%)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">
        {pending ? <LoaderCircle className="animate-spin" size={18} /> : <UserPlus size={18} />}
        <span>{pending ? 'Creating account…' : 'Create startup account'}</span>
        {!pending ? <ArrowRight className="transition group-hover:translate-x-1" size={19} /> : null}
      </button>
    </form>
  );
}

function Field({ id, name, label, type = 'text', autoComplete, placeholder, minLength, maxLength }: { id: string; name: string; label: string; type?: string; autoComplete: string; placeholder: string; minLength?: number; maxLength?: number }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-[#171717]">{label}</label><input id={id} name={name} type={type} autoComplete={autoComplete} required minLength={minLength} maxLength={maxLength} className={inputClass} placeholder={placeholder} /></div>;
}
