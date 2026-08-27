'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Bell, Building2, CalendarDays, CalendarRange, LayoutDashboard,
  FileText, GraduationCap, IndianRupee, LifeBuoy, ListChecks, LogOut, Settings, ShieldCheck, Star, UserRoundCog, Users, X,
  type LucideIcon,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { BrandLockup } from '@/components/brand/BrandIdentity';
import { roleLabel } from '@/lib/labels';

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavSection = { label?: string; items: NavItem[] };

const PROGRAM_NAV: NavSection[] = [
  { label: 'Workspace', items: [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/startups', label: 'Startups', icon: Building2 },
    { href: '/work', label: 'Work', icon: ListChecks },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/tickets', label: 'Tickets', icon: LifeBuoy },
    { href: '/resources', label: 'Resources', icon: FileText },
  ] },
  { label: 'People & program', items: [
    { href: '/directory', label: 'Directory', icon: Users },
    { href: '/mentors', label: 'Mentors', icon: GraduationCap },
    { href: '/program', label: 'Program', icon: CalendarRange },
    { href: '/insights', label: 'Dashboard', icon: BarChart3 },
    { href: '/notifications', label: 'Email outbox', icon: Bell },
  ] },
];

const MENTOR_NAV: NavSection[] = [{ items: [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/mentor-profile', label: 'My Profile', icon: UserRoundCog },
  { href: '/startups', label: 'My Startups', icon: Building2 },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/tickets', label: 'Tickets', icon: LifeBuoy },
  { href: '/reviews', label: 'Reviews', icon: Star },
  { href: '/resources', label: 'Resources', icon: FileText },
] }];

const FOUNDER_NAV: NavSection[] = [{ items: [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/my-startup', label: 'My Startup', icon: Building2 },
  { href: '/work', label: 'Tasks', icon: ListChecks },
  { href: '/resources', label: 'Resources', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/tickets', label: 'Tickets', icon: LifeBuoy },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/payments', label: 'Payments', icon: IndianRupee },
] }];

const DELIVERY_NAV: NavSection[] = [{ items: [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/startups', label: 'Assigned Startups', icon: Building2 },
  { href: '/work', label: 'Tasks', icon: ListChecks },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/tickets', label: 'Tickets', icon: LifeBuoy },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/resources', label: 'Resources', icon: FileText },
] }];

const INVESTOR_NAV: NavSection[] = [{ items: [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: Building2 },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/insights', label: 'Dashboard', icon: BarChart3 },
] }];

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string; role: string };
  canViewAudit: boolean;
  canManagePeople: boolean;
};

function navigationFor(role: string) {
  if (role === 'MENTOR') return MENTOR_NAV;
  if (role === 'FOUNDER') return FOUNDER_NAV;
  if (role === 'INVESTOR') return INVESTOR_NAV;
  if (role === 'INTERN' || role === 'EXPERT') return DELIVERY_NAV;
  return PROGRAM_NAV;
}

export function Sidebar({ mobileOpen, onClose, user, canViewAudit, canManagePeople }: SidebarProps) {
  const pathname = usePathname();
  const sections = navigationFor(user.role);
  const workspaceLabel = user.role === 'MENTOR' ? 'Mentor workspace' : user.role === 'FOUNDER' ? 'Startup workspace' : 'Incubation workspace';

  return <>
    {mobileOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#111027]/40 backdrop-blur-sm md:hidden" onClick={onClose} /> : null}
    <aside id="primary-navigation" className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-prise-sidebar text-white transition-transform duration-200 md:sticky md:top-0 md:z-20 md:h-screen md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="relative px-3 pt-3"><BrandLockup variant="sidebar" priority className="mr-10 md:mr-0" /><button type="button" aria-label="Close navigation" className="absolute right-2 top-2 rounded-lg p-2 text-white/65 hover:bg-white/10 md:hidden" onClick={onClose}><X size={18} /></button><div className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-[.12em] text-white/38">{workspaceLabel}</div></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary navigation">{sections.map((section, index) => <div key={section.label ?? index} className="mb-6">{section.label ? <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.12em] text-white/35">{section.label}</div> : null}<div className="space-y-1">{section.items.map((item) => { const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={onClose} className={`flex h-11 items-center gap-3 rounded-button px-3 text-sm font-medium transition-colors ${active ? 'bg-white/12 text-white' : 'text-white/68 hover:bg-white/7 hover:text-white'}`}><Icon size={18} strokeWidth={active ? 2.2 : 1.8} />{item.label}</Link>; })}</div></div>)}</nav>
      <div className="space-y-1 border-t border-white/10 px-3 py-4">{canViewAudit ? <Link href="/audit" onClick={onClose} className="flex h-11 items-center gap-3 rounded-button px-3 text-sm text-white/68 hover:bg-white/7 hover:text-white"><ShieldCheck size={18} />Audit history</Link> : null}<Link href="/settings" onClick={onClose} className="flex h-11 items-center gap-3 rounded-button px-3 text-sm text-white/68 hover:bg-white/7 hover:text-white"><Settings size={18} />{canManagePeople ? 'Administration' : 'Profile'}</Link><div className="mt-3 flex items-center gap-3 px-3 py-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">{user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{user.name}</div><div className="truncate text-xs text-white/46">{roleLabel(user.role)}</div></div><form action={logoutAction}><button aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"><LogOut size={17} /></button></form></div></div>
    </aside>
  </>;
}
