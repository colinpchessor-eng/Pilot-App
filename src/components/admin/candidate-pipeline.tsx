'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import {
  PIPELINE_STAGES,
  countCandidatesByPipelineStage,
} from '@/lib/candidate-pipeline';

export type UpcomingInterviewRow = {
  when: Date;
  candidateName: string;
};

type Props = {
  candidates: { flowStatus?: string | null }[];
  upcomingInterviews?: UpcomingInterviewRow[];
};

const badgeBase =
  'inline-flex flex-col items-center shrink-0 min-w-[72px]';

export function CandidatePipeline({ candidates, upcomingInterviews = [] }: Props) {
  const counts = countCandidatesByPipelineStage(candidates);
  const notSel = counts.not_selected ?? 0;

  return (
    <div
      className="bg-white overflow-x-auto"
      style={{
        borderRadius: 12,
        border: '1px solid #E3E3E3',
        padding: 24,
      }}
    >
      <h2 className="text-[20px] font-bold text-[#333333] mb-6">Candidate Pipeline</h2>
      <div className="flex items-start gap-1 pb-2 min-w-min">
        {PIPELINE_STAGES.map((stage, i) => {
          const n = counts[stage.id] ?? 0;
          const active = n > 0;
          const circleBg = active ? '#4D148C' : '#E3E3E3';
          const circleColor = active ? '#FFFFFF' : '#8E8E8E';
          return (
            <div key={stage.id} className="flex items-start gap-1 shrink-0">
              <Link
                href={`/admin/candidates?stage=${encodeURIComponent(stage.id)}`}
                className={`${badgeBase} rounded-xl p-2 -m-2 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4D148C] focus-visible:ring-offset-2`}
              >
                <span
                  className="flex items-center justify-center rounded-full text-[15px] font-bold mb-2"
                  style={{
                    width: 44,
                    height: 44,
                    background: circleBg,
                    color: circleColor,
                  }}
                >
                  {n}
                </span>
                <span
                  className="text-[11px] font-semibold text-center leading-tight max-w-[88px] text-[#565656]"
                >
                  {stage.label}
                </span>
              </Link>
              {i < PIPELINE_STAGES.length - 1 && (
                <span className="flex items-center justify-center pt-[10px] text-[#CFCFCF] px-0.5" aria-hidden>
                  <ChevronRight className="h-5 w-5" strokeWidth={2} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {upcomingInterviews.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[#F2F2F2]">
          <h3 className="text-[14px] font-bold text-[#333333] mb-3 flex items-center justify-between gap-2">
            <span>Upcoming interviews</span>
            <span className="text-[12px] font-semibold text-[#007AB7]">{upcomingInterviews.length} scheduled</span>
          </h3>
          <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {upcomingInterviews.map((row, idx) => (
              <li
                key={`${row.candidateName}-${row.when.getTime()}-${idx}`}
                className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] border-b border-[#F2F2F2] last:border-0 pb-2 last:pb-0"
              >
                <span className="text-[#007AB7] font-semibold tabular-nums">{format(row.when, 'EEE MMM d · h:mm a')}</span>
                <span className="text-[#333333] font-medium truncate max-w-[60%] text-right">{row.candidateName}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/interviews"
            className="inline-block mt-3 text-[12px] font-semibold text-[#4D148C] hover:underline"
          >
            Manage in Interview Management →
          </Link>
        </div>
      )}
      {notSel > 0 && (
        <p className="text-[12px] text-[#8E8E8E] mt-4">
          Not selected: <span className="font-semibold text-[#565656]">{notSel}</span>
        </p>
      )}
    </div>
  );
}
