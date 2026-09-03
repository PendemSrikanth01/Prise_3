'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Check, Sparkles, UserCheck, Search, Building2, User, ExternalLink, Filter } from 'lucide-react';
import { MatchPreferenceSource } from '@prisma/client';
import { saveStartupMentorAllocationsAction, saveMentorStartupAllocationsAction, type MatchingFeedback } from '@/app/actions/matching';
import { SubmitButton } from '@/components/ui/FormButtons';
import { useToast } from '@/components/ui/ToastProvider';
import Link from 'next/link';

type MentorCandidate = {
  id: string;
  name: string;
  organization: string | null;
  designation: string | null;
  professionalDomain: string | null;
  mentorLocation: string | null;
  expertiseAreas: string[];
};

type StartupCandidate = {
  id: string;
  name: string;
  founderName: string;
  sector: string | null;
  operationLocation: string | null;
  state: string | null;
};

type PreferenceItem = {
  id: string;
  source: MatchPreferenceSource;
  rank: number;
  mentorId: string;
  startupId: string;
  mentor: { id: string; name: string };
  startup: { id: string; name: string };
};

type AssignmentItem = {
  startupId: string;
  personId: string;
};

type Props = {
  mentors: MentorCandidate[];
  startups: StartupCandidate[];
  preferences: PreferenceItem[];
  assignments: AssignmentItem[];
};

const initialState: MatchingFeedback = { status: 'idle', message: '' };

