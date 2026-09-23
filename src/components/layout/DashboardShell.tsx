'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { ToastProvider } from '@/components/ui/ToastProvider';

type ShellUser = { name: string; email: string; role: string };
type ShellNotification = { id: string; title: string; message: string; href: string | null; readAt: string | null; createdAt: string };

export function DashboardShell({ children, user, canViewAudit, canManagePeople, notifications, unreadNotificationCount, pushPublicKey }: { children: React.ReactNode; user: ShellUser; canViewAudit: boolean; canManagePeople: boolean; notifications: ShellNotification[]; unreadNotificationCount: number; pushPublicKey: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setDesktopCollapsed(window.localStorage.getItem('prise-sidebar-collapsed') === 'true'));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  function toggleDesktopSidebar() {
    setDesktopCollapsed((collapsed) => {
      window.localStorage.setItem('prise-sidebar-collapsed', String(!collapsed));
      return !collapsed;
    });
  }

  return (
    <ToastProvider><div className="min-h-screen md:flex">
      <a href="#main-content" className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-button bg-prise-sidebar px-4 py-2 text-sm font-semibold text-white shadow-card transition-transform focus:translate-y-0">Skip to main content</a>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} desktopCollapsed={desktopCollapsed} onDesktopToggle={toggleDesktopSidebar} user={user} canViewAudit={canViewAudit} canManagePeople={canManagePeople} />
      <div className="min-w-0 flex-1 pb-16 md:pb-0">
        <TopBar onMenu={() => setMobileOpen(true)} mobileOpen={mobileOpen} userName={user.name} notifications={notifications} unreadCount={unreadNotificationCount} pushPublicKey={pushPublicKey} />
        <main id="main-content" tabIndex={-1} className="min-w-0 overflow-x-hidden">{children}</main>
      </div>
      <MobileNav role={user.role} onMore={() => setMobileOpen(true)} />
    </div></ToastProvider>
  );
}
