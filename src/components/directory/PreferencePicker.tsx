'use client';

import { useActionState, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Save } from 'lucide-react';
import { saveMatchingPreferencesAction, type MatchingFeedback } from '@/app/actions/matching';
import { useToast } from '@/components/ui/ToastProvider';
import Image from 'next/image';
import Link from 'next/link';
import { MAX_MATCHING_PREFERENCES } from '@/lib/matching';

type Candidate = { id: string; title: string; subtitle: string; meta?: string; description?: string; imageUrl?: string; chips?: string[]; stats?: string[]; profileHref?: string };
const initialState: MatchingFeedback = { status: 'idle', message: '' };

export function PreferencePicker({ candidates, initialIds, noun }: { candidates: Candidate[]; initialIds: string[]; noun: 'mentor' | 'incubatee' }) {
  const [selected, setSelected] = useState(initialIds.slice(0, MAX_MATCHING_PREFERENCES));
  const [state, action, pending] = useActionState(saveMatchingPreferencesAction, initialState);
  const { notify } = useToast();

  useEffect(() => {
    if (state.status !== 'idle') notify(state.message, state.status);
  }, [notify, state]);

  const toggle = (id: string) => setSelected((current) => {
    if (current.includes(id)) return current.filter((item) => item !== id);
    if (current.length >= MAX_MATCHING_PREFERENCES) {
      notify(`Choose up to ${MAX_MATCHING_PREFERENCES} preferences.`, 'error');
      return current;
    }
    return [...current, id];
  });
  const move = (id: string, direction: -1 | 1) => setSelected((current) => {
    const index = current.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  return <form action={action} className="space-y-4">
    {selected.map((id) => <input key={id} type="hidden" name="candidateId" value={id} />)}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {candidates.map((candidate) => {
        const rank = selected.indexOf(candidate.id);
        const active = rank >= 0;
        const blocked = !active && selected.length >= MAX_MATCHING_PREFERENCES;
        return <div key={candidate.id} className={`rounded-xl border p-4 transition ${active ? 'border-emerald-300 bg-emerald-50/70' : blocked ? 'border-prise-border bg-slate-50 opacity-60' : 'border-prise-border bg-white hover:border-prise-primary/35'}`}>
          <button type="button" onClick={() => toggle(candidate.id)} aria-pressed={active} aria-disabled={blocked} className="flex w-full items-start gap-3 text-left">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}><Check size={14} /></span>
            {candidate.imageUrl ? <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-prise-page"><Image src={candidate.imageUrl} alt="" fill sizes="44px" className="object-cover" unoptimized /></span> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-prise-page text-xs font-bold text-prise-primary">{initials(candidate.title)}</span>}
            <span className="min-w-0 flex-1"><span className="block font-semibold">{candidate.title}</span><span className="mt-1 block text-xs text-prise-text-secondary">{candidate.subtitle}</span>{candidate.meta ? <span className="mt-2 block text-[11px] font-semibold text-prise-primary">{candidate.meta}</span> : null}</span>
          </button>
          {candidate.description ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-prise-text-secondary">{candidate.description}</p> : null}
          {candidate.chips?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{candidate.chips.slice(0, 4).map((chip) => <span key={chip} className="rounded-pill bg-prise-page px-2 py-1 text-[10px] font-semibold text-prise-text-secondary">{chip}</span>)}</div> : null}
          {candidate.stats?.length ? <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-3 text-[10px] font-semibold text-prise-text-secondary">{candidate.stats.map((stat) => <span key={stat}>{stat}</span>)}</div> : null}
          {candidate.profileHref ? <Link href={candidate.profileHref} className="mt-3 inline-flex text-xs font-semibold text-prise-primary">View full profile →</Link> : null}
          {active ? <div className="mt-3 flex items-center justify-between border-t border-emerald-200 pt-3"><span className="text-xs font-bold text-emerald-700">Priority {rank + 1}</span><div className="flex gap-1"><button type="button" onClick={() => move(candidate.id, -1)} disabled={rank === 0} aria-label={`Move ${candidate.title} up`} className="rounded-lg border bg-white p-1.5 disabled:opacity-30"><ArrowUp size={14} /></button><button type="button" onClick={() => move(candidate.id, 1)} disabled={rank === selected.length - 1} aria-label={`Move ${candidate.title} down`} className="rounded-lg border bg-white p-1.5 disabled:opacity-30"><ArrowDown size={14} /></button></div></div> : null}
        </div>;
      })}
    </div>
    {candidates.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center text-sm text-prise-text-secondary">No active {noun}s are available.</div> : null}
    <div className="sticky bottom-3 flex flex-col gap-3 rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{selected.length}/{MAX_MATCHING_PREFERENCES} selected</div><div className="text-xs text-prise-text-secondary">Choose up to three. Selection order becomes preference priority.</div></div>
      <input name="note" maxLength={500} placeholder="Short matching note (optional)" className="h-10 min-w-0 rounded-input border px-3 text-sm sm:w-72" />
      <button disabled={pending || selected.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} />{pending ? 'Submitting…' : 'Submit preferences'}</button>
    </div>
  </form>;
}

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
