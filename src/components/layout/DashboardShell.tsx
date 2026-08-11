'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

type ShellUser = { name: string; email: string; role: string };

export function DashboardShell({ children, user, canViewAudit, canManagePeople }: { children: React.ReactNode; user: ShellUser; canViewAudit: boolean; canManagePeople: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={user} canViewAudit={canViewAudit} canManagePeople={canManagePeople} />
      <div className="min-w-0 flex-1">
        <TopBar onMenu={() => setMobileOpen(true)} userName={user.name} />
        <main>{children}</main>
      </div>
    </div>
  );
}
