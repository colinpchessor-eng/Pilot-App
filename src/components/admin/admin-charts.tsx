'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ApplicantData } from '@/lib/types';
import { useMemo } from 'react';
import { format, subWeeks, startOfWeek, isAfter } from 'date-fns';

const PIE_COLORS = ['#E3E3E3', '#007AB7', '#FF6200', '#4D148C'];

export function AdminCharts({
  allUsers,
  submittedApplications,
}: {
  allUsers: ApplicantData[];
  submittedApplications: ApplicantData[];
}) {
  const statusData = useMemo(() => {
    let notStarted = 0;
    let inProgress = 0;
    let submitted = 0;
    let verifiedNotStarted = 0;

    for (const u of allUsers) {
      if (u.submittedAt) {
        submitted++;
      } else if (u.flightTime?.total > 0 || u.typeRatings?.length > 0) {
        inProgress++;
      } else if ((u as any).status === 'verified') {
        verifiedNotStarted++;
      } else {
        notStarted++;
      }
    }

    return [
      { name: 'Not Started', value: notStarted },
      { name: 'In Progress', value: inProgress },
      { name: 'Submitted', value: submitted },
      { name: 'Verified (not started)', value: verifiedNotStarted },
    ].filter((d) => d.value > 0);
  }, [allUsers]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; start: Date; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      weeks.push({ label: format(weekStart, 'MMM d'), start: weekStart, count: 0 });
    }

    for (const app of submittedApplications) {
      if (!app.submittedAt) continue;
      const d = app.submittedAt.toDate();
      for (let w = weeks.length - 1; w >= 0; w--) {
        if (isAfter(d, weeks[w].start) || d.getTime() === weeks[w].start.getTime()) {
          weeks[w].count++;
          break;
        }
      }
    }

    return weeks.map((w) => ({ week: w.label, submissions: w.count }));
  }, [submittedApplications]);

  const total = statusData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <div className="bg-white rounded-xl border border-[#E3E3E3] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-[16px] font-bold text-[#333333] mb-4">Application Status</h3>
        {total === 0 ? (
          <p className="text-sm text-[#8E8E8E] text-center py-12">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value} (${Math.round((value / total) * 100)}%)`}
                labelLine={false}
                fontSize={11}
              >
                {statusData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E3E3E3] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-[16px] font-bold text-[#333333] mb-4">Weekly Submissions</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F2" />
            <XAxis dataKey="week" fontSize={12} tick={{ fill: '#8E8E8E' }} />
            <YAxis allowDecimals={false} fontSize={12} tick={{ fill: '#8E8E8E' }} />
            <Tooltip />
            <Bar dataKey="submissions" fill="#4D148C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
