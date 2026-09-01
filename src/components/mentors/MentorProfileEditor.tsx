'use client';

import Image from 'next/image';
import { Award, BriefcaseBusiness, CalendarClock, Camera, ExternalLink, MapPin } from 'lucide-react';
import { updateMentorPhotoAction, updateMentorProfileAction } from '@/app/actions/mentor-profile';
import { SubmitButton } from '@/components/ui/FormButtons';

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
  _count: { assignments: number };
};

const inputClass = 'h-11 w-full rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';
const labelClass = 'grid gap-1.5 text-sm font-medium text-prise-text';

export function MentorProfileEditor({ mentor, canEdit }: { mentor: MentorProfileData; canEdit: boolean }) {
  return <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
    <div className="rounded-card border bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4"><div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-purple-bg text-lg font-bold text-accent-purple ring-4 ring-white shadow-sm">{mentor.profilePhotoKey ? <Image src={`/api/mentor-photo/${mentor.id}`} alt={`${mentor.name} profile`} fill sizes="64px" className="object-cover" unoptimized /> : mentor.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Mentor profile</p><h1 className="mt-1 truncate text-2xl font-bold tracking-tight">{mentor.name}</h1><p className="mt-1 truncate text-sm text-prise-text-secondary">{mentor.designation || 'Mentor'}{mentor.organization ? ` · ${mentor.organization}` : ''}</p></div></div>
        {canEdit ? <form action={updateMentorPhotoAction} className="flex items-center gap-2" encType="multipart/form-data"><input type="hidden" name="mentorId" value={mentor.id} /><label className="inline-flex cursor-pointer items-center gap-2 rounded-button border bg-white px-3 py-2 text-xs font-semibold text-prise-primary"><Camera size={15} />Update photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="sr-only" onChange={(event) => event.currentTarget.form?.requestSubmit()} /></label></form> : null}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ProfileFact icon={BriefcaseBusiness} label="Domain" value={mentor.professionalDomain || 'Not added'} /><ProfileFact icon={MapPin} label="Location" value={mentor.mentorLocation || 'Not added'} /><ProfileFact icon={Award} label="Experience" value={mentor.yearsExperience === null ? 'Not added' : `${mentor.yearsExperience} years`} /><ProfileFact icon={CalendarClock} label="Mentoring" value={mentor.mentoringFrequency || 'Flexible'} /></div>
    </div>

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

  </div>;
}

function ProfileFact({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: string }) {
  return <div className="rounded-xl bg-prise-page p-3"><div className="flex items-center gap-2 text-xs text-prise-text-secondary"><Icon size={15} />{label}</div><div className="mt-1.5 truncate text-sm font-semibold capitalize">{value}</div></div>;
}

function ReadField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-prise-page p-3"><div className="text-xs text-prise-text-muted">{label}</div><div className="mt-1 leading-6 text-prise-text">{value}</div></div>;
}
