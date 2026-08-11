// components/ui/dashboard-widgets.tsx

import { LucideIcon, ArrowRight } from 'lucide-react';
import { ReactNode } from 'react';
import Link from 'next/link';

/* -------------------------------------------------------------------------
   StatCard — the KPI card. Number dominates (36px), icon is a soft
   gradient badge (closest achievable to the reference's 3D icon look
   without a custom icon set), color is semantic per card meaning.
   ------------------------------------------------------------------------- */
type StatTone = 'danger' | 'warning' | 'info' | 'success' | 'accent-purple';

const TONE_STYLES: Record<StatTone, { bg: string; icon: string; ring: string }> = {
  danger: { bg: 'bg-danger-bg', icon: 'text-danger', ring: 'ring-danger/10' },
  warning: { bg: 'bg-warning-bg', icon: 'text-warning', ring: 'ring-warning/10' },
  info: { bg: 'bg-info-bg', icon: 'text-info', ring: 'ring-info/10' },
  success: { bg: 'bg-success-bg', icon: 'text-success', ring: 'ring-success/10' },
  'accent-purple': { bg: 'bg-accent-purple-bg', icon: 'text-accent-purple', ring: 'ring-accent-purple/10' },
};

export function StatCard({
  icon: Icon,
  value,
  label,
  detail,
  tone,
  href,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  detail?: string;
  tone: StatTone;
  href: string;
}) {
  const t = TONE_STYLES[tone];
  return (
    <Link
      href={href}
      className="group block rounded-card bg-white p-5 shadow-card transition-all duration-180 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${t.bg} ring-4 ${t.ring}`}>
        <Icon size={20} className={t.icon} strokeWidth={2.25} />
      </div>
      <div className="text-kpi-number text-prise-text">{value}</div>
      <div className="mt-1 text-sm font-medium text-prise-text-secondary">{label}</div>
      {detail && <div className="mt-1 text-xs text-prise-text-muted">{detail}</div>}
    </Link>
  );
}

/* -------------------------------------------------------------------------
   HeroSpotlightCard — the gradient "profile card" pattern from the
   reference, repurposed as the cohort spotlight instead of a single person.
   ------------------------------------------------------------------------- */
export function HeroSpotlightCard({
  title,
  metricValue,
  metricLabel,
  progressPct,
  meta,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  metricValue: string;
  metricLabel: string;
  progressPct: number;
  meta: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="rounded-card bg-gradient-to-br from-prise-sidebar via-[#2A2874] to-prise-primary p-6 text-white shadow-card">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold tracking-tight">
        P3
      </div>
      <div className="text-sm font-medium text-white/60">{title}</div>
      <div className="mt-1 text-3xl font-bold">{metricValue}</div>
      <div className="mt-0.5 text-sm text-white/70">{metricLabel}</div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-pill bg-white/15">
        <div
          className="h-full rounded-pill bg-white transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-white/60">{meta}</div>

      <Link
        href={ctaHref}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-transform duration-180 hover:translate-x-0.5"
      >
        {ctaLabel} <ArrowRight size={15} />
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------
   TodaysFocusCard — the review doc's #1 "missing information" fix.
   Real content, not an empty-state illustration.
   ------------------------------------------------------------------------- */
export type FocusItem = { icon: ReactNode; text: string; href: string };

export function TodaysFocusCard({ items }: { items: FocusItem[] }) {
  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <div className="mb-4 text-base font-semibold text-prise-text">Today&apos;s Focus</div>
      {items.length === 0 ? (
        <p className="text-sm text-prise-text-muted">Nothing needs attention right now.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-input px-2 py-1.5 text-sm text-prise-text transition-colors duration-180 hover:bg-prise-page"
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   QuickActionCard — flat colored icon square, chevron on hover-shift.
   ------------------------------------------------------------------------- */
export function QuickActionCard({
  icon: Icon,
  title,
  subtitle,
  tone,
  href,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone: StatTone;
  href: string;
}) {
  const t = TONE_STYLES[tone];
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-card border border-prise-border bg-white p-4 shadow-card transition-all duration-180 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.bg}`}>
        <Icon size={20} className={t.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-prise-text">{title}</div>
        <div className="truncate text-xs text-prise-text-secondary">{subtitle}</div>
      </div>
      <ArrowRight
        size={16}
        className="shrink-0 text-prise-text-muted transition-transform duration-180 group-hover:translate-x-0.5 group-hover:text-prise-primary"
      />
    </Link>
  );
}
