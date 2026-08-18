import { PasswordForm } from '@/components/auth/PasswordForm';
import { logoutAction } from '@/app/actions/auth';
import { requireSession } from '@/lib/auth';
import { BrandLockup } from '@/components/brand/BrandIdentity';

export const dynamic = 'force-dynamic';

export default async function PasswordPage() {
  const session = await requireSession({ allowPasswordChange: true, allowPendingApplication: true });
  return <main className="flex min-h-screen items-center justify-center bg-prise-page p-5"><div className="w-full max-w-md rounded-[24px] border bg-white p-8 shadow-card"><BrandLockup priority className="mb-6" /><div className="mb-6 inline-flex rounded-pill bg-warning-bg px-3 py-1 text-xs font-semibold text-warning">Account protection</div><h1 className="text-2xl font-bold tracking-tight">Choose a private password</h1><p className="mb-7 mt-2 text-sm leading-6 text-prise-text-secondary">Hi {session.user.name}. Change the temporary password before opening the workspace.</p><PasswordForm /><form action={logoutAction} className="mt-4"><button className="h-11 w-full rounded-button border bg-white text-sm font-semibold text-prise-text-secondary transition hover:border-prise-primary hover:text-prise-primary">Back to login</button></form></div></main>;
}
