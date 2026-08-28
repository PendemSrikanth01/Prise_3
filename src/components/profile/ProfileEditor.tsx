'use client';

import Image from 'next/image';
import { useActionState, useEffect } from 'react';
import { updateMyProfileAction, updateMyProfilePhotoAction, type ProfileFeedback } from '@/app/actions/profile';
import { SubmitButton } from '@/components/ui/FormButtons';
import { useToast } from '@/components/ui/ToastProvider';

type Profile = { id: string; name: string; email: string; phone: string | null; organization: string | null; designation: string | null; professionalBio: string | null; profilePhotoKey: string | null };

export function ProfileEditor({ profile }: { profile: Profile }) {
  const field = 'h-11 w-full rounded-input border bg-white px-3 text-sm outline-none focus:border-prise-primary';
  const initial: ProfileFeedback = { status: 'idle', message: '' };
  const [profileState, profileAction] = useActionState(updateMyProfileAction, initial);
  const [photoState, photoAction] = useActionState(updateMyProfilePhotoAction, initial);
  const { notify } = useToast();
  useEffect(() => { if (profileState.status !== 'idle') notify(profileState.message, profileState.status); }, [profileState, notify]);
  useEffect(() => { if (photoState.status !== 'idle') notify(photoState.message, photoState.status); }, [photoState, notify]);
  return <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-prise-page text-lg font-bold text-prise-primary ring-4 ring-white shadow-sm">
        {profile.profilePhotoKey ? <Image src={`/api/profile-photo/${profile.id}`} alt={`${profile.name} profile`} fill sizes="64px" className="object-cover" unoptimized /> : initials(profile.name)}
      </div>
      <div className="min-w-0 flex-1"><h2 className="font-semibold">Your profile</h2><p className="mt-1 text-sm text-prise-text-secondary">This public information helps people understand who they are working with.</p></div>
      <form action={photoAction} className="flex flex-col gap-2 sm:items-end"><input name="photo" type="file" required accept="image/jpeg,image/png,image/webp" className="max-w-64 text-xs" /><SubmitButton className="!min-h-9 !py-1.5">Upload photo</SubmitButton></form>
    </div>
    <form action={profileAction} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label><span className="mb-1.5 block text-sm font-medium">Name</span><input name="name" required defaultValue={profile.name} className={field} /></label>
      <label><span className="mb-1.5 block text-sm font-medium">Email</span><input value={profile.email} disabled className={`${field} bg-prise-page`} /></label>
      <label><span className="mb-1.5 block text-sm font-medium">Phone</span><input name="phone" defaultValue={profile.phone ?? ''} className={field} /></label>
      <label><span className="mb-1.5 block text-sm font-medium">Role / designation</span><input name="designation" defaultValue={profile.designation ?? ''} className={field} /></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Organisation</span><input name="organization" defaultValue={profile.organization ?? ''} className={field} /></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Short profile</span><textarea name="professionalBio" defaultValue={profile.professionalBio ?? ''} rows={3} className="w-full rounded-input border p-3 text-sm outline-none focus:border-prise-primary" placeholder="What you do and how you support the PrISE community" /></label>
      <div className="sm:col-span-2"><SubmitButton>Save profile</SubmitButton></div>
    </form>
  </section>;
}

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
