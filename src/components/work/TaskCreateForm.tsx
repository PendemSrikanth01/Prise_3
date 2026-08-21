'use client';

import { useMemo, useState } from 'react';
import { Priority } from '@prisma/client';
import { createTaskAction } from '@/app/actions/workflows';
import { SubmitButton } from '@/components/ui/FormButtons';

type StartupOption = {
  id: string;
  name: string;
  milestones: Array<{ id: string; title: string }>;
  people: Array<{ id: string; name: string; role: string }>;
};

const input = 'h-11 w-full rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';

export function TaskCreateForm({ startups, currentUserId }: { startups: StartupOption[]; currentUserId: string }) {
  const [startupId, setStartupId] = useState(startups[0]?.id ?? '');
  const startup = useMemo(() => startups.find((item) => item.id === startupId), [startupId, startups]);
  if (!startups.length) return <p className="text-sm text-prise-text-secondary">No startup is available for task creation.</p>;
  return <form action={createTaskAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <select name="startupId" value={startupId} onChange={(event) => setStartupId(event.target.value)} required className={input} aria-label="Startup">
      {startups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    <input name="title" required maxLength={220} placeholder="Task outcome" className={input} />
    <select name="milestoneId" className={input} aria-label="Milestone"><option value="">No milestone</option>{startup?.milestones.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
    <select name="assigneeId" defaultValue={currentUserId} className={input} aria-label="Assignee"><option value="">Unassigned</option>{startup?.people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role.replaceAll('_', ' ').toLowerCase()}</option>)}</select>
    <select name="priority" defaultValue={Priority.NORMAL} className={input} aria-label="Priority">{Object.values(Priority).map((value) => <option key={value}>{value}</option>)}</select>
    <input name="dueDate" type="date" className={input} aria-label="Due date" />
    <input name="description" maxLength={2500} placeholder="Definition of done" className={`${input} md:col-span-2 xl:col-span-1`} />
    <SubmitButton>Create task</SubmitButton>
  </form>;
}
