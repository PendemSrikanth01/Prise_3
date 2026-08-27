'use client';

import { useMemo, useState } from 'react';
import { saveDeliveryAssignmentAction } from '@/app/actions/matching';
import { removeStartupPersonAction } from '@/app/actions/mentor';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';

type Person = { id: string; name: string; role: string; isActive: boolean };
type Assignment = { id: string; role: string; startup: { name: string }; person: { name: string } };

export function StartupTeamAssignments({ startups, people, assignments }: { startups: Array<{ id: string; name: string }>; people: Person[]; assignments: Assignment[] }) {
  const [kind, setKind] = useState('PROGRAM_OWNER');
  const eligible = useMemo(() => people.filter((person) => person.isActive && (kind === 'PROGRAM_OWNER' ? person.role === 'PROGRAM_LEAD' || person.role === 'PROGRAM_TEAM' : person.role === kind)), [kind, people]);
  return <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6"><h2 className="font-semibold">Finalized delivery team</h2><p className="mt-1 text-sm text-prise-text-secondary">Finalize mentors from the Directory matching report. Add only the program owner, expert or intern here.</p><form action={saveDeliveryAssignmentAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_1fr_auto]"><select name="startupId" required className="h-11 rounded-input border bg-white px-3 text-sm"><option value="">Choose incubatee</option>{startups.map((startup) => <option key={startup.id} value={startup.id}>{startup.name}</option>)}</select><select name="assignmentKind" value={kind} onChange={(event) => setKind(event.target.value)} className="h-11 rounded-input border bg-white px-3 text-sm"><option value="PROGRAM_OWNER">Program owner</option><option value="EXPERT">Expert</option><option value="INTERN">Intern</option></select><select name="personId" required key={kind} className="h-11 rounded-input border bg-white px-3 text-sm"><option value="">Choose person</option>{eligible.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><SubmitButton>Assign</SubmitButton></form><div className="mt-5 divide-y border-t">{assignments.map((assignment) => <form action={removeStartupPersonAction} key={assignment.id} className="flex flex-wrap items-center gap-3 py-3 text-sm"><input type="hidden" name="assignmentId" value={assignment.id} /><div className="min-w-48 flex-1 font-semibold">{assignment.startup.name}</div><div className="min-w-44 text-prise-text-secondary">{assignment.person.name}</div><span className="rounded-pill bg-prise-page px-2.5 py-1 text-xs font-semibold">{assignment.role === 'PROGRAM_LEAD' ? 'program owner' : assignment.role.toLowerCase()}</span><ConfirmButton message="Remove this finalized assignment?">Remove</ConfirmButton></form>)}{assignments.length === 0 ? <div className="py-5 text-sm text-prise-text-secondary">No finalized assignments yet.</div> : null}</div></section>;
}
