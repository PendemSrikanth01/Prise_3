import Image from 'next/image';

export function BvcsrbLogo({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/brand/bvcsrb-logo.png" alt="Bala Vikasa Center for Social and Responsible Business" width={880} height={156} priority={priority} sizes="(max-width: 768px) 240px, 420px" className={`h-auto w-full ${className}`} />;
}

export function PriseWordmark({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  void priority;
  return <div aria-label="PrISE 3.0" className={`inline-flex items-baseline gap-1.5 whitespace-nowrap ${className}`}><span className="text-[1.35rem] font-black tracking-[-.055em] text-current">Pr<span className="text-prise-action">I</span>SE</span><span className="text-[.62rem] font-bold tracking-[.12em] text-prise-primary">3.0</span></div>;
}

export function BrandLockup({ variant = 'light', priority = false, className = '' }: { variant?: 'sidebar' | 'login' | 'light'; priority?: boolean; className?: string }) {
  if (variant === 'sidebar') return <div className={`glass-surface rounded-card p-3 ${className}`}><BvcsrbLogo priority={priority} /><div className="mt-2 flex items-center gap-3 border-t border-prise-border/70 pt-2"><PriseWordmark priority={priority} className="shrink-0 text-prise-text" /><span className="text-[10px] font-semibold leading-3 text-prise-text-secondary">Incubation tracker</span></div></div>;

  if (variant === 'login') return <div className={`rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm ${className}`}><BvcsrbLogo priority={priority} /><div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-100 pt-2.5"><PriseWordmark priority={priority} className="shrink-0 text-prise-text" /><span className="text-right text-[11px] font-semibold tracking-wide text-slate-500">Incubation tracker</span></div></div>;

  return <div className={`glass-surface rounded-xl p-3 ${className}`}><BvcsrbLogo priority={priority} /><div className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-2"><PriseWordmark priority={priority} className="shrink-0 text-prise-text" /><span className="text-[10px] font-semibold text-slate-500">Incubation tracker</span></div></div>;
}
