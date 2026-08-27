'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Building2, CalendarDays, FolderKanban, Home, ListChecks, Menu, Users } from 'lucide-react';

type Item = { href: string; label: string; icon: typeof Home };

function itemsFor(role: string): Item[] {
  if (role === 'FOUNDER') return [{ href: '/', label: 'Home', icon: Home }, { href: '/my-startup', label: 'Startup', icon: Building2 }, { href: '/calendar', label: 'Calendar', icon: CalendarDays }, { href: '/directory', label: 'Directory', icon: Users }];
  if (role === 'MENTOR') return [{ href: '/', label: 'Home', icon: Home }, { href: '/startups', label: 'Startups', icon: Building2 }, { href: '/calendar', label: 'Calendar', icon: CalendarDays }, { href: '/directory', label: 'Directory', icon: Users }];
  if (role === 'INVESTOR') return [{ href: '/', label: 'Home', icon: Home }, { href: '/portfolio', label: 'Portfolio', icon: FolderKanban }, { href: '/insights', label: 'Dashboard', icon: BarChart3 }, { href: '/directory', label: 'Directory', icon: Users }];
  return [{ href: '/', label: 'Home', icon: Home }, { href: '/work', label: 'Work', icon: ListChecks }, { href: '/calendar', label: 'Calendar', icon: CalendarDays }, { href: '/directory', label: 'Directory', icon: Users }];
}

export function MobileNav({ role, onMore }: { role: string; onMore: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Mobile navigation" className="glass-surface fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-x-0 border-b-0 px-2 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-1 md:hidden">
    {itemsFor(role).map(({ href, label, icon: Icon }) => { const active = href === '/' ? pathname === '/' : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold ${active ? 'text-prise-primary' : 'text-prise-text-secondary'}`}><Icon size={20} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span></Link>; })}
    <button type="button" onClick={onMore} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold text-prise-text-secondary"><Menu size={20} /><span>More</span></button>
  </nav>;
}
