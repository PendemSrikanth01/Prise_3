'use client';

import { useMemo, useState } from 'react';
import { Priority, SupportAudience } from '@prisma/client';
import { createSupportAction } from '@/app/actions/workflows';
import { SubmitButton } from '@/components/ui/FormButtons';
import { supportAudienceLabel } from '@/lib/collaboration-policy';

type StartupOption = { id: string; name: string; people: Array<{ id: string; name: string; role: string }> };
const input = 'h-11 w-full rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';

export function SupportCreateForm({ startups }: { startups: StartupOption[] }) {
  const [startupId, setStartupId] = useState(startups[0]?.id ?? '');
  const [audience, setAudience] = useState<SupportAudience>(SupportAudience.PROGRAM_PRIVATE);
  const startup = useMemo(() => startups.find((item) => item.id === startupId), [startupId, startups]);
  if (!startups.length) return <p className="text-sm text-prise-text-secondary">No startup is available for a support request.</p>;
  return <form action={createSupportAction} className="grid gap-3 sm:grid-cols-2">
    <select name="startupId" value={startupId} onChange={(event) => setStartupId(event.target.value)} required className={input} aria-label="Startup">{startups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <select name="audience" value={audience} onChange={(event) => setAudience(event.target.value as SupportAudience)} className={input} aria-label="Conversation audience">{Object.values(SupportAudience).map((value) => <option key={value} value={value}>{supportAudienceLabel(value)}</option>)}</select>
    <input name="title" required maxLength={220} placeholder="What change or help is needed?" className={input} />
    <select name="priority" defaultValue={Priority.NORMAL} className={input} aria-label="Priority">{Object.values(Priority).map((value) => <option key={value}>{value}</option>)}</select>
    <input name="dueDate" type="date" className={input} aria-label="Needed by" />
    <textarea name="description" rows={3} maxLength={2500} placeholder="Context and desired outcome" className="rounded-input border p-3 text-sm sm:col-span-2" />
    {audience === SupportAudience.SELECTED_PEOPLE ? <fieldset className="rounded-xl border bg-prise-page p-4 sm:col-span-2"><legend className="px-1 text-xs font-semibold text-prise-text-secondary">Choose participants</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{startup?.people.map((person) => <label key={person.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"><input type="checkbox" name="participantId" value={person.id} /> <span>{person.name}<span className="ml-1 text-xs text-prise-text-muted">{person.role.replaceAll('_', ' ').toLowerCase()}</span></span></label>)}</div></fieldset> : null}
    <div className="sm:col-span-2"><SubmitButton>Raise ticket</SubmitButton></div>
  </form>;
}
