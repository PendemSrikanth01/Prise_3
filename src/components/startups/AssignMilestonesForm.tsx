'use client';

import { ChevronDown } from 'lucide-react';
import { useActionState, useEffect, useMemo, useState } from 'react';
import { assignMilestonesAction, type ActionFeedback } from '@/app/actions/workflows';
import { SubmitButton } from '@/components/ui/FormButtons';
import { useToast } from '@/components/ui/ToastProvider';

type Template = { id: string; phase: number; phaseName: string | null; title: string; keyActivity: string | null; deliverable: string | null };
type Props = { startupId: string; templates: Template[]; selectedIds: string[]; program: boolean };
const initialState: ActionFeedback = { status: 'idle', message: '' };

export function AssignMilestonesForm({ startupId, templates, selectedIds, program }: Props) {
  const [selected, setSelected] = useState(() => new Set(selectedIds));
  const phases = useMemo(() => [...new Set(templates.map((item) => item.phase))], [templates]);
  const [openPhases, setOpenPhases] = useState(() => new Set(phases.slice(0, 1)));
  const [state, action] = useActionState(assignMilestonesAction, initialState);
  const { notify } = useToast();

  useEffect(() => {
    if (state.status !== 'idle') notify(state.message, state.status);
  }, [state, notify]);

  const togglePhase = (phase: number) => setOpenPhases((current) => {
    const next = new Set(current);
    if (next.has(phase)) next.delete(phase); else next.add(phase);
    return next;
  });
  const toggleMilestone = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const setPhase = (phase: number, shouldSelect: boolean) => setSelected((current) => {
    const next = new Set(current);
    templates.filter((item) => item.phase === phase).forEach((item) => shouldSelect ? next.add(item.id) : next.delete(item.id));
    return next;
  });

  return <form action={action} className="mt-5" onSubmit={(event) => {
    if (!selected.size) {
      event.preventDefault();
      notify('Select at least one milestone.', 'error');
    }
  }}>
    <input type="hidden" name="startupId" value={startupId} />
    {templates.filter((item) => selected.has(item.id)).map((item) => <input key={item.id} type="hidden" name="templateId" value={item.id} />)}
    <div className="space-y-4">{phases.map((phase) => {
      const items = templates.filter((item) => item.phase === phase);
      const selectedCount = items.filter((item) => selected.has(item.id)).length;
      const isOpen = openPhases.has(phase);
      return <section key={phase} className="overflow-hidden rounded-card border bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 border-b bg-prise-page px-4 py-3 sm:px-5">
          <button type="button" onClick={() => togglePhase(phase)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold">
            <ChevronDown size={16} className={`shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} />
            <span className="truncate">Phase {phase} · {items[0]?.phaseName}</span>
            <span className="shrink-0 rounded-pill bg-white px-2 py-0.5 text-[11px] text-prise-text-secondary">{selectedCount}/{items.length}</span>
          </button>
          <button type="button" onClick={() => setPhase(phase, selectedCount !== items.length)} className="shrink-0 rounded-button border bg-white px-3 py-1.5 text-xs font-semibold text-prise-primary hover:bg-violet-50">{selectedCount === items.length ? 'Deselect phase' : 'Select phase'}</button>
        </div>
        {isOpen ? <div className="divide-y">{items.map((template) => {
          const checked = selected.has(template.id);
          return <label key={template.id} className={`grid cursor-pointer grid-cols-[24px_1fr] gap-3 px-4 py-3 transition sm:px-5 ${checked ? 'bg-emerald-50/60' : 'hover:bg-[#fbfbfe]'}`}>
            <input type="checkbox" checked={checked} onChange={() => toggleMilestone(template.id)} className="mt-1 h-4 w-4 accent-prise-primary" />
            <span><span className="block text-sm font-semibold">{template.title}</span><span className="mt-1 block text-xs leading-5 text-prise-text-secondary">{template.keyActivity}{template.deliverable ? ` · Deliverable: ${template.deliverable}` : ''}</span></span>
          </label>;
        })}</div> : null}
      </section>;
    })}</div>
    <div className="sticky bottom-4 mt-5 flex flex-col gap-3 rounded-card border bg-white/95 p-4 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-bold text-prise-text">Selected: {selected.size} milestone{selected.size === 1 ? '' : 's'}</p><p className="mt-0.5 text-xs text-prise-text-secondary">Choose any number from 1 to all available. {program ? 'Saving finalizes the shared plan.' : 'Saving sends it for program confirmation.'}</p></div>
      <SubmitButton>{program ? 'Finalize and save' : 'Save proposal'}</SubmitButton>
    </div>
  </form>;
}
