'use client';

import Link from 'next/link';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-prise-page p-5"><section className="w-full max-w-md rounded-card border bg-white p-7 text-center shadow-card"><div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">PrISE 3.0</div><h1 className="mt-2 text-2xl font-bold">Something needs another try</h1><p className="mt-3 text-sm leading-6 text-prise-text-secondary">Your data is safe. Retry the request or return to sign in.</p><div className="mt-6 flex justify-center gap-3"><button onClick={reset} className="rounded-button bg-prise-primary px-4 py-2.5 text-sm font-semibold text-white">Try again</button><Link href="/login" className="rounded-button border px-4 py-2.5 text-sm font-semibold">Sign in</Link></div></section></main>;
}
