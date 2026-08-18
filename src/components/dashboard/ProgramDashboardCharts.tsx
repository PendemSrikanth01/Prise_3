'use client';

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type NamedValue = { name: string; value: number };
type Attendance = { name: string; date: string; offline: number; online: number; absent: number };
export type DashboardDataset = {
  cohortStatus: NamedValue[];
  states: NamedValue[];
  sectors: NamedValue[];
  legalStructures: NamedValue[];
  documents: Array<{ name: string; submitted: number; pending: number }>;
  feeSummary: NamedValue[];
  agreedFee: NamedValue[];
  eventAttendance: Attendance[];
  meetingAttendance: Attendance[];
};

const COLORS = ['#6C5CE7', '#2F80ED', '#23A36D', '#F2B84B', '#E05252', '#8B7CF6', '#4ECDC4'];
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export function ProgramDashboardCharts({ tab, data, activeCount }: { tab: 'cohort' | 'compliance' | 'finance' | 'engagement'; data: DashboardDataset; activeCount: number }) {
  if (tab === 'cohort') return <div className="mt-5 grid gap-5 xl:grid-cols-2">
    <ChartCard title="1. Cohort overview" note="Official 19-startup roster by current participation status"><Donut data={data.cohortStatus} /></ChartCard>
    <ChartCard title="4. States" note={`${activeCount} active startups by registered state`}><Bars data={data.states} /></ChartCard>
    <ChartCard title="5. Sectors" note="Active portfolio concentration"><Bars data={data.sectors} /></ChartCard>
    <ChartCard title="6. Legal structure" note="Active startups by organisation type"><Donut data={data.legalStructures} /></ChartCard>
  </div>;
  if (tab === 'compliance') return <div className="mt-5">
    <ChartCard title="3. Documents submission" note="Submitted includes submitted or approved evidence; pending is calculated from the active roster"><Stacked data={data.documents} left="submitted" right="pending" leftLabel="Submitted" rightLabel="Pending" /></ChartCard>
  </div>;
  if (tab === 'finance') return <div className="mt-5 grid gap-5 xl:grid-cols-2">
    <ChartCard title="2. Fee payment summary" note="Expected, received and pending values from each active startup record"><MoneyBars data={data.feeSummary} /></ChartCard>
    <ChartCard title="7. Agreed fee distribution" note="Number of active startups at each agreed programme fee"><Bars data={data.agreedFee} /></ChartCard>
  </div>;
  return <div className="mt-5 grid gap-5 xl:grid-cols-2">
    <ChartCard title="8. Events attendance" note="Offline, online and absent records for cohort events"><AttendanceChart data={data.eventAttendance} /></ChartCard>
    <ChartCard title="9. PrISE team meetings" note="Startup attendance for common review and check-in calls"><AttendanceChart data={data.meetingAttendance} /></ChartCard>
  </div>;
}

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-card border bg-white p-5 shadow-card sm:p-6"><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs text-prise-text-secondary">{note}</p><div className="mt-5 h-[330px] min-w-0">{children}</div></section>;
}

function Donut({ data }: { data: NamedValue[] }) {
  return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={110} paddingAngle={3}>{data.map((item,index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend iconType="circle" /></PieChart></ResponsiveContainer>;
}

function Bars({ data }: { data: NamedValue[] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 12, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#6C5CE7" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer>;
}

function MoneyBars({ data }: { data: NamedValue[] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: 18, right: 12 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={(value) => `₹${Number(value)/1000}k`} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="value" radius={[7,7,0,0]}>{data.map((item,index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>;
}

function Stacked({ data, left, right, leftLabel, rightLabel }: { data: Array<Record<string, string | number>>; left: string; right: string; leftLabel: string; rightLabel: string }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: 10, right: 15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey={left} name={leftLabel} stackId="a" fill="#23A36D" radius={[0,0,5,5]} /><Bar dataKey={right} name={rightLabel} stackId="a" fill="#F2B84B" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer>;
}

function AttendanceChart({ data }: { data: Attendance[] }) {
  if (!data.length) return <div className="flex h-full items-center justify-center text-sm text-prise-text-secondary">Attendance will appear after a cohort session is recorded.</div>;
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: 5, right: 10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={70} angle={-12} textAnchor="end" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="offline" name="Offline" stackId="attendance" fill="#6C5CE7" /><Bar dataKey="online" name="Online" stackId="attendance" fill="#2F80ED" /><Bar dataKey="absent" name="Absent" stackId="attendance" fill="#E05252" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer>;
}
