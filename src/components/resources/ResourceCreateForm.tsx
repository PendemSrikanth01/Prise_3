'use client';

import { useActionState } from 'react';
import { Link2, Upload } from 'lucide-react';
import { createResourceAction } from '@/app/actions/resources';

const inputClass = 'mt-1.5 h-11 w-full rounded-input border bg-white px-3 text-sm font-normal outline-none focus:border-prise-primary';

export function ResourceCreateForm() {
  const [state, action, pending] = useActionState(createResourceAction, undefined);
  return <form action={action} className="grid gap-3 md:grid-cols-2">
    <label className="text-xs font-semibold text-prise-text-secondary">Title<input name="title" required maxLength={180} placeholder="e.g. Impact metrics template" className={inputClass} /></label>
    <label className="text-xs font-semibold text-prise-text-secondary">Category<input name="category" maxLength={80} placeholder="Template, finance, impact…" className={inputClass} /></label>
    <label className="text-xs font-semibold text-prise-text-secondary">Phase<select name="phase" defaultValue="" className={inputClass}><option value="">All phases</option>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Phase {index + 1}</option>)}</select></label>
    <label className="text-xs font-semibold text-prise-text-secondary">Web link <span className="font-normal">(or upload a file)</span><div className="relative"><Link2 size={15} className="absolute left-3 top-5 text-prise-text-muted" /><input name="externalUrl" type="url" placeholder="https://…" className={`${inputClass} pl-9`} /></div></label>
    <label className="text-xs font-semibold text-prise-text-secondary md:col-span-2">File <span className="font-normal">(or add a web link)</span><input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx" className="mt-1.5 block h-11 w-full rounded-input border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-button file:border-0 file:bg-prise-page file:px-3 file:py-1 file:text-xs file:font-semibold" /></label>
    <label className="text-xs font-semibold text-prise-text-secondary md:col-span-2">Description<textarea name="description" maxLength={800} rows={3} placeholder="How should startups use this resource?" className="mt-1.5 w-full rounded-input border bg-white p-3 text-sm font-normal outline-none focus:border-prise-primary" /></label>
    <div className="flex flex-wrap items-center gap-3 md:col-span-2"><button disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white disabled:opacity-50"><Upload size={16} />{pending ? 'Publishing…' : 'Publish resource'}</button><span className="text-xs text-prise-text-secondary">One file up to 10 MB or one public URL.</span></div>
    {state?.error ? <p role="alert" className="rounded-input bg-danger-bg px-3 py-2 text-sm text-danger md:col-span-2">{state.error}</p> : null}
    {state?.success ? <p role="status" className="rounded-input bg-success-bg px-3 py-2 text-sm text-success md:col-span-2">{state.success}</p> : null}
  </form>;
}
