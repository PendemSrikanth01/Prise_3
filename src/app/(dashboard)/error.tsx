'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="flex min-h-[70vh] items-center justify-center p-5"><section className="w-full max-w-lg rounded-card border bg-white p-7 text-center shadow-card"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger"><AlertTriangle size={22} /></div><h1 className="mt-4 text-xl font-bold">This action could not be completed</h1><p className="mt-2 text-sm leading-6 text-prise-text-secondary">{safeMessage(error.message)}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={reset} className="inline-flex items-center gap-2 rounded-button bg-prise-primary px-4 py-2.5 text-sm font-semibold text-white"><RotateCcw size={15} />Try again</button><Link href="/" className="rounded-button border px-4 py-2.5 text-sm font-semibold">Return home</Link></div>{error.digest ? <p className="mt-5 text-[11px] text-prise-text-secondary">Reference: {error.digest}</p> : null}</section></div>;
}

function safeMessage(message: string) {
  if (!message || message === 'Forbidden') return 'You may not have access to this action, or the record changed. Refresh the page and try again.';
  if (/prisma|database|sql|stack|digest/i.test(message)) return 'The request could not be saved. Refresh the page and try again, or share the reference number with the administrator.';
  return message;
}
