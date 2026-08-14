import { AssignmentRole, Role } from '@prisma/client';
import { assignStartupPersonAction, removeStartupPersonAction } from '@/app/actions/mentor';
import { createPersonAction, resetPersonPasswordAction, updatePersonAccessAction } from '@/app/actions/workflows';
import { PasswordForm } from '@/components/auth/PasswordForm';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { hasPermission, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await requireSession();
  const canManage = hasPermission(session.user.role, 'people:manage');
  const [people, startups, assignments] = canManage
    ? await Promise.all([
        prisma.person.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
        }),
        prisma.startup.findMany({ orderBy: { sNo: 'asc' }, select: { id: true, name: true } }),
        prisma.startupAssignment.findMany({ include: { startup: { select: { name: true } }, person: { select: { name: true } } }, orderBy: [{ startup: { name: 'asc' } }, { person: { name: 'asc' } }] }),
      ])
    : [[], [], []];

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
      <p className="mt-2 text-sm text-prise-text-secondary">Identity, access and deployment posture.</p>

      <div className="mt-6 rounded-card border bg-white p-5 shadow-card">
        <div className="text-sm font-semibold">Your access</div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Account" value={session.user.email} />
          <Info label="Role" value={session.user.role.replaceAll('_', ' ').toLowerCase()} />
          <Info label="Session expires" value={session.expiresAt.toLocaleString('en-IN')} />
        </div>
      </div>

      <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-semibold">Update your password</h2>
        <p className="mb-5 mt-1 text-sm text-prise-text-secondary">Use your current password and choose a new password with at least 6 characters.</p>
        <div className="max-w-md"><PasswordForm /></div>
      </section>

      {canManage ? (
        <>
          <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-semibold">Create account</h2>
            <p className="mt-1 text-sm text-prise-text-secondary">The person must change the temporary password on first sign-in.</p>
            <form action={createPersonAction} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input name="name" required placeholder="Full name" className="h-11 rounded-input border px-3" />
              <input name="email" type="email" required placeholder="Email" className="h-11 rounded-input border px-3" />
              <input name="phone" placeholder="Phone (optional)" className="h-11 rounded-input border px-3" />
              <select name="role" defaultValue={Role.MENTOR} className="h-11 rounded-input border bg-white px-3">
                {Object.values(Role).map((value) => <option key={value}>{value}</option>)}
              </select>
              <select name="founderOfStartupId" className="h-11 rounded-input border bg-white px-3">
                <option value="">Founder startup (only if applicable)</option>
                {startups.map((startup) => <option key={startup.id} value={startup.id}>{startup.name}</option>)}
              </select>
              <input name="password" type="password" required minLength={6} maxLength={128} placeholder="Temporary password · minimum 6 chars" className="h-11 rounded-input border px-3" />
              <div className="lg:col-span-3"><SubmitButton>Create secure account</SubmitButton></div>
            </form>
          </section>

          <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-semibold">Update a user password</h2>
            <p className="mt-1 text-sm text-prise-text-secondary">Set a new password for any account. Existing sessions for that user will be signed out.</p>
            <form action={resetPersonPasswordAction} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <select name="personId" required className="h-11 rounded-input border bg-white px-3 text-sm">
                <option value="">Choose user</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}
              </select>
              <input name="password" type="password" required minLength={6} maxLength={128} autoComplete="new-password" placeholder="New password · minimum 6 chars" className="h-11 rounded-input border px-3" />
              <SubmitButton>Update password</SubmitButton>
            </form>
          </section>

          <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-semibold">Startup team assignments</h2>
            <p className="mt-1 text-sm text-prise-text-secondary">Assign mentors, experts and delivery owners so every role sees only the startups relevant to them.</p>
            <form action={assignStartupPersonAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
              <select name="startupId" required className="h-11 rounded-input border bg-white px-3 text-sm"><option value="">Choose startup</option>{startups.map((startup) => <option key={startup.id} value={startup.id}>{startup.name}</option>)}</select>
              <select name="personId" required className="h-11 rounded-input border bg-white px-3 text-sm"><option value="">Choose team member</option>{people.filter((person) => person.isActive).map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role.replaceAll('_', ' ').toLowerCase()}</option>)}</select>
              <select name="assignmentRole" defaultValue={AssignmentRole.MENTOR} className="h-11 rounded-input border bg-white px-3 text-sm">{Object.values(AssignmentRole).map((value) => <option key={value}>{value}</option>)}</select>
              <SubmitButton>Assign</SubmitButton>
            </form>
            <div className="mt-5 divide-y border-t">{assignments.map((assignment) => <form action={removeStartupPersonAction} key={assignment.id} className="flex flex-wrap items-center gap-3 py-3 text-sm"><input type="hidden" name="assignmentId" value={assignment.id} /><div className="min-w-48 flex-1 font-semibold">{assignment.startup.name}</div><div className="min-w-44 text-prise-text-secondary">{assignment.person.name}</div><span className="rounded-pill bg-prise-page px-2.5 py-1 text-xs font-semibold">{assignment.role.toLowerCase()}</span><ConfirmButton message="Remove this startup assignment?">Remove</ConfirmButton></form>)}{assignments.length === 0 ? <div className="py-5 text-sm text-prise-text-secondary">No startup team assignments yet.</div> : null}</div>
          </section>

          <section className="mt-5 overflow-hidden rounded-card border bg-white shadow-card">
            <div className="border-b px-5 py-4"><h2 className="font-semibold">Role and account status</h2></div>
            <div className="divide-y">
              {people.map((person) => (
                <form action={updatePersonAccessAction} key={person.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1fr_160px_100px_auto] md:items-center">
                  <input type="hidden" name="personId" value={person.id} />
                  <div>
                    <div className="text-sm font-semibold">{person.name}</div>
                    <div className="text-xs text-prise-text-secondary">
                      {person.email}{person.lastLoginAt ? ` · last login ${person.lastLoginAt.toLocaleDateString('en-IN')}` : ' · never signed in'}
                    </div>
                  </div>
                  <select name="role" defaultValue={person.role} className="h-10 rounded-input border bg-white px-3 text-sm">
                    {Object.values(Role).map((value) => <option key={value}>{value}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input name="isActive" type="checkbox" defaultChecked={person.isActive} className="accent-prise-primary" /> Active
                  </label>
                  <div className={`text-xs font-semibold ${person.isActive ? 'text-success' : 'text-danger'}`}>{person.isActive ? 'Enabled' : 'Disabled'}</div>
                  <SubmitButton className="!py-2">Save access</SubmitButton>
                </form>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="mt-5 rounded-card border border-warning/20 bg-warning-bg p-5 text-sm text-prise-text-secondary">
          Only the program lead can create accounts or change roles.
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-input bg-prise-page p-3">
      <div className="text-xs text-prise-text-muted">{label}</div>
      <div className="mt-1 truncate font-medium capitalize">{value}</div>
    </div>
  );
}
