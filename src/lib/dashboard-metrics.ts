import { AttendanceMode, StartupStatus } from '@prisma/client';

export function groupValues(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || nameCompare(a.name, b.name));
}

export function startupStatusLabel(status: StartupStatus) {
  if (status === StartupStatus.DISCONTINUED) return 'Discontinued';
  if (status === StartupStatus.WITHDRAWN) return 'Withdrawn';
  if (status === StartupStatus.NEEDS_ATTENTION) return 'Needs attention';
  return status[0] + status.slice(1).toLowerCase().replaceAll('_', ' ');
}

export function attendanceSummary(event: { title: string; startsAt: Date; attendance: Array<{ mode: AttendanceMode }> }) {
  return {
    name: event.title.replace('PrISE 3.0 ', ''),
    date: event.startsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    offline: event.attendance.filter((record) => record.mode === AttendanceMode.OFFLINE).length,
    online: event.attendance.filter((record) => record.mode === AttendanceMode.ONLINE).length,
    absent: event.attendance.filter((record) => record.mode === AttendanceMode.ABSENT).length,
  };
}

function nameCompare(left: string, right: string) {
  return left.localeCompare(right, 'en');
}
