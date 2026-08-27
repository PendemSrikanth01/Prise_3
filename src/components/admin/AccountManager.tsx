import { Role } from '@prisma/client';
import { archivePersonAction, updatePersonAccessAction } from '@/app/actions/workflows';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { roleLabel } from '@/lib/labels';

type Person = { id: string; name: string; email: string; phone: string | null; role: Role; isActive: boolean; lastLoginAt: Date | null };

export function AccountManager({ people, currentUserId }: { people: Person[]; currentUserId: string }) {
  return <section className="mt-5 overflow-hidden rounded-card border bg-white shadow-card">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">User accounts</h2><p className="mt-1 text-sm text-prise-text-secondary">Edit profile details, role and access in one place.</p></div>
    <div className="divide-y">{people.map((person) => <details key={person.id} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4"><div className={`h-2.5 w-2.5 rounded-full ${person.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{person.name}</div><div className="truncate text-xs text-prise-text-secondary">{person.email}</div></div><span className="rounded-pill bg-prise-page px-2.5 py-1 text-[11px] font-semibold">{roleLabel(person.role)}</span><span className="hidden text-xs text-prise-text-muted sm:block">{person.lastLoginAt ? `Last login ${person.lastLoginAt.toLocaleDateString('en-IN')}` : 'Never signed in'}</span><span className="text-lg text-prise-text-muted transition group-open:rotate-45">+</span></summary>
      <div className="border-t bg-[#fbfbfe] px-5 py-4"><form action={updatePersonAccessAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.2fr_180px_170px_auto]"><input type="hidden" name="personId" value={person.id} /><input name="name" required defaultValue={person.name} aria-label="Full name" className="h-10 rounded-input border px-3 text-sm" /><input name="email" type="email" required defaultValue={person.email} aria-label="Email" className="h-10 rounded-input border px-3 text-sm" /><input name="phone" defaultValue={person.phone ?? ''} placeholder="Phone" aria-label="Phone" className="h-10 rounded-input border px-3 text-sm" /><select name="role" defaultValue={person.role} aria-label="Role" className="h-10 rounded-input border bg-white px-3 text-sm">{Object.values(Role).map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={person.isActive} className="accent-prise-primary" /> Active</label><SubmitButton className="!py-2">Save</SubmitButton></div></form>{person.id !== currentUserId ? <form action={archivePersonAction} className="mt-3 flex justify-end"><input type="hidden" name="personId" value={person.id} /><ConfirmButton message={`Delete ${person.name}'s access? Historical records will be retained.`}>Delete user</ConfirmButton></form> : <p className="mt-3 text-right text-xs text-prise-text-muted">You cannot delete your current account.</p>}</div>
    </details>)}</div>
  </section>;
}

