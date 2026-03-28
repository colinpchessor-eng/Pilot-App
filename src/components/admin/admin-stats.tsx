'use client';

import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  FileClock,
  CheckCircle,
  Clock,
  Trash2,
  Calendar,
  Mail,
} from 'lucide-react';

type StatCard = {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  pulse?: boolean;
};

export function AdminStats({
  totalCandidates,
  verifiedCandidates,
  inProgress,
  totalSubmissions,
  pendingVerifications,
  pendingDeletions,
  interviewsScheduled,
  emailsSentToday,
  verificationsHref = '/admin#identity-verifications',
  deletionsHref = '/admin#deletion-requests',
}: {
  totalCandidates: number;
  verifiedCandidates: number;
  inProgress: number;
  totalSubmissions: number;
  pendingVerifications: number;
  pendingDeletions: number;
  interviewsScheduled: number;
  emailsSentToday: number;
  verificationsHref?: string;
  deletionsHref?: string;
}) {
  const cards: StatCard[] = [
    { title: 'Total Candidates', value: totalCandidates, icon: <Users />, color: '#4D148C' },
    { title: 'Verified', value: verifiedCandidates, icon: <ShieldCheck />, color: '#008A00' },
    { title: 'In Progress', value: inProgress, icon: <FileClock />, color: '#007AB7' },
    { title: 'Submitted', value: totalSubmissions, icon: <CheckCircle />, color: '#FF6200' },
    { title: 'Pending Verifications', value: pendingVerifications, icon: <Clock />, color: '#F7B118' },
    { title: 'Deletion Requests', value: pendingDeletions, icon: <Trash2 />, color: '#DE002E', pulse: pendingDeletions > 0 },
    { title: 'Interviews Scheduled', value: interviewsScheduled, icon: <Calendar />, color: '#007AB7' },
    { title: 'Emails Sent Today', value: emailsSentToday, icon: <Mail />, color: '#007AB7' },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => {
        const isVerif = card.title === 'Pending Verifications' && verificationsHref;
        const isDel = card.title === 'Deletion Requests' && deletionsHref;
        const href = isVerif ? verificationsHref : isDel ? deletionsHref : '';
        const isLinked = Boolean(isVerif || isDel);
        const inner = (
          <>
            <div className="absolute top-5 right-5 relative">
              <span style={{ color: card.color, width: 22, height: 22, display: 'block' }}>
                {card.icon}
              </span>
              {card.pulse && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#DE002E] animate-pulse" />
              )}
            </div>
            <div className="text-[36px] font-bold text-[#333333] leading-none">{card.value}</div>
            <div className="text-[13px] text-[#8E8E8E] mt-1">{card.title}</div>
          </>
        );
        return (
          <div
            key={card.title}
            className="relative bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
            style={{ borderTop: `3px solid ${card.color}`, padding: '20px 24px' }}
          >
            {isLinked ? (
              <Link
                href={href}
                className="-m-5 block rounded-xl p-5 transition-colors hover:bg-[#FAFAFA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D148C]"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </div>
        );
      })}
    </div>
  );
}
