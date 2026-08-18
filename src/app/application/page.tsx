import { Archive, CheckCircle2, Clock3, Download, LogOut } from 'lucide-react';
import { OnboardingStatus, Role, StartupStatus } from '@prisma/client';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { archiveOnboardingDocumentAction } from '@/app/actions/documents';
import { OnboardingUploadForm } from '@/components/documents/OnboardingUploadForm';
import { BrandLockup } from '@/components/brand/BrandIdentity';
import { ConfirmButton } from '@/components/ui/FormButtons';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ApplicationPage() {
  const session = await requireSession({ allowPendingApplication: true });
  if (session.user.role !== Role.FOUNDER) redirect('/');
  const startup = await prisma.startup.findFirst({
    where: accessibleStartupWhere(session.user),
    include: { onboardingItems: { orderBy: { type: 'asc' }, include: { documents: { where: { archivedAt: null }, orderBy: { createdAt: 'desc' }, include: { uploader: { select: { name: true } } } } } } },
  });
  if (!startup) redirect('/login');
  if (startup.status !== StartupStatus.APPLICATION_PENDING && startup.status !== StartupStatus.REJECTED) redirect('/');
  const rejected = startup.status === StartupStatus.REJECTED;
  return <main className="min-h-screen bg-prise-page p-4 sm:p-8"><div className="mx-auto max-w-4xl"><header className="flex flex-wrap items-start justify-between gap-3"><BrandLockup priority className="w-[min(100%,300px)]" /><form action={logoutAction}><button className="inline-flex items-center gap-2 rounded-button border bg-white px-3 py-2 text-sm font-semibold"><LogOut size={15} />Sign out</button></form></header>
    <section className="mt-8 rounded-card bg-prise-sidebar p-6 text-white shadow-card sm:p-8"><div className="text-xs font-semibold uppercase tracking-[.12em] text-white/55">{rejected ? 'Program decision' : 'Application received'}</div><h1 className="mt-2 text-3xl font-bold">{startup.name}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{rejected ? startup.healthStatus || 'The Program Team requested changes before this application can proceed.' : 'Your account is active for application tracking. Complete the items below while the Program Team reviews your startup.'}</p><div className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${rejected ? 'bg-red-400/15 text-red-100' : 'bg-amber-300/15 text-amber-100'}`}>{rejected ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}{rejected ? 'Changes required' : 'Review pending'}</div></section>
    <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6"><h2 className="text-lg font-bold">Application checklist</h2><p className="mt-1 text-sm text-prise-text-secondary">Upload the latest version for each requested item. A new upload returns the item to submitted status.</p><div className="mt-5 divide-y">{startup.onboardingItems.map((item) => <div key={item.id} className="py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold">{item.type.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())}</div><div className="mt-1 text-xs text-prise-text-secondary">{item.remarks || 'No reviewer note yet.'}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === OnboardingStatus.APPROVED ? 'bg-success-bg text-success' : item.status === OnboardingStatus.NEEDS_REVISION ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'}`}>{item.status.replaceAll('_', ' ').toLowerCase()}</span></div>{item.documents.length ? <div className="mt-3 flex flex-wrap gap-2">{item.documents.map((document) => <div key={document.id} className="inline-flex items-center rounded-lg border"><a href={`/api/onboarding-documents/${document.id}`} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-prise-primary"><Download size={13} />{document.name} · v{document.version}</a>{document.uploaderId === session.user.id && item.status !== OnboardingStatus.APPROVED ? <form action={archiveOnboardingDocumentAction} className="border-l"><input type="hidden" name="onboardingDocumentId" value={document.id} /><ConfirmButton message="Archive this file version?" className="!rounded-none !px-2"><Archive size={13} /></ConfirmButton></form> : null}</div>)}</div> : null}{item.status !== OnboardingStatus.APPROVED && item.status !== OnboardingStatus.NA ? <OnboardingUploadForm onboardingItemId={item.id} /> : null}</div>)}</div></section>
  </div></main>;
}
