'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Award, BriefcaseBusiness, Building2, CalendarCheck2, CalendarClock, Camera, ExternalLink, Mail, MapPin, MessageCircle, Trash2, UsersRound } from 'lucide-react';
import { addMentorAvailabilityAction, publishMentorAvailabilityAction, removeMentorAvailabilityAction, updateMentorPhotoAction, updateMentorProfileAction } from '@/app/actions/mentor-profile';
import { SubmitButton } from '@/components/ui/FormButtons';
import type { MentorCoordination, MentorEngagement } from '@/lib/mentor-coordination';

type MentorProfileData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  designation: string | null;
  professionalBio: string | null;
  professionalDomain: string | null;
  mentorLocation: string | null;
  mentoringFrequency: string | null;
  linkedinUrl: string | null;
  expertiseAreas: string[];
  preferredSectors: string[];
  languages: string[];
  yearsExperience: number | null;
  profilePhotoKey: string | null;
  maxStartupCapacity: number;
  acceptingMentees: boolean;
  availabilityPublishedAt: Date | null;
  mentorAvailability: Array<{ id: string; dayOfWeek: number; startMinute: number; endMinute: number; mode: 'ONLINE' | 'OFFLINE' | 'HYBRID' | 'FLEXIBLE' }>;
  _count: { assignments: number };
};

const inputClass = 'h-11 w-full rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';
const labelClass = 'grid gap-1.5 text-sm font-medium text-prise-text';

