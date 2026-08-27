import Image from 'next/image';

export function BvcsrbLogo({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/brand/bvcsrb-logo.png" alt="Bala Vikasa Center for Social and Responsible Business" width={880} height={156} priority={priority} sizes="(max-width: 768px) 240px, 420px" className={`h-auto w-full ${className}`} />;
}

export function PriseWordmark({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return <div className={`relative h-8 overflow-hidden rounded-lg bg-[#faf8f5] ${className}`}><Image src="/brand/prise-3-wordmark.png" alt="PrISE 3.0" width={1672} height={941} priority={priority} sizes="180px" className="absolute left-0 top-1/2 h-auto w-full -translate-y-1/2" /></div>;
}

export function BrandLockup({ variant = 'light', priority = false, className = '' }: { variant?: 'sidebar' | 'login' | 'light'; priority?: boolean; className?: string }) {
  if (variant === 'sidebar') return <div className={`rounded-card border border-prise-border bg-white p-3 ${className}`}><BvcsrbLogo priority={priority} /><div className="mt-2 flex items-center gap-2 border-t border-prise-border pt-2"><PriseWordmark priority={priority} className="h-6 w-[104px] shrink-0" /><span className="text-[10px] font-semibold leading-3 text-prise-text-secondary">Incubation tracker</span></div></div>;

  if (variant === 'login') return <div className={`rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgb(0_0_0/16%)] ${className}`}><BvcsrbLogo priority={priority} /><div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-100 pt-3"><PriseWordmark priority={priority} className="h-8 w-[150px] shrink-0" /><span className="text-right text-[11px] font-semibold leading-4 text-slate-500">Incubation operating system</span></div></div>;

  return <div className={`rounded-xl border border-prise-border bg-white p-3 ${className}`}><BvcsrbLogo priority={priority} /><div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2"><PriseWordmark priority={priority} className="h-6 w-[104px] shrink-0" /><span className="text-[10px] font-semibold text-slate-500">Application workspace</span></div></div>;
}
