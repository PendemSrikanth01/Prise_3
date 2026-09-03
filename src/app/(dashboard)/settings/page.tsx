import { NotificationTemplateKey, Role, StartupMemberRole } from '@prisma/client';
import { createPersonAction, removeInvestorShareAction, resetPersonPasswordAction, shareStartupWithInvestorAction } from '@/app/actions/workflows';
import { AccountManager } from '@/components/admin/AccountManager';
import { PasswordForm } from '@/components/auth/PasswordForm';
import { FounderStartupAccessForm } from '@/components/admin/FounderStartupAccessForm';
import { StartupTeamAssignments } from '@/components/admin/StartupTeamAssignments';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { hasPermission, requireSession } from '@/lib/auth';
import { roleLabel } from '@/lib/labels';
import { prisma } from '@/lib/prisma';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { NotificationTemplateManager } from '@/components/admin/NotificationTemplateManager';
import { NOTIFICATION_TEMPLATE_DEFAULTS, renderTemplateContent, sampleTemplateVariables } from '@/lib/notification-templates';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await requireSession();
  const canManage = hasPermission(session.user.role, 'people:manage');
  const profile = await prisma.person.findUniqueOrThrow({ where: { id: session.user.id }, select: { id: true, name: true, email: true, phone: true, organization: true, designation: true, professionalBio: true, profilePhotoKey: true } });
  const [people, startups, assignments, investorShares, storedTemplates] = canManage
    ? await Promise.all([
        prisma.person.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, founderOfStartupId: true, startupMemberships: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { startupId: true, role: true } } },
        }),
        prisma.startup.findMany({ orderBy: { sNo: 'asc' }, select: { id: true, name: true } }),
        prisma.startupAssignment.findMany({ include: { startup: { select: { name: true } }, person: { select: { name: true } } }, orderBy: [{ startup: { name: 'asc' } }, { person: { name: 'asc' } }] }),
        prisma.investorStartupShare.findMany({ include: { startup: { select: { name: true } }, investor: { select: { name: true, email: true } } }, orderBy: [{ startup: { name: 'asc' } }, { investor: { name: 'asc' } }] }),
        prisma.notificationTemplate.findMany({ orderBy: { key: 'asc' } }),
      ])
    : [[], [], [], [], []];
  const storedByKey = new Map(storedTemplates.map((template) => [template.key, template]));
  const notificationTemplates = Object.values(NotificationTemplateKey).map((key) => {
    const stored = storedByKey.get(key);
    const fallback = NOTIFICATION_TEMPLATE_DEFAULTS[key];
    const subjectTemplate = stored?.subjectTemplate ?? fallback.subject;
    const bodyTemplate = stored?.bodyTemplate ?? fallback.body;
    const preview = renderTemplateContent(subjectTemplate, bodyTemplate, sampleTemplateVariables(key));
    return { key, name: stored?.name ?? fallback.name, subjectTemplate, bodyTemplate, isActive: stored?.isActive ?? true, autoSend: stored?.autoSend ?? true, previewSubject: preview.subject, previewText: preview.text };
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl p-4 [&_form]:min-w-0 [&_input]:min-w-0 [&_select]:min-w-0 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
      <p className="mt-2 text-sm text-prise-text-secondary">Identity, access and deployment posture.</p>

      <div className="mt-6 rounded-card border bg-white p-5 shadow-card">
        <div className="text-sm font-semibold">Your access</div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Account" value={session.user.email} />
          <Info label="Role" value={roleLabel(session.user.role)} />
          <Info label="Session expires" value={session.expiresAt.toLocaleString('en-IN')} />
        </div>
      </div>

      <ProfileEditor profile={profile} />

      <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-semibold">Update your password</h2>
        <p className="mb-5 mt-1 text-sm text-prise-text-secondary">Use your current password and choose a new password with at least 6 characters.</p>
        <div className="max-w-md"><PasswordForm /></div>
      </section>

      {canManage ? (
        <>
          <NotificationTemplateManager templates={notificationTemplates} testRecipient={session.user.email} />
          <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-semibold">Create account</h2>
            <p className="mt-1 text-sm text-prise-text-secondary">The person must change the temporary password on first sign-in.</p>
            <form action={createPersonAction} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input name="name" required placeholder="Full name" className="h-11 rounded-input border px-3" />
              <input name="email" type="email" required placeholder="Email" className="h-11 rounded-input border px-3" />
              <input name="phone" placeholder="Phone (optional)" className="h-11 rounded-input border px-3" />
              <select name="role" defaultValue={Role.MENTOR} className="h-11 rounded-input border bg-white px-3">
                {Object.values(Role).map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}
              </select>
              <select name="founderOfStartupId" className="h-11 rounded-input border bg-white px-3">
                <option value="">Incubatee startup (only if applicable)</option>
                {startups.map((startup) => <option key={startup.id} value={startup.id}>{startup.name}</option>)}
              </select>
              <input name="password" type="password" required minLength={6} maxLength={128} placeholder="Temporary password · minimum 6 chars" className="h-11 rounded-input border px-3" />
              <div className="lg:col-span-3"><SubmitButton>Create secure account</SubmitButton></div>
            </form>
          </section>

          <section className="mt-5 overflow-hidden rounded-card border bg-white shadow-card">
            <div className="border-b px-5 py-4"><h2 className="font-semibold">Incubatee startup access</h2><p className="mt-1 text-sm text-prise-text-secondary">Connect an unlinked incubatee, move them to the correct startup, or transfer ownership. Changes are audited.</p></div>
            <div className="divide-y">{people.filter((person) => person.role === Role.FOUNDER).map((person) => {
              const membership = person.startupMemberships.find((item) => item.startupId === person.founderOfStartupId) ?? person.startupMemberships[0];
              return <FounderStartupAccessForm key={person.id} founder={{ id: person.id, name: person.name, email: person.email, startupId: person.founderOfStartupId ?? membership?.startupId ?? '', membershipRole: membership?.role ?? StartupMemberRole.OWNER }} startups={startups} />;
            })}{people.every((person) => person.role !== Role.FOUNDER) ? <div className="px-5 py-6 text-sm text-prise-text-secondary">No incubatee accounts yet.</div> : null}</div>
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

          <StartupTeamAssignments startups={startups} people={people.map(({ id, name, role, isActive }) => ({ id, name, role, isActive }))} assignments={assignments} />

          <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-semibold">Investor portfolio access</h2>
            <p className="mt-1 text-sm text-prise-text-secondary">Share only approved milestone progress. Internal tasks, onboarding, payments and support remain private.</p>
            <form action={shareStartupWithInvestorAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
              <select name="startupId" required className="h-11 rounded-input border bg-white px-3 text-sm"><option value="">Choose startup</option>{startups.map((startup) => <option key={startup.id} value={startup.id}>{startup.name}</option>)}</select>
              <select name="investorId" required className="h-11 rounded-input border bg-white px-3 text-sm"><option value="">Choose investor</option>{people.filter((person) => person.role === Role.INVESTOR && person.isActive).map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select>
              <label className="flex items-center gap-2 rounded-input border px-3 text-xs font-semibold"><input type="checkbox" name="canViewDocuments" /> Approved files</label>
              <SubmitButton>Share</SubmitButton>
            </form>
            <div className="mt-5 divide-y border-t">{investorShares.map((share) => <form action={removeInvestorShareAction} key={share.id} className="flex flex-wrap items-center gap-3 py-3 text-sm"><input type="hidden" name="shareId" value={share.id} /><div className="min-w-48 flex-1 font-semibold">{share.startup.name}</div><div className="min-w-48 text-prise-text-secondary">{share.investor.name} · {share.investor.email}</div><span className="rounded-pill bg-prise-page px-2.5 py-1 text-xs font-semibold">{share.canViewDocuments ? 'Approved files on' : 'Progress only'}</span><ConfirmButton message="Remove this investor's portfolio access?">Remove</ConfirmButton></form>)}{investorShares.length === 0 ? <div className="py-5 text-sm text-prise-text-secondary">No investor access has been shared.</div> : null}</div>
          </section>

          <AccountManager people={people.map(({ id, name, email, phone, role, isActive, lastLoginAt, founderOfStartupId }) => ({ id, name, email, phone, role, isActive, lastLoginAt, founderOfStartupId }))} currentUserId={session.user.id} />
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
