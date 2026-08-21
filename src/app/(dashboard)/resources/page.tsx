import { Archive, ExternalLink, FileText, Library, Search } from 'lucide-react';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { archiveResourceAction } from '@/app/actions/resources';
import { ResourceCreateForm } from '@/components/resources/ResourceCreateForm';
import { ConfirmButton } from '@/components/ui/FormButtons';
import { isProgramRole, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ q?: string; phase?: string }> }) {
  const session = await requireSession();
  if (session.user.role === Role.INVESTOR) redirect('/portfolio');
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? '';
  const phaseValue = Number(params.phase);
  const phase = Number.isInteger(phaseValue) && phaseValue >= 1 && phaseValue <= 8 ? phaseValue : null;
  const canPublish = isProgramRole(session.user.role) || session.user.role === Role.MENTOR;
  const canArchive = isProgramRole(session.user.role);

  const resources = await prisma.resource.findMany({
    where: {
      isArchived: false,
      ...(phase ? { phase } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ] } : {}),
    },
    orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
    include: { uploader: { select: { name: true, role: true } } },
  });

  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
    <header className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-purple-bg text-accent-purple"><Library size={21} /></div><div><div className="text-xs font-semibold uppercase tracking-[.12em] text-prise-primary">Shared knowledge library</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Resources</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Reusable guides, templates, sheets and links for the whole incubation workspace.</p></div></header>

    {canPublish ? <details className="mt-6 rounded-card border bg-white p-5 shadow-card sm:p-6"><summary className="cursor-pointer list-none text-sm font-semibold text-prise-primary">+ Add a resource</summary><div className="mt-5 border-t pt-5"><ResourceCreateForm /></div></details> : null}

    <form className="mt-5 grid gap-2 rounded-card border bg-white p-3 shadow-card sm:grid-cols-[1fr_180px_auto]" action="/resources">
      <label className="relative"><span className="sr-only">Search resources</span><Search size={16} className="absolute left-3 top-3 text-prise-text-muted" /><input name="q" defaultValue={q} placeholder="Search resources…" className="h-10 w-full rounded-input border bg-white pl-9 pr-3 text-sm outline-none focus:border-prise-primary" /></label>
      <select name="phase" defaultValue={phase ?? ''} aria-label="Filter by phase" className="h-10 rounded-input border bg-white px-3 text-sm"><option value="">All phases</option>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Phase {index + 1}</option>)}</select>
      <button className="h-10 rounded-button bg-prise-sidebar px-4 text-sm font-semibold text-white">Filter</button>
    </form>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <article key={resource.id} className="flex min-h-52 flex-col rounded-card border bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-prise-page text-prise-primary">{resource.externalUrl ? <ExternalLink size={18} /> : <FileText size={18} />}</div><div className="flex flex-wrap justify-end gap-1.5">{resource.phase ? <span className="rounded-pill bg-accent-purple-bg px-2.5 py-1 text-[11px] font-semibold text-accent-purple">Phase {resource.phase}</span> : null}{resource.category ? <span className="rounded-pill bg-prise-page px-2.5 py-1 text-[11px] font-semibold text-prise-text-secondary">{resource.category}</span> : null}</div></div>
      <h2 className="mt-4 font-semibold leading-5">{resource.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-5 text-prise-text-secondary">{resource.description || 'Shared resource for the PrISE workspace.'}</p>
      <div className="mt-auto pt-4"><div className="text-[11px] text-prise-text-muted">Added by {resource.uploader?.name ?? 'Program team'} · {resource.createdAt.toLocaleDateString('en-IN')}</div><div className="mt-3 flex items-center justify-between gap-3">{resource.externalUrl ? <a href={resource.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-prise-primary">Open link <ExternalLink size={14} /></a> : <a href={`/api/resources/${resource.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-prise-primary">Download file <FileText size={14} /></a>}{canArchive ? <form action={archiveResourceAction}><input type="hidden" name="resourceId" value={resource.id} /><ConfirmButton message="Archive this shared resource?"><Archive size={14} /></ConfirmButton></form> : null}</div></div>
    </article>)}{resources.length === 0 ? <div className="rounded-card border border-dashed p-12 text-center text-sm text-prise-text-secondary sm:col-span-2 xl:col-span-3">No matching resources yet.</div> : null}</div>
  </div>;
}
