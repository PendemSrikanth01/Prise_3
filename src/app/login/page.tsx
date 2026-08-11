import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getSession()) redirect('/');
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_.9fr]">
      <section className="hidden bg-prise-sidebar p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-prise-primary text-lg font-bold">P</div><div><div className="font-semibold">PRISE 3.0</div><div className="text-xs text-white/55">Incubation operating system</div></div></div>
        <div className="max-w-xl"><p className="text-sm font-semibold uppercase tracking-[.14em] text-white/45">Secure workspace</p><h1 className="mt-4 text-5xl font-bold leading-[1.08] tracking-[-.04em]">Move every startup from onboarding to measurable progress.</h1><p className="mt-6 max-w-lg text-base leading-7 text-white/62">One reliable place for decisions, milestone evidence, founder support, payments and program accountability.</p></div>
        <div className="flex items-center gap-2 text-sm text-white/50"><ShieldCheck size={17} /> Role-aware access · auditable decisions · private by default</div>
      </section>
      <section className="flex items-center justify-center bg-prise-page p-5 sm:p-10"><div className="w-full max-w-md rounded-[24px] border bg-white p-7 shadow-card sm:p-9"><div className="mb-8 lg:hidden"><div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-prise-primary font-bold text-white">P</div></div><p className="text-sm font-semibold text-prise-primary">Welcome back</p><h2 className="mt-2 text-3xl font-bold tracking-[-.03em]">Sign in to PRISE</h2><p className="mb-7 mt-2 text-sm leading-6 text-prise-text-secondary">Use the account issued by the program lead.</p><LoginForm /></div></section>
    </main>
  );
}