export function MentorMappingMatrix({ mentors, startups, preferences, assignments }: Props) {
  const [activeTab, setActiveTab] = useState<'by_incubatee' | 'by_mentor'>('by_incubatee');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyShowUnassigned, setOnlyShowUnassigned] = useState(false);

  // Set of assigned pairs: "startupId:mentorId"
  const assignedPairs = useMemo(() => new Set(assignments.map((a) => `${a.startupId}:${a.personId}`)), [assignments]);

  // Index preferences by startupId and mentorId
  const prefsByStartup = useMemo(() => {
    const map = new Map<string, { incubateePicks: Map<string, number>; mentorPicks: Map<string, number> }>();
    for (const p of preferences) {
      const entry = map.get(p.startupId) ?? { incubateePicks: new Map(), mentorPicks: new Map() };
      if (p.source === MatchPreferenceSource.INCUBATEE) {
        entry.incubateePicks.set(p.mentorId, p.rank);
      } else if (p.source === MatchPreferenceSource.MENTOR) {
        entry.mentorPicks.set(p.mentorId, p.rank);
      }
      map.set(p.startupId, entry);
    }
    return map;
  }, [preferences]);

  const prefsByMentor = useMemo(() => {
    const map = new Map<string, { mentorPicks: Map<string, number>; incubateePicks: Map<string, number> }>();
    for (const p of preferences) {
      const entry = map.get(p.mentorId) ?? { mentorPicks: new Map(), incubateePicks: new Map() };
      if (p.source === MatchPreferenceSource.MENTOR) {
        entry.mentorPicks.set(p.startupId, p.rank);
      } else if (p.source === MatchPreferenceSource.INCUBATEE) {
        entry.incubateePicks.set(p.startupId, p.rank);
      }
      map.set(p.mentorId, entry);
    }
    return map;
  }, [preferences]);

  // Total statistics
  const stats = useMemo(() => {
    const totalStartups = startups.length;
    const startupsWithMentors = new Set(assignments.map((a) => a.startupId)).size;
    const totalAssignments = assignments.length;
    return { totalStartups, startupsWithMentors, totalAssignments };
  }, [startups, assignments]);

  return (
    <div className="space-y-6">
      {/* Overview & Header Banner */}
      <div className="rounded-card border bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Sparkles size={14} />
              <span>Program Management & Allocation</span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Mentor & Incubatee Allocation Matrix
            </h2>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              Check 1, 2, or 3 mentors for each startup and click &quot;Finalize &amp; Freeze&quot;. Color badges highlight mutual interest and rankings.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur">
              <div className="text-[11px] font-medium text-slate-300">Incubatees Assigned</div>
              <div className="text-lg font-bold text-white">
                {stats.startupsWithMentors} <span className="text-xs font-normal text-slate-300">/ {stats.totalStartups}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur">
              <div className="text-[11px] font-medium text-slate-300">Total Active Mappings</div>
              <div className="text-lg font-bold text-emerald-400">{stats.totalAssignments}</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs">
          <span className="text-slate-400 font-medium">Color Legend:</span>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-500/20 px-2.5 py-0.5 text-emerald-300 border border-emerald-500/30 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Mutual Match (Both Picked)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-sky-500/20 px-2.5 py-0.5 text-sky-300 border border-sky-500/30 font-medium">
            <span className="h-2 w-2 rounded-full bg-sky-400"></span> Incubatee Choice
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-500/20 px-2.5 py-0.5 text-amber-300 border border-amber-500/30 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span> Mentor Choice
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-purple-500/20 px-2.5 py-0.5 text-purple-300 border border-purple-500/30 font-medium">
            <span className="h-2 w-2 rounded-full bg-purple-400"></span> Frozen / Finalized
          </span>
        </div>
      </div>

      {/* View Switcher & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('by_incubatee')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'by_incubatee' ? 'bg-prise-primary text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 size={15} />
            <span>Map by Incubatee ({startups.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('by_mentor')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'by_mentor' ? 'bg-prise-primary text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User size={15} />
            <span>Map by Mentor ({mentors.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1 sm:w-64 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'by_incubatee' ? 'Search incubatees...' : 'Search mentors...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border bg-white pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-prise-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyShowUnassigned(!onlyShowUnassigned)}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
              onlyShowUnassigned ? 'border-amber-300 bg-amber-50 text-amber-900' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={13} />
            <span>{onlyShowUnassigned ? 'Showing Unassigned' : 'Filter Unassigned'}</span>
          </button>
        </div>
      </div>

      {/* Main Matrix Content */}
      {activeTab === 'by_incubatee' ? (
        <IncubateeMappingList
          startups={startups}
          mentors={mentors}
          prefsByStartup={prefsByStartup}
          assignedPairs={assignedPairs}
          searchQuery={searchQuery}
          onlyShowUnassigned={onlyShowUnassigned}
        />
      ) : (
        <MentorMappingList
          mentors={mentors}
          startups={startups}
          prefsByMentor={prefsByMentor}
          assignedPairs={assignedPairs}
          searchQuery={searchQuery}
          onlyShowUnassigned={onlyShowUnassigned}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// 1. INCUBATEE VIEW (Assign 2–3 Mentors per Startup with Checkboxes)
// -------------------------------------------------------------------------------------------------

function IncubateeMappingList({
  startups,
  mentors,
  prefsByStartup,
  assignedPairs,
  searchQuery,
  onlyShowUnassigned,
}: {
  startups: StartupCandidate[];
  mentors: MentorCandidate[];
  prefsByStartup: Map<string, { incubateePicks: Map<string, number>; mentorPicks: Map<string, number> }>;
  assignedPairs: Set<string>;
  searchQuery: string;
  onlyShowUnassigned: boolean;
}) {
  const mentorsMap = useMemo(() => new Map(mentors.map((m) => [m.id, m])), [mentors]);

  const filteredStartups = useMemo(() => {
    return startups.filter((startup) => {
      const assignedCount = mentors.filter((m) => assignedPairs.has(`${startup.id}:${m.id}`)).length;
      if (onlyShowUnassigned && assignedCount > 0) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        startup.name.toLowerCase().includes(q) ||
        startup.founderName.toLowerCase().includes(q) ||
        (startup.sector && startup.sector.toLowerCase().includes(q))
      );
    });
  }, [startups, mentors, assignedPairs, searchQuery, onlyShowUnassigned]);

  return (
    <div className="space-y-4">
      {filteredStartups.map((startup) => (
        <StartupMappingCard
          key={startup.id}
          startup={startup}
          allMentors={mentors}
          mentorsMap={mentorsMap}
          prefs={prefsByStartup.get(startup.id) ?? { incubateePicks: new Map(), mentorPicks: new Map() }}
          assignedPairs={assignedPairs}
        />
      ))}

      {filteredStartups.length === 0 && (
        <div className="rounded-card border border-dashed bg-white p-8 text-center text-sm text-slate-500">
          No incubatees found matching your search or filters.
        </div>
      )}
    </div>
  );
}

function StartupMappingCard({
  startup,
  allMentors,
  mentorsMap,
  prefs,
  assignedPairs,
}: {
  startup: StartupCandidate;
  allMentors: MentorCandidate[];
  mentorsMap: Map<string, MentorCandidate>;
  prefs: { incubateePicks: Map<string, number>; mentorPicks: Map<string, number> };
  assignedPairs: Set<string>;
}) {
  const initiallyAssignedIds = useMemo(() => {
    return allMentors.filter((m) => assignedPairs.has(`${startup.id}:${m.id}`)).map((m) => m.id);
  }, [allMentors, assignedPairs, startup.id]);

  const [selectedMentorIds, setSelectedMentorIds] = useState<Set<string>>(() => new Set(initiallyAssignedIds));
  const [isOpen, setIsOpen] = useState(() => initiallyAssignedIds.length > 0 || prefs.incubateePicks.size > 0 || prefs.mentorPicks.size > 0);
  const [additionalMentorId, setAdditionalMentorId] = useState('');
  const [extraMentorIds, setExtraMentorIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedMentorIds(new Set(initiallyAssignedIds));
  }, [initiallyAssignedIds]);

  const [state, action, isPending] = useActionState(saveStartupMentorAllocationsAction, initialState);
  const { notify } = useToast();

  useEffect(() => {
    if (state.status !== 'idle') {
      notify(state.message, state.status);
    }
  }, [state, notify]);

  const candidateMentorIds = useMemo(() => {
    const set = new Set<string>();
    for (const mentorId of prefs.incubateePicks.keys()) set.add(mentorId);
    for (const mentorId of prefs.mentorPicks.keys()) set.add(mentorId);
    for (const mentorId of initiallyAssignedIds) set.add(mentorId);
    for (const id of extraMentorIds) set.add(id);

    return Array.from(set).sort((a, b) => {
      const isMutualA = prefs.incubateePicks.has(a) && prefs.mentorPicks.has(a);
      const isMutualB = prefs.incubateePicks.has(b) && prefs.mentorPicks.has(b);
      if (isMutualA !== isMutualB) return isMutualA ? -1 : 1;

      const rankIncA = prefs.incubateePicks.get(a) ?? 99;
      const rankIncB = prefs.incubateePicks.get(b) ?? 99;
      if (rankIncA !== rankIncB) return rankIncA - rankIncB;

      const rankMenA = prefs.mentorPicks.get(a) ?? 99;
      const rankMenB = prefs.mentorPicks.get(b) ?? 99;
      return rankMenA - rankMenB;
    });
  }, [prefs, initiallyAssignedIds, extraMentorIds]);

  const toggleMentor = (mentorId: string) => {
    setSelectedMentorIds((prev) => {
      const next = new Set(prev);
      if (next.has(mentorId)) {
        next.delete(mentorId);
      } else {
        next.add(mentorId);
      }
      return next;
    });
  };

  const handleAddExtraMentor = () => {
    if (!additionalMentorId) return;
    if (!extraMentorIds.includes(additionalMentorId)) {
      setExtraMentorIds((prev) => [...prev, additionalMentorId]);
      setSelectedMentorIds((prev) => new Set(prev).add(additionalMentorId));
    }
    setAdditionalMentorId('');
  };

  const availableExtraMentors = useMemo(() => {
    const existing = new Set(candidateMentorIds);
    return allMentors.filter((m) => !existing.has(m.id));
  }, [allMentors, candidateMentorIds]);

  const selectedCount = selectedMentorIds.size;
  const isDirty = useMemo(() => {
    if (selectedMentorIds.size !== initiallyAssignedIds.length) return true;
    for (const id of initiallyAssignedIds) {
      if (!selectedMentorIds.has(id)) return true;
    }
    return false;
  }, [selectedMentorIds, initiallyAssignedIds]);

  return (
    <section className="overflow-hidden rounded-card border bg-white shadow-card transition hover:border-slate-300">
      {/* Card Header Accordion Bar */}
      <div className="flex flex-col gap-3 border-b bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-expanded={isOpen}
        >
          <ChevronDown
            size={18}
            className={`mt-0.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-prise-primary' : ''}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 text-base">{startup.name}</span>
              <span className="rounded-pill bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                Led by {startup.founderName}
              </span>
              {startup.sector && (
                <span className="rounded-pill bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  {startup.sector}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {startup.operationLocation || startup.state || 'Location pending'}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span
            className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-bold ${
              selectedCount > 0
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <UserCheck size={13} />
            {selectedCount} {selectedCount === 1 ? 'Mentor' : 'Mentors'} Assigned
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg border bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {isOpen ? 'Collapse' : 'Manage Mentors'}
          </button>
        </div>
      </div>

      {/* Expanded Checkbox Matrix */}
      {isOpen && (
        <form action={action} className="p-4 sm:p-5">
          <input type="hidden" name="startupId" value={startup.id} />
          {Array.from(selectedMentorIds).map((id) => (
            <input key={id} type="hidden" name="mentorId" value={id} />
          ))}

          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Select <strong>2 to 3 mentors</strong> for this startup. Checkboxes update selection immediately.
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {candidateMentorIds.length} candidate{candidateMentorIds.length === 1 ? '' : 's'} available
            </span>
          </div>

          <div className="space-y-2">
            {candidateMentorIds.map((mentorId) => {
              const mentor = mentorsMap.get(mentorId);
              if (!mentor) return null;

              const isChecked = selectedMentorIds.has(mentorId);
              const incubateeRank = prefs.incubateePicks.get(mentorId);
              const mentorRank = prefs.mentorPicks.get(mentorId);
              const isMutual = Boolean(incubateeRank && mentorRank);
              const isInitiallyAssigned = initiallyAssignedIds.includes(mentorId);

              let rowStyle = 'border-slate-200 hover:border-slate-300 bg-white';
              if (isChecked) {
                rowStyle = isMutual
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-indigo-300 bg-indigo-50/40';
              } else if (isMutual) {
                rowStyle = 'border-emerald-200 bg-emerald-50/20';
              }

              return (
                <label
                  key={mentorId}
                  className={`flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3.5 transition sm:flex-row sm:items-center sm:justify-between ${rowStyle}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMentor(mentorId)}
                      className="mt-1 h-4 w-4 rounded accent-prise-primary cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                          {mentor.name}
                        </span>
                        {mentor.professionalDomain && (
                          <span className="text-xs text-slate-500">· {mentor.professionalDomain}</span>
                        )}
                        <Link
                          href={`/mentors/${mentor.id}`}
                          target="_blank"
                          className="text-prise-primary hover:underline text-[11px] inline-flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Profile <ExternalLink size={10} />
                        </Link>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {[mentor.designation, mentor.organization, mentor.mentorLocation].filter(Boolean).join(' · ') || 'Mentor'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                    {isMutual ? (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        <Sparkles size={11} className="text-emerald-600" />
                        Mutual Match (S:#{incubateeRank} ⇄ M:#{mentorRank})
                      </span>
                    ) : (
                      <>
                        {incubateeRank ? (
                          <span className="rounded-pill bg-sky-100 border border-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                            Startup Choice #{incubateeRank}
                          </span>
                        ) : null}
                        {mentorRank ? (
                          <span className="rounded-pill bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Mentor Choice #{mentorRank}
                          </span>
                        ) : null}
                        {!incubateeRank && !mentorRank ? (
                          <span className="rounded-pill bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                            Direct Pool Assignment
                          </span>
                        ) : null}
                      </>
                    )}

                    {isInitiallyAssigned && (
                      <span className="rounded-pill bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        Active Workspace
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {availableExtraMentors.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2">
              <select
                value={additionalMentorId}
                onChange={(e) => setAdditionalMentorId(e.target.value)}
                className="h-9 min-w-48 rounded-lg border bg-white px-3 text-xs text-slate-700 focus:border-prise-primary focus:outline-none"
              >
                <option value="">+ Assign mentor from full directory...</option>
                {availableExtraMentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.professionalDomain || m.organization || 'Mentor'})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddExtraMentor}
                disabled={!additionalMentorId}
                className="h-9 rounded-lg border bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                Add to Checklist
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-900">
                {selectedCount} mentor{selectedCount === 1 ? '' : 's'} checked
              </span>
              {isDirty ? (
                <span className="ml-2 font-medium text-amber-600">• Unsaved changes pending</span>
              ) : (
                <span className="ml-2 text-emerald-600">• Up to date</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  type="button"
                  onClick={() => setSelectedMentorIds(new Set(initiallyAssignedIds))}
                  className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Reset
                </button>
              )}
              <SubmitButton className="!py-1.5 !px-4 !text-xs font-semibold">
                <Check size={14} className="mr-1 inline" />
                Finalize & Freeze Mentors
              </SubmitButton>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

// -------------------------------------------------------------------------------------------------
// 2. MENTOR VIEW (View Incubatees per Mentor & Adjust Assignments)
// -------------------------------------------------------------------------------------------------

function MentorMappingList({
  mentors,
  startups,
  prefsByMentor,
  assignedPairs,
  searchQuery,
  onlyShowUnassigned,
}: {
  mentors: MentorCandidate[];
  startups: StartupCandidate[];
  prefsByMentor: Map<string, { mentorPicks: Map<string, number>; incubateePicks: Map<string, number> }>;
  assignedPairs: Set<string>;
  searchQuery: string;
  onlyShowUnassigned: boolean;
}) {
  const startupsMap = useMemo(() => new Map(startups.map((s) => [s.id, s])), [startups]);

  const filteredMentors = useMemo(() => {
    return mentors.filter((mentor) => {
      const assignedCount = startups.filter((s) => assignedPairs.has(`${s.id}:${mentor.id}`)).length;
      if (onlyShowUnassigned && assignedCount > 0) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        mentor.name.toLowerCase().includes(q) ||
        (mentor.professionalDomain && mentor.professionalDomain.toLowerCase().includes(q)) ||
        (mentor.organization && mentor.organization.toLowerCase().includes(q))
      );
    });
  }, [mentors, startups, assignedPairs, searchQuery, onlyShowUnassigned]);

  return (
    <div className="space-y-4">
      {filteredMentors.map((mentor) => (
        <MentorMappingCard
          key={mentor.id}
          mentor={mentor}
          allStartups={startups}
          startupsMap={startupsMap}
          prefs={prefsByMentor.get(mentor.id) ?? { mentorPicks: new Map(), incubateePicks: new Map() }}
          assignedPairs={assignedPairs}
        />
      ))}

      {filteredMentors.length === 0 && (
        <div className="rounded-card border border-dashed bg-white p-8 text-center text-sm text-slate-500">
          No mentors found matching your search or filters.
        </div>
      )}
    </div>
  );
}

function MentorMappingCard({
  mentor,
  allStartups,
  startupsMap,
  prefs,
  assignedPairs,
}: {
  mentor: MentorCandidate;
  allStartups: StartupCandidate[];
  startupsMap: Map<string, StartupCandidate>;
  prefs: { mentorPicks: Map<string, number>; incubateePicks: Map<string, number> };
  assignedPairs: Set<string>;
}) {
  const initiallyAssignedStartupIds = useMemo(() => {
    return allStartups.filter((s) => assignedPairs.has(`${s.id}:${mentor.id}`)).map((s) => s.id);
  }, [allStartups, assignedPairs, mentor.id]);

  const [selectedStartupIds, setSelectedStartupIds] = useState<Set<string>>(() => new Set(initiallyAssignedStartupIds));
  const [isOpen, setIsOpen] = useState(() => initiallyAssignedStartupIds.length > 0 || prefs.mentorPicks.size > 0 || prefs.incubateePicks.size > 0);
  const [additionalStartupId, setAdditionalStartupId] = useState('');
  const [extraStartupIds, setExtraStartupIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedStartupIds(new Set(initiallyAssignedStartupIds));
  }, [initiallyAssignedStartupIds]);

  const [state, action, isPending] = useActionState(saveMentorStartupAllocationsAction, initialState);
  const { notify } = useToast();

  useEffect(() => {
    if (state.status !== 'idle') {
      notify(state.message, state.status);
    }
  }, [state, notify]);

  const candidateStartupIds = useMemo(() => {
    const set = new Set<string>();
    for (const sid of prefs.mentorPicks.keys()) set.add(sid);
    for (const sid of prefs.incubateePicks.keys()) set.add(sid);
    for (const sid of initiallyAssignedStartupIds) set.add(sid);
    for (const sid of extraStartupIds) set.add(sid);

    return Array.from(set).sort((a, b) => {
      const isMutualA = prefs.mentorPicks.has(a) && prefs.incubateePicks.has(a);
      const isMutualB = prefs.mentorPicks.has(b) && prefs.incubateePicks.has(b);
      if (isMutualA !== isMutualB) return isMutualA ? -1 : 1;

      const rankMenA = prefs.mentorPicks.get(a) ?? 99;
      const rankMenB = prefs.mentorPicks.get(b) ?? 99;
      if (rankMenA !== rankMenB) return rankMenA - rankMenB;

      const rankIncA = prefs.incubateePicks.get(a) ?? 99;
      const rankIncB = prefs.incubateePicks.get(b) ?? 99;
      return rankIncA - rankIncB;
    });
  }, [prefs, initiallyAssignedStartupIds, extraStartupIds]);

  const toggleStartup = (startupId: string) => {
    setSelectedStartupIds((prev) => {
      const next = new Set(prev);
      if (next.has(startupId)) next.delete(startupId);
      else next.add(startupId);
      return next;
    });
  };

  const handleAddExtraStartup = () => {
    if (!additionalStartupId) return;
    if (!extraStartupIds.includes(additionalStartupId)) {
      setExtraStartupIds((prev) => [...prev, additionalStartupId]);
      setSelectedStartupIds((prev) => new Set(prev).add(additionalStartupId));
    }
    setAdditionalStartupId('');
  };

  const availableExtraStartups = useMemo(() => {
    const existing = new Set(candidateStartupIds);
    return allStartups.filter((s) => !existing.has(s.id));
  }, [allStartups, candidateStartupIds]);

  const selectedCount = selectedStartupIds.size;
  const isDirty = useMemo(() => {
    if (selectedStartupIds.size !== initiallyAssignedStartupIds.length) return true;
    for (const id of initiallyAssignedStartupIds) {
      if (!selectedStartupIds.has(id)) return true;
    }
    return false;
  }, [selectedStartupIds, initiallyAssignedStartupIds]);

  return (
    <section className="overflow-hidden rounded-card border bg-white shadow-card transition hover:border-slate-300">
      {/* Card Header Accordion */}
      <div className="flex flex-col gap-3 border-b bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-expanded={isOpen}
        >
          <ChevronDown
            size={18}
            className={`mt-0.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-prise-primary' : ''}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 text-base">{mentor.name}</span>
              {mentor.professionalDomain && (
                <span className="rounded-pill bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  {mentor.professionalDomain}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {[mentor.designation, mentor.organization, mentor.mentorLocation].filter(Boolean).join(' · ') || 'Mentor'}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span
            className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-bold ${
              selectedCount > 0
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <Building2 size={13} />
            Mentoring {selectedCount} {selectedCount === 1 ? 'Startup' : 'Startups'}
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg border bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {isOpen ? 'Collapse' : 'Manage Startups'}
          </button>
        </div>
      </div>

      {isOpen && (
        <form action={action} className="p-4 sm:p-5">
          <input type="hidden" name="mentorId" value={mentor.id} />
          {Array.from(selectedStartupIds).map((id) => (
            <input key={id} type="hidden" name="startupId" value={id} />
          ))}

          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>Select startups assigned to <strong>{mentor.name}</strong>.</span>
            <span className="text-[11px] font-medium text-slate-400">
              {candidateStartupIds.length} candidate{candidateStartupIds.length === 1 ? '' : 's'} available
            </span>
          </div>

          <div className="space-y-2">
            {candidateStartupIds.map((startupId) => {
              const startup = startupsMap.get(startupId);
              if (!startup) return null;

              const isChecked = selectedStartupIds.has(startupId);
              const mentorRank = prefs.mentorPicks.get(startupId);
              const incubateeRank = prefs.incubateePicks.get(startupId);
              const isMutual = Boolean(mentorRank && incubateeRank);
              const isInitiallyAssigned = initiallyAssignedStartupIds.includes(startupId);

              let rowStyle = 'border-slate-200 hover:border-slate-300 bg-white';
              if (isChecked) {
                rowStyle = isMutual
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-indigo-300 bg-indigo-50/40';
              } else if (isMutual) {
                rowStyle = 'border-emerald-200 bg-emerald-50/20';
              }

              return (
                <label
                  key={startupId}
                  className={`flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3.5 transition sm:flex-row sm:items-center sm:justify-between ${rowStyle}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStartup(startupId)}
                      className="mt-1 h-4 w-4 rounded accent-prise-primary cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                          {startup.name}
                        </span>
                        <span className="text-xs text-slate-500">· Led by {startup.founderName}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {[startup.sector, startup.operationLocation || startup.state].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                    {isMutual ? (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        <Sparkles size={11} className="text-emerald-600" />
                        Mutual Match (M:#{mentorRank} ⇄ S:#{incubateeRank})
                      </span>
                    ) : (
                      <>
                        {mentorRank ? (
                          <span className="rounded-pill bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Mentor Choice #{mentorRank}
                          </span>
                        ) : null}
                        {incubateeRank ? (
                          <span className="rounded-pill bg-sky-100 border border-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                            Startup Choice #{incubateeRank}
                          </span>
                        ) : null}
                      </>
                    )}

                    {isInitiallyAssigned && (
                      <span className="rounded-pill bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        Active Workspace
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {availableExtraStartups.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2">
              <select
                value={additionalStartupId}
                onChange={(e) => setAdditionalStartupId(e.target.value)}
                className="h-9 min-w-48 rounded-lg border bg-white px-3 text-xs text-slate-700 focus:border-prise-primary focus:outline-none"
              >
                <option value="">+ Assign incubatee from full directory...</option>
                {availableExtraStartups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.sector || s.founderName})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddExtraStartup}
                disabled={!additionalStartupId}
                className="h-9 rounded-lg border bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                Add to Checklist
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-900">{selectedCount} incubatees assigned</span>
              {isDirty ? (
                <span className="ml-2 font-medium text-amber-600">• Unsaved changes pending</span>
              ) : (
                <span className="ml-2 text-emerald-600">• Up to date</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  type="button"
                  onClick={() => setSelectedStartupIds(new Set(initiallyAssignedStartupIds))}
                  className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Reset
                </button>
              )}
              <SubmitButton className="!py-1.5 !px-4 !text-xs font-semibold">
                <Check size={14} className="mr-1 inline" />
                Finalize & Freeze Startups
              </SubmitButton>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
