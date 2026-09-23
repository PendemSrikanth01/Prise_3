import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return <main className="flex min-h-screen items-center justify-center p-5"><section className="w-full max-w-md rounded-card border bg-white p-8 text-center shadow-card"><WifiOff size={32} className="mx-auto text-prise-primary" /><div className="mt-4 text-xs font-bold uppercase tracking-[.15em] text-prise-primary">PrISE 3.0</div><h1 className="mt-2 text-2xl font-bold">You are offline</h1><p className="mt-3 text-sm leading-6 text-prise-text-secondary">Reconnect to load current mentoring, task and meeting information. For privacy, account pages are not stored offline.</p><Link href="/" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-button bg-prise-primary px-5 text-sm font-semibold text-white">Try again</Link></section></main>;
}
