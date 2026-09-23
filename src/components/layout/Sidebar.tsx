'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Bell, Building2, CalendarDays, CalendarRange, LayoutDashboard,
  FileText, GraduationCap, IndianRupee, LifeBuoy, ListChecks, LogOut, MessageCircle, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Star, UserRoundCog, Users, X,
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
    { href: '/work', label: 'Tasks', icon: ListChecks },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/tickets', label: 'Tickets', icon: LifeBuoy },
    { href: '/resources', label: 'Resources', icon: FileText },
  ] },
  { label: 'People & program', items: [
    { href: '/directory', label: 'Directory', icon: Users },
    { href: '/mapping', label: 'Mentor mapping', icon: UserRoundCog },
    { href: '/mentors', label: 'Mentors', icon: GraduationCap },
    { href: '/program', label: 'Program', icon: CalendarRange },
    { href: '/insights', label: 'Dashboard', icon: BarChart3 },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ] },
];

const MENTOR_NAV: NavSection[] = [{ items: [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/mentor-profile', label: 'My Profile', icon: UserRoundCog },
  { href: '/startups', label: 'My Startups', icon: Building2 },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/work', label: 'Tasks', icon: ListChecks },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/tickets', label: 'Tickets', icon: LifeBuoy },
  { href: '/reviews', label: 'Reviews', icon: Star },
  { href: '/resources', label: 'Resources', icon: FileText },
] }];

const FOUNDER_NAV: NavSection[] = [{ items: [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/my-startup', label: 'My Startup', icon: Building2 },
  { href: '/my-mentors', label: 'My Mentors', icon: GraduationCap },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
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
  desktopCollapsed: boolean;
  onDesktopToggle: () => void;
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

export function Sidebar({ mobileOpen, onClose, desktopCollapsed, onDesktopToggle, user, canViewAudit, canManagePeople }: SidebarProps) {
  const pathname = usePathname();
  const sections = navigationFor(user.role);
  const workspaceLabel = user.role === 'MENTOR' ? 'Mentor workspace' : user.role === 'FOUNDER' ? 'Startup workspace' : 'Incubation workspace';

  return <>
    {mobileOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#142832]/35 backdrop-blur-sm md:hidden" onClick={onClose} /> : null}
    <aside id="primary-navigation" className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-prise-border bg-white text-prise-text shadow-[8px_0_30px_rgb(23_79_101/8%)] transition-[width,transform] duration-200 md:sticky md:top-0 md:z-20 md:h-screen md:translate-x-0 md:shadow-none ${desktopCollapsed ? 'md:w-[72px]' : 'md:w-[248px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="relative px-3 pt-3">
        <BrandLockup variant="sidebar" priority className={`mr-10 ${desktopCollapsed ? 'md:hidden' : 'md:mr-0'}`} />
        {desktopCollapsed ? <div className="hidden h-[122px] items-center justify-center rounded-card bg-prise-page text-xl font-black text-prise-primary md:flex">P<span className="text-prise-action">r</span></div> : null}
        <button type="button" aria-label="Close navigation" className="absolute right-2 top-2 rounded-lg p-2 text-prise-text-secondary hover:bg-prise-page md:hidden" onClick={onClose}><X size={18} /></button>
        <button type="button" aria-label={desktopCollapsed ? 'Expand navigation' : 'Collapse navigation'} title={desktopCollapsed ? 'Expand navigation' : 'Collapse navigation'} className="absolute -right-3 top-5 hidden rounded-full border bg-white p-1.5 text-prise-text-secondary shadow-md hover:text-prise-primary md:block" onClick={onDesktopToggle}>{desktopCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}</button>
        <div className={`mt-3 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-prise-text-muted ${desktopCollapsed ? 'md:hidden' : ''}`}>{workspaceLabel}</div>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3" aria-label="Primary navigation">{sections.map((section, index) => <div key={section.label ?? index} className="mb-5">{section.label ? <div className={`mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-prise-text-muted ${desktopCollapsed ? 'md:hidden' : ''}`}>{section.label}</div> : null}<div className="space-y-1">{section.items.map((item) => { const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={onClose} title={desktopCollapsed ? item.label : undefined} aria-label={desktopCollapsed ? item.label : undefined} className={`relative flex h-10 items-center gap-3 rounded-button px-3 text-sm font-semibold transition-colors ${desktopCollapsed ? 'md:justify-center md:px-0' : ''} ${active ? 'bg-prise-primary text-white shadow-[0_6px_15px_rgb(57_124_152/18%)]' : 'text-prise-text-secondary hover:bg-prise-page hover:text-prise-primary'}`}><Icon className="shrink-0" size={17} strokeWidth={active ? 2.3 : 1.8} /><span className={desktopCollapsed ? 'md:hidden' : ''}>{item.label}</span>{active ? <span className="absolute -left-1 h-5 w-1 rounded-full bg-prise-action" /> : null}</Link>; })}</div></div>)}</nav>
      <div className="space-y-1 border-t border-prise-border px-3 py-3">{canViewAudit ? <Link href="/audit" onClick={onClose} title={desktopCollapsed ? 'Audit history' : undefined} className={`flex h-10 items-center gap-3 rounded-button px-3 text-sm font-semibold text-prise-text-secondary hover:bg-prise-page hover:text-prise-primary ${desktopCollapsed ? 'md:justify-center md:px-0' : ''}`}><ShieldCheck size={17} /><span className={desktopCollapsed ? 'md:hidden' : ''}>Audit history</span></Link> : null}<Link href="/settings" onClick={onClose} title={desktopCollapsed ? (canManagePeople ? 'Administration' : 'Profile') : undefined} className={`flex h-10 items-center gap-3 rounded-button px-3 text-sm font-semibold text-prise-text-secondary hover:bg-prise-page hover:text-prise-primary ${desktopCollapsed ? 'md:justify-center md:px-0' : ''}`}><Settings size={17} /><span className={desktopCollapsed ? 'md:hidden' : ''}>{canManagePeople ? 'Administration' : 'Profile'}</span></Link><div className={`mt-2 flex items-center gap-3 rounded-xl bg-prise-page px-3 py-2 ${desktopCollapsed ? 'md:flex-col md:px-1' : ''}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-prise-primary text-xs font-bold text-white">{user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div className={`min-w-0 flex-1 ${desktopCollapsed ? 'md:hidden' : ''}`}><div className="truncate text-sm font-semibold">{user.name}</div><div className="truncate text-xs text-prise-text-muted">{roleLabel(user.role)}</div></div><form action={logoutAction}><button aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-prise-text-muted hover:bg-white hover:text-prise-action"><LogOut size={17} /></button></form></div></div>
    </aside>
  </>;
}
