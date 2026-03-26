'use client';

import { AdminStats } from '@/components/admin/admin-stats';
import { CandidatePipeline } from '@/components/admin/candidate-pipeline';
import { ActivityFeed } from '@/components/admin/activity-feed';
import { AdminCharts } from '@/components/admin/admin-charts';
import { ApplicationsTable } from '@/components/admin/applications-table';
import { useFirestore, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { ApplicantData, InterviewBookingDoc } from '@/lib/types';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { startOfDay } from 'date-fns';
import { Download, Trash2, FileText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { unparse } from 'papaparse';

export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);
  const { data: allUsers, loading: usersLoading, error: usersError } = useCollection<ApplicantData>(usersQuery);

  const candidatesQuery = useMemo(() => query(collection(firestore, 'candidateIds')), [firestore]);
  const { data: allCandidates } = useCollection<any>(candidatesQuery);

  const pendingVerifQuery = useMemo(
    () => query(collection(firestore, 'pendingVerifications'), where('status', '==', 'pending')),
    [firestore]
  );
  const { data: pendingVerifs } = useCollection<any>(pendingVerifQuery);

  const pendingDeletionsQuery = useMemo(
    () => query(collection(firestore, 'deletionRequests'), where('status', '==', 'pending')),
    [firestore]
  );
  const { data: pendingDeletions } = useCollection<any>(pendingDeletionsQuery);

  const confirmedInterviewsQuery = useMemo(
    () => query(collection(firestore, 'interviewBookings'), where('status', '==', 'confirmed')),
    [firestore]
  );
  const { data: confirmedInterviewBookings } = useCollection<InterviewBookingDoc>(confirmedInterviewsQuery);

  const mailTodayQuery = useMemo(
    () =>
      query(
        collection(firestore, 'mail'),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay(new Date())))
      ),
    [firestore]
  );
  const { data: mailTodayRows } = useCollection<any>(mailTodayQuery);

  const submittedApplications = useMemo(() => allUsers?.filter((u) => u.submittedAt) ?? [], [allUsers]);
  const verifiedCandidates = useMemo(() => allCandidates?.filter((c: any) => c.status === 'claimed')?.length ?? 0, [allCandidates]);
  const inProgressCount = useMemo(
    () => allUsers?.filter((u) => !u.submittedAt && (u as any).legacyData && (u.flightTime?.total > 0))?.length ?? 0,
    [allUsers]
  );

  const interviewsScheduledCount = confirmedInterviewBookings?.length ?? 0;

  const upcomingInterviews = useMemo(() => {
    if (!confirmedInterviewBookings?.length) return [];
    const start = startOfDay(new Date());
    return [...confirmedInterviewBookings]
      .filter((b) => {
        const d = b.scheduledFor?.toDate?.();
        return d && d >= start;
      })
      .sort((a, b) => {
        const ta = a.scheduledFor?.toDate?.()?.getTime() ?? 0;
        const tb = b.scheduledFor?.toDate?.()?.getTime() ?? 0;
        return ta - tb;
      })
      .slice(0, 8)
      .map((b) => ({
        when: b.scheduledFor!.toDate!(),
        candidateName: b.candidateName || b.candidateEmail || 'Candidate',
      }));
  }, [confirmedInterviewBookings]);

  if (usersLoading) {
    return <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading data...</div>;
  }
  if (usersError) {
    return <div className="text-[#DE002E] text-sm py-12 text-center">Error loading users: {usersError.message}</div>;
  }

  const handleExportCandidates = () => {
    if (!allCandidates?.length) return;
    const rows = allCandidates.map((c: any) => ({
      CandidateID: c.candidateId || '',
      Name: c.name || '',
      Email: c.email || '',
      LegacyAppID: c.legacyApplicationId || '',
      Status: c.status || '',
      VerifiedAt: c.claimedAt?.toDate ? format(c.claimedAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
    }));
    const csv = unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'candidates-export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#333333]">Admin Dashboard</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">Overview of all candidate and application data</p>
      </div>

      {/* Admin banner */}
      <div
        className="flex items-center gap-4 rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(77,20,140,0.06) 0%, rgba(255,98,0,0.06) 100%)',
          border: '1px solid rgba(77,20,140,0.12)',
        }}
      >
        <ShieldCheck className="h-6 w-6 text-[#4D148C] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-[#333333]">Admin Portal — {user?.email}</div>
          <div className="text-[12px] text-[#8E8E8E]">You have elevated access. All actions are logged.</div>
        </div>
        <div className="text-[12px] text-[#8E8E8E] shrink-0 hidden sm:block">{format(new Date(), 'PPp')}</div>
      </div>

      <AdminStats
        totalCandidates={allCandidates?.length ?? 0}
        verifiedCandidates={verifiedCandidates}
        inProgress={inProgressCount}
        totalSubmissions={submittedApplications.length}
        pendingVerifications={pendingVerifs?.length ?? 0}
        pendingDeletions={pendingDeletions?.length ?? 0}
        interviewsScheduled={interviewsScheduledCount}
        emailsSentToday={mailTodayRows?.length ?? 0}
      />

      <CandidatePipeline candidates={allCandidates ?? []} upcomingInterviews={upcomingInterviews} />

      <AdminCharts allUsers={allUsers ?? []} submittedApplications={submittedApplications} />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportCandidates}
          className="inline-flex items-center bg-white border-[1.5px] border-[#E3E3E3] rounded-lg px-5 py-2.5 text-[14px] font-semibold text-[#333333] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all hover:border-[#4D148C] hover:text-[#4D148C] hover:shadow-[0_2px_8px_rgba(77,20,140,0.12)]"
        >
          <Download className="mr-2 h-4 w-4" />
          Export All Candidates CSV
        </button>
        <Link
          href="/admin/deletions"
          className="inline-flex items-center bg-white border-[1.5px] border-[#E3E3E3] rounded-lg px-5 py-2.5 text-[14px] font-semibold text-[#333333] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all hover:border-[#4D148C] hover:text-[#4D148C] hover:shadow-[0_2px_8px_rgba(77,20,140,0.12)]"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          View Deletion Requests
          {(pendingDeletions?.length ?? 0) > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[#DE002E] text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]">{pendingDeletions!.length}</span>
          )}
        </Link>
        <Link
          href="/admin/audit"
          className="inline-flex items-center bg-white border-[1.5px] border-[#E3E3E3] rounded-lg px-5 py-2.5 text-[14px] font-semibold text-[#333333] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all hover:border-[#4D148C] hover:text-[#4D148C] hover:shadow-[0_2px_8px_rgba(77,20,140,0.12)]"
        >
          <FileText className="mr-2 h-4 w-4" />
          Audit Log
        </Link>
      </div>

      {/* Submitted Applications + live activity */}
      <div>
        <h2 className="text-[20px] font-bold text-[#333333] mb-4">Submitted Applications</h2>
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="w-full lg:w-[60%] lg:min-w-0">
            <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden h-full">
              <div className="p-5">
                <ApplicationsTable applications={submittedApplications} />
              </div>
            </div>
          </div>
          <div className="w-full lg:w-[40%] lg:min-w-0 lg:max-w-none shrink-0">
            <ActivityFeed />
          </div>
        </div>
      </div>

      {/* Last updated */}
      <div className="text-right">
        <span className="text-[12px] text-[#8E8E8E]">Last updated: {format(lastUpdated, 'h:mm:ss a')}</span>
      </div>
    </div>
  );
}