export function MentorProfileEditor({ mentor, canEdit, coordination, engagement }: { mentor: MentorProfileData; canEdit: boolean; coordination?: MentorCoordination; engagement?: MentorEngagement }) {
  return <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
    <div className="rounded-card border bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4"><div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-purple-bg text-lg font-bold text-accent-purple ring-4 ring-white shadow-sm">{mentor.profilePhotoKey ? <Image src={`/api/mentor-photo/${mentor.id}`} alt={`${mentor.name} profile`} fill sizes="64px" className="object-cover" unoptimized /> : mentor.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Mentor profile</p><h1 className="mt-1 truncate text-2xl font-bold tracking-tight">{mentor.name}</h1><p className="mt-1 truncate text-sm text-prise-text-secondary">{mentor.designation || 'Mentor'}{mentor.organization ? ` · ${mentor.organization}` : ''}</p></div></div>
        {canEdit ? <form action={updateMentorPhotoAction} className="flex items-center gap-2" encType="multipart/form-data"><input type="hidden" name="mentorId" value={mentor.id} /><label className="inline-flex cursor-pointer items-center gap-2 rounded-button border bg-white px-3 py-2 text-xs font-semibold text-prise-primary"><Camera size={15} />Update photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="sr-only" onChange={(event) => event.currentTarget.form?.requestSubmit()} /></label></form> : null}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ProfileFact icon={BriefcaseBusiness} label="Domain" value={mentor.professionalDomain || 'Not added'} /><ProfileFact icon={MapPin} label="Location" value={mentor.mentorLocation || 'Not added'} /><ProfileFact icon={Award} label="Experience" value={mentor.yearsExperience === null ? 'Not added' : `${mentor.yearsExperience} years`} /><ProfileFact icon={CalendarClock} label="Mentoring" value={mentor.mentoringFrequency || 'Flexible'} /></div>
    </div>

    {engagement ? <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6" aria-labelledby="mentor-engagement">
      <h2 id="mentor-engagement" className="text-lg font-bold">Mentoring engagement</h2>
      <p className="mt-1 text-sm text-prise-text-secondary">Counts are calculated from completed calendar sessions and messages sent by this mentor in PrISE.</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <EngagementFact icon={CalendarCheck2} label="Meetings held" value={engagement.completedMeetings} />
        <EngagementFact icon={MessageCircle} label="Messages sent" value={engagement.messagesSent} />
        <EngagementFact icon={UsersRound} label="Active conversations" value={engagement.activeConversations} />
      </dl>
    </section> : null}

    <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6" aria-labelledby="mentor-profile-details">
      <h2 id="mentor-profile-details" className="text-lg font-bold">Professional details</h2>
      <p className="mt-1 text-sm text-prise-text-secondary">Used for mentor matching, communication and workload decisions.</p>
      {canEdit ? <form action={updateMentorProfileAction} className="mt-5 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="mentorId" value={mentor.id} />
        <label className={labelClass}>Organisation<input name="organization" defaultValue={mentor.organization ?? ''} maxLength={180} className={inputClass} /></label>
        <label className={labelClass}>Designation<input name="designation" defaultValue={mentor.designation ?? ''} maxLength={180} className={inputClass} /></label>
        <label className={labelClass}>Domain / profession<input name="professionalDomain" defaultValue={mentor.professionalDomain ?? ''} maxLength={240} className={inputClass} placeholder="Social entrepreneur / Entrepreneurship" /></label>
        <label className={labelClass}>Location<input name="mentorLocation" defaultValue={mentor.mentorLocation ?? ''} maxLength={180} className={inputClass} placeholder="Visakhapatnam" /></label>
        <label className={labelClass}>Mentoring frequency<input name="mentoringFrequency" defaultValue={mentor.mentoringFrequency ?? ''} maxLength={120} className={inputClass} placeholder="Flexible / As required" /></label>
        <label className={labelClass}>LinkedIn profile<input name="linkedinUrl" type="url" defaultValue={mentor.linkedinUrl ?? ''} maxLength={500} className={inputClass} placeholder="https://www.linkedin.com/in/..." /></label>
        <label className={`${labelClass} sm:col-span-2`}>Professional bio<textarea name="professionalBio" defaultValue={mentor.professionalBio ?? ''} maxLength={1500} rows={4} className="rounded-input border bg-white p-3 text-sm outline-none focus:border-prise-primary" placeholder="Short experience summary and the type of support you provide" /></label>
        <label className={labelClass}>Expertise areas<input name="expertiseAreas" defaultValue={mentor.expertiseAreas.join(', ')} className={inputClass} placeholder="Impact, finance, marketing" /><span className="text-xs font-normal text-prise-text-muted">Separate multiple items with commas.</span></label>
        <label className={labelClass}>Preferred sectors<input name="preferredSectors" defaultValue={mentor.preferredSectors.join(', ')} className={inputClass} placeholder="Health, agriculture, livelihoods" /></label>
        <label className={labelClass}>Languages<input name="languages" defaultValue={mentor.languages.join(', ')} className={inputClass} placeholder="English, Telugu, Hindi" /></label>
        <label className={labelClass}>Years of experience<input name="yearsExperience" type="number" min={0} max={70} defaultValue={mentor.yearsExperience ?? ''} className={inputClass} placeholder="e.g. 12" /></label>
        <div className="sm:col-span-2"><SubmitButton>Save mentor profile</SubmitButton></div>
      </form> : <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><ReadField label="Domain / profession" value={mentor.professionalDomain || 'Not added'} /><ReadField label="Location" value={mentor.mentorLocation || 'Not added'} /><ReadField label="Mentoring frequency" value={mentor.mentoringFrequency || 'Flexible / As required'} /><ReadField label="Experience" value={mentor.yearsExperience === null ? 'Not added' : `${mentor.yearsExperience} years`} /><ReadField label="Expertise" value={mentor.expertiseAreas.join(', ') || 'Not added'} /><ReadField label="Preferred sectors" value={mentor.preferredSectors.join(', ') || 'Not added'} /><ReadField label="Languages" value={mentor.languages.join(', ') || 'Not added'} />{mentor.linkedinUrl ? <a href={mentor.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-prise-page p-3 font-semibold text-prise-primary"><ExternalLink size={16} />View LinkedIn profile</a> : null}{mentor.professionalBio ? <div className="sm:col-span-2"><ReadField label="Professional bio" value={mentor.professionalBio} /></div> : null}</div>}
    </section>

    {coordination ? <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6" aria-labelledby="mentor-coordination">
      <h2 id="mentor-coordination" className="text-lg font-bold">PrISE coordination</h2>
      <p className="mt-1 text-sm text-prise-text-secondary">Finalized startup roles and the active Program Lead or Program Team contacts responsible for coordination.</p>
      <div className="mt-4 space-y-3">{coordination.map((assignment) => <article key={assignment.startupId} className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/startups/${assignment.startupId}`} className="inline-flex items-center gap-2 font-semibold text-prise-primary"><Building2 size={16} />{assignment.startupName}</Link><span className={`rounded-pill px-2.5 py-1 text-[11px] font-bold ${assignment.isCoreMentor ? 'bg-success-bg text-success' : 'bg-prise-page text-prise-text-secondary'}`}>{assignment.isCoreMentor ? 'Core Mentor' : 'Supporting Mentor'}</span></div>
        {assignment.programContacts.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{assignment.programContacts.map((contact) => <a key={contact.id} href={`mailto:${contact.email}`} className="flex items-center gap-3 rounded-xl bg-prise-page p-3 text-sm hover:bg-info-bg"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-prise-primary"><Mail size={15} /></div><div className="min-w-0"><div className="truncate font-semibold">{contact.name}</div><div className="truncate text-xs text-prise-text-secondary">{contact.role.replaceAll('_', ' ').toLowerCase()} · {contact.email}</div></div></a>)}</div> : <p className="mt-3 rounded-xl bg-warning-bg p-3 text-sm text-warning">A Program Lead or Program Team contact has not been assigned to this startup yet.</p>}
      </article>)}{coordination.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-center text-sm text-prise-text-secondary">No finalized startup assignment yet.</div> : null}</div>
    </section> : null}

    {canEdit ? <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6" aria-labelledby="mentor-availability">
      <h2 id="mentor-availability" className="text-lg font-bold">Mentoring availability</h2>
      <p className="mt-1 text-sm text-prise-text-secondary">Add recurring windows, then publish once. Assigned incubatees are notified only when you publish.</p>
      <div className="mt-4 space-y-2">{mentor.mentorAvailability.map((slot) => <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl bg-prise-page p-3 text-sm"><div><strong>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][slot.dayOfWeek]}</strong><span className="ml-2 text-prise-text-secondary">{minuteTime(slot.startMinute)}–{minuteTime(slot.endMinute)} · {slot.mode.toLowerCase()}</span></div><form action={removeMentorAvailabilityAction}><input type="hidden" name="availabilityId" value={slot.id} /><button aria-label="Remove availability" className="rounded-lg p-2 text-danger hover:bg-danger-bg"><Trash2 size={15} /></button></form></div>)}</div>
      <form action={addMentorAvailabilityAction} className="mt-4 grid gap-3 rounded-xl border p-4 sm:grid-cols-4">
        <input type="hidden" name="mentorId" value={mentor.id} />
        <label className={labelClass}>Day<select name="dayOfWeek" className={inputClass}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label className={labelClass}>Start<input name="startTime" type="time" step={900} required className={inputClass} /></label>
        <label className={labelClass}>End<input name="endTime" type="time" step={900} required className={inputClass} /></label>
        <label className={labelClass}>Mode<select name="mode" className={inputClass}>{['FLEXIBLE','ONLINE','OFFLINE','HYBRID'].map((mode) => <option key={mode}>{mode}</option>)}</select></label>
        <div className="sm:col-span-4"><SubmitButton>Add availability</SubmitButton></div>
      </form>
      <form action={publishMentorAvailabilityAction} className="mt-4 rounded-xl border border-prise-primary/25 bg-info-bg p-4">
        <input type="hidden" name="mentorId" value={mentor.id} />
        <div className="text-sm font-semibold">{mentor.availabilityPublishedAt ? `Published ${new Date(mentor.availabilityPublishedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}` : 'Current changes are not published'}</div>
        <label className="mt-3 flex items-start gap-2 text-xs text-prise-text-secondary"><input name="includePriseTeam" type="checkbox" className="mt-0.5 accent-prise-primary" /><span>Keep the PrISE Team in CC on the publication email.</span></label>
        <SubmitButton className="mt-3">Publish availability</SubmitButton>
      </form>
    </section> : null}

  </div>;
}

function minuteTime(minute: number) {
  const hour = Math.floor(minute / 60);
  return `${hour % 12 || 12}:${String(minute % 60).padStart(2, '0')} ${hour >= 12 ? 'pm' : 'am'}`;
}

function ProfileFact({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: string }) {
  return <div className="rounded-xl bg-prise-page p-3"><div className="flex items-center gap-2 text-xs text-prise-text-secondary"><Icon size={15} />{label}</div><div className="mt-1.5 truncate text-sm font-semibold capitalize">{value}</div></div>;
}

function EngagementFact({ icon: Icon, label, value }: { icon: typeof CalendarCheck2; label: string; value: number }) {
  return <div className="rounded-xl bg-prise-page p-4"><dt className="flex items-center gap-2 text-xs text-prise-text-secondary"><Icon size={15} />{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>;
}

function ReadField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-prise-page p-3"><div className="text-xs text-prise-text-muted">{label}</div><div className="mt-1 leading-6 text-prise-text">{value}</div></div>;
}
