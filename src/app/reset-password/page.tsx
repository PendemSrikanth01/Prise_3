import Link from 'next/link';
import { BrandLockup } from '@/components/brand/BrandIdentity';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { validPasswordResetToken } from '@/lib/password-reset';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token || '';
  const validTokenShape = validPasswordResetToken(token);
  return <main className="flex min-h-screen items-center justify-center bg-prise-page p-5"><div className="w-full max-w-md rounded-[24px] border border-prise-border bg-white p-8 shadow-card"><BrandLockup priority className="mb-7" /><div className="mb-5 inline-flex rounded-pill bg-info-bg px-3 py-1 text-xs font-semibold text-info">Secure account recovery</div><h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1><p className="mb-7 mt-2 text-sm leading-6 text-prise-text-secondary">Use a private password you have not used for this account.</p>{validTokenShape ? <ResetPasswordForm token={token} /> : <div className="space-y-4"><div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">This reset link is invalid. Request a new link from the login page.</div><Link href="/login" className="flex h-11 w-full items-center justify-center rounded-button border border-prise-border text-sm font-semibold text-prise-primary">Return to login</Link></div>}</div></main>;
}
