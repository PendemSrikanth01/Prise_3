'use client';

import { StartupMemberRole } from '@prisma/client';
import { useActionState, useEffect } from 'react';
import { updateFounderStartupAccessAction, type ActionFeedback } from '@/app/actions/workflows';
import { SubmitButton } from '@/components/ui/FormButtons';
import { useToast } from '@/components/ui/ToastProvider';

type Startup = { id: string; name: string };
type Founder = { id: string; name: string; email: string; startupId: string; membershipRole: StartupMemberRole };
const initialState: ActionFeedback = { status: 'idle', message: '' };

export function FounderStartupAccessForm({ founder, startups }: { founder: Founder; startups: Startup[] }) {
  const [state, action] = useActionState(updateFounderStartupAccessAction, initialState);
  const { notify } = useToast();
  useEffect(() => { if (state.status !== 'idle') notify(state.message, state.status); }, [state, notify]);

  return <form action={action} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.1fr_1fr_140px] lg:items-center xl:grid-cols-[1.1fr_1fr_140px_170px_auto]">
    <input type="hidden" name="personId" value={founder.id} />
    <div><div className="text-sm font-semibold">{founder.name}</div><div className="text-xs text-prise-text-secondary">{founder.email}</div></div>
    <select name="startupId" defaultValue={founder.startupId} className="h-10 min-w-0 rounded-input border bg-white px-3 text-sm"><option value="">No startup access</option>{startups.map((startup) => <option key={startup.id} value={startup.id}>{startup.name}</option>)}</select>
    <select name="membershipRole" defaultValue={founder.membershipRole} className="h-10 min-w-0 rounded-input border bg-white px-3 text-sm">{Object.values(StartupMemberRole).map((role) => <option key={role}>{role}</option>)}</select>
    <label className="flex items-center gap-2 text-xs font-semibold text-prise-text-secondary"><input type="checkbox" name="confirmOwnershipChange" className="accent-prise-primary" /> Confirm move / transfer</label>
    <SubmitButton className="!py-2">Save startup access</SubmitButton>
  </form>;
}
