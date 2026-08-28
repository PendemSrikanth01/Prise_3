import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StartupStatus } from '@prisma/client';
import { updateStartupAction } from '@/app/actions/workflows';
import { SubmitButton } from '@/components/ui/FormButtons';
import { isProgramRole, requireStartupAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function EditStartupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStartupAccess(id, 'startup:update');
  const startup = await prisma.startup.findUnique({ where: { id } });
  if (!startup) notFound();
  const programEditor = isProgramRole(session.user.role);
  return <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8"><Link href={`/startups/${id}`} className="text-sm font-semibold text-prise-primary">← Startup 360</Link><div className="mt-5 rounded-card border bg-white p-6 shadow-card sm:p-8"><h1 className="text-2xl font-bold tracking-tight">Edit startup profile</h1><p className="mt-2 text-sm text-prise-text-secondary">Incubatees manage public profile details. Program status and health remain controlled by the program team.</p><form action={updateStartupAction} className="mt-7 grid gap-5 sm:grid-cols-2"><input type="hidden" name="startupId" value={id} /><Field name="name" label="Startup name" value={startup.name} required /><Field name="founderName" label="Incubatee lead" value={startup.founderName} required /><Field name="founderEmail" label="Contact email" type="email" value={startup.founderEmail} /><Field name="founderPhone" label="Contact phone" value={startup.founderPhone} /><Field name="operationLocation" label="Operating location" value={startup.operationLocation} /><Field name="state" label="State" value={startup.state} /><Field name="sector" label="Sector" value={startup.sector} /><Field name="legalStructure" label="Legal structure" value={startup.legalStructure} />{programEditor ? <><label className="block"><span className="mb-2 block text-sm font-medium">Operating status</span><select name="status" defaultValue={startup.status} className="h-12 w-full rounded-input border bg-white px-3">{Object.values(StartupStatus).map((value) => <option key={value}>{value}</option>)}</select></label><Field name="documentFolderLink" label="Document folder URL" type="url" value={startup.documentFolderLink} /><label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium">Current health / next action</span><textarea name="healthStatus" defaultValue={startup.healthStatus ?? ''} rows={4} className="w-full rounded-input border p-3" /></label></> : null}<div className="flex justify-end gap-3 sm:col-span-2"><Link href={`/startups/${id}`} className="rounded-button border px-4 py-2.5 text-sm font-semibold">Cancel</Link><SubmitButton>Save profile</SubmitButton></div></form></div></div>;
}

function Field({ name, label, value, type = 'text', required = false }: { name: string; label: string; value: string | null; type?: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><input name={name} type={type} required={required} defaultValue={value ?? ''} className="h-12 w-full rounded-input border bg-white px-3 outline-none focus:border-prise-primary" /></label>;
}
