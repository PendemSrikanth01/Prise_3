// components/ui/CohortChartCard.tsx
'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export type WeeklyProgress = { week: string; avgMilestonesComplete: number };

export function CohortChartCard({
  data,
  currentValue,
  changeLabel,
  title = 'Cohort Progress',
}: {
  data: WeeklyProgress[];
  currentValue: number;
  changeLabel: string;
  title?: string;
}) {
  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-6 flex items-start justify-between">
        <div className="text-base font-semibold text-prise-text">{title}</div>
        <span className="rounded-pill border border-prise-border px-3 py-1 text-xs font-medium text-prise-text-secondary">
          This Cohort
        </span>
      </div>

      <div className="mb-6 flex items-baseline gap-3">
        <span className="text-kpi-number text-prise-text">{currentValue}%</span>
        <span className="rounded-pill bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
          {changeLabel}
        </span>
      </div>

      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="prise-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6D5EF5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6D5EF5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#ECECF5" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #ECECF5',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              }}
            />
            <Area
              type="monotone"
              dataKey="avgMilestonesComplete"
              stroke="#6D5EF5"
              strokeWidth={2.5}
              fill="url(#prise-area)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
