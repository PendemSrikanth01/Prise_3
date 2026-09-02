import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessStartupProfile } from '@/lib/startup-profile-access';

export const dynamic = 'force-dynamic';

export default async function StartupProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (!(await canAccessStartupProfile(session.user, id))) notFound();
  const startup = await prisma.startup.findFirst({
    where: { id, profilePdfStorageKey: { not: null } },
    select: { id: true, name: true, founderName: true, sector: true, operationLocation: true, state: true, legalStructure: true, logoStorageKey: true, profilePdfName: true },
  });
  if (!startup) notFound();

  return <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6 lg:p-8">
    <Link href="/directory?view=incubatees" className="inline-flex items-center gap-2 text-sm font-semibold text-prise-primary"><ArrowLeft size={16} />Back to directory</Link>
    <section className="mt-4 overflow-hidden rounded-card border bg-white shadow-card">
      <header className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {startup.logoStorageKey ? <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-white"><Image src={`/api/startup-logo/${startup.id}`} alt={`${startup.name} logo`} fill sizes="56px" className="object-contain p-1.5" unoptimized /></div> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-prise-page text-lg font-bold text-prise-primary">{startup.name.slice(0, 2).toUpperCase()}</div>}
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Incubatee profile</p><h1 className="truncate text-xl font-bold">{startup.name}</h1><p className="mt-1 text-sm text-prise-text-secondary">{[startup.founderName, startup.sector, startup.operationLocation || startup.state].filter(Boolean).join(' · ')}</p></div>
        </div>
        <a href={`/api/startup-profile/${startup.id}?download=1`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-prise-primary px-4 py-2.5 text-sm font-semibold text-white"><Download size={16} />Download PDF</a>
      </header>
      <div className="bg-prise-page p-3 sm:p-5">
        <iframe src={`/api/startup-profile/${startup.id}`} title={`${startup.name} onboarding profile`} className="h-[72vh] min-h-[620px] w-full rounded-lg border bg-white" />
        <p className="mt-3 text-xs text-prise-text-muted">Document: {startup.profilePdfName}</p>
      </div>
    </section>
  </div>;
}
