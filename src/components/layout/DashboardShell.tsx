'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { ToastProvider } from '@/components/ui/ToastProvider';

type ShellUser = { name: string; email: string; role: string };

export function DashboardShell({ children, user, canViewAudit, canManagePeople }: { children: React.ReactNode; user: ShellUser; canViewAudit: boolean; canManagePeople: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider><div className="min-h-screen md:flex">
      <a href="#main-content" className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-button bg-prise-sidebar px-4 py-2 text-sm font-semibold text-white shadow-card transition-transform focus:translate-y-0">Skip to main content</a>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={user} canViewAudit={canViewAudit} canManagePeople={canManagePeople} />
      <div className="min-w-0 flex-1 pb-16 md:pb-0">
        <TopBar onMenu={() => setMobileOpen(true)} mobileOpen={mobileOpen} userName={user.name} />
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>
      <MobileNav role={user.role} onMore={() => setMobileOpen(true)} />
    </div></ToastProvider>
  );
}
