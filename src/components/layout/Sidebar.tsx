'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  CalendarRange,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Settings,
  Target,
  Users,
  X,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { href: '/', label: 'Home', icon: LayoutDashboard },
      { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
      { href: '/startups', label: 'Startups', icon: Building2 },
      { href: '/milestones', label: 'Milestones', icon: Target },
      { href: '/work', label: 'Work', icon: ListChecks },
    ],
  },
  {
    label: 'People & program',
    items: [
      { href: '/people', label: 'People', icon: Users },
      { href: '/program', label: 'Program', icon: CalendarRange },
      { href: '/insights', label: 'Insights', icon: BarChart3 },
    ],
  },
] as const;

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[#111027]/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-prise-sidebar text-white transition-transform duration-200 md:sticky md:top-0 md:z-20 md:h-screen md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-prise-primary text-lg font-bold shadow-[0_8px_24px_rgb(109_94_245/35%)]">
            P
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">PRISE</div>
            <div className="text-xs text-white/50">Incubation workspace</div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white md:hidden"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2" aria-label="Primary navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-6">
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`relative flex h-12 items-center gap-3 rounded-button px-3 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-prise-primary text-white shadow-[0_6px_18px_rgb(109_94_245/30%)]'
                          : 'text-white/68 hover:bg-white/7 hover:text-white'
                      }`}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3 px-4 pb-5">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex h-12 items-center gap-3 rounded-button px-3 text-sm font-medium text-white/68 transition-colors hover:bg-white/7 hover:text-white"
          >
            <Settings size={18} />
            Settings
          </Link>
          <div className="rounded-card border border-white/10 bg-white/7 p-4">
            <p className="text-sm font-medium text-white">PRISE 3.0</p>
            <p className="mt-1 text-xs leading-5 text-white/52">19 selected startups · 7 incubation phases</p>
          </div>
          <div className="flex items-center gap-3 rounded-button px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">PT</div>
            <div>
              <div className="text-sm font-medium">Program Team</div>
              <div className="text-xs text-white/46">Internal workspace</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
