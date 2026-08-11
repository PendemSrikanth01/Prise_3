import { DashboardShell } from '@/components/layout/DashboardShell';
import { hasPermission, requireSession } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <DashboardShell user={session.user} canViewAudit={hasPermission(session.user.role, 'audit:view')} canManagePeople={hasPermission(session.user.role, 'people:manage')}>{children}</DashboardShell>;
}
