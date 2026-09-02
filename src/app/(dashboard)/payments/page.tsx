import { PaymentStatus, Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { accessibleStartupWhere, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export default async function PaymentsPage() {
  const auth = await requireSession();
  if (auth.user.role === Role.INVESTOR) redirect('/portfolio');
  const startup = await prisma.startup.findFirst({ where: accessibleStartupWhere(auth.user), include: { paymentInstallments: { orderBy: { dueDate: 'asc' } } } });
  const agreed = Number(startup?.agreedFee ?? 0); const paid = Number(startup?.totalFeePaid ?? 0); const balance = Math.max(0, agreed - paid);
  return <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8"><h1 className="text-2xl font-bold tracking-tight">Payments</h1><p className="mt-1.5 text-sm text-prise-text-secondary">A clear read-only view of your program fee and installment position.</p><div className="glass-surface mt-6 grid overflow-hidden rounded-card sm:grid-cols-3"><Metric label="Agreed fee" value={agreed} /><Metric label="Paid" value={paid} /><Metric label="Balance" value={balance} /></div><section className="glass-surface mt-5 overflow-hidden rounded-card"><div className="border-b px-5 py-4 font-semibold">Installments</div><div className="divide-y">{startup?.paymentInstallments.map((item) => <div key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_1fr_160px] sm:items-center"><div className="font-semibold">₹{Number(item.amount).toLocaleString('en-IN')}</div><div className="text-sm text-prise-text-secondary">{item.dueDate.toLocaleDateString('en-IN')}</div><span className={`w-fit rounded-pill px-2.5 py-1 text-xs font-semibold ${item.status === PaymentStatus.PAID ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{item.status.toLowerCase()}</span></div>)}{!startup?.paymentInstallments.length ? <div className="p-10 text-center text-sm text-prise-text-secondary">No installments recorded.</div> : null}</div></section></div>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="border-t px-5 py-6 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"><div className="text-2xl font-bold">₹{value.toLocaleString('en-IN')}</div><div className="mt-1 text-sm text-prise-text-secondary">{label}</div></div>; }
