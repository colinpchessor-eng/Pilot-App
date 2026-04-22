'use client';

import { useUser, useDoc, useFirestore } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import { doc } from 'firebase/firestore';
import {
  canBookIndoctrinationSession,
  canBookTestingSession,
  hasIndoctrinationBooking,
  hasTestingBooking,
} from '@/lib/scheduling-eligibility';
import {
  completeCandidateIdVerification,
  syncLegacyDataForUser,
} from '@/app/applicant/verification-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  CheckCircle2,
  FileClock,
  FileText,
  Lock,
  Clock,
  ShieldCheck,
  CalendarRange,
  GraduationCap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';
import { useRouter } from 'next/navigation';
import { LegacyRecordsContent } from '@/components/legacy-records-content';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [candidateIdInput, setCandidateIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const {
    data: applicantData,
    loading: appDataLoading,
    error,
  } = useDoc<ApplicantData>(userDocRef);

  const candidateIdKey = (applicantData?.candidateId || '').trim().toUpperCase();
  const candidateIdsRef =
    firestore && candidateIdKey
      ? doc(firestore, 'candidateIds', candidateIdKey)
      : undefined;
  const { data: candidatePipeline, loading: pipelineRowLoading } =
    useDoc<{
      flowStatus?: string | null;
      testingSessionId?: string | null;
      indoctrinationSessionId?: string | null;
      testingSessionDate?: { toDate?: () => Date } | null;
      indoctrinationSessionDate?: { toDate?: () => Date } | null;
    }>(candidateIdsRef);
  const pipelineBusy = candidateIdKey ? pipelineRowLoading : false;

  const staffShouldUseAdminPortal =
    !!applicantData &&
    (applicantData.role === 'admin' ||
      applicantData.role === 'dev' ||
      applicantData.skipCandidateVerification === true ||
      applicantData.isAdmin === true);

  useEffect(() => {
    if (staffShouldUseAdminPortal) {
      router.replace('/admin');
    }
  }, [staffShouldUseAdminPortal, router]);

  useEffect(() => {
    if (!user || !applicantData) return;
    const status = applicantData.status || 'pending';
    const candidateId = applicantData.candidateId;
    const hasLegacy = applicantData.legacyData != null;
    if (status !== 'verified' || !candidateId || hasLegacy) return;

    (async () => {
      try {
        const idToken = await user.getIdToken();
        await syncLegacyDataForUser({ idToken });
      } catch (e) {
        console.error('Failed to fetch legacy data:', e);
      }
    })();
  }, [user, applicantData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#legacy-records') return;
    const status = applicantData?.status || 'pending';
    if (status !== 'verified') return;
    const el = document.getElementById('legacy-records');
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
    return () => clearTimeout(t);
  }, [applicantData?.status, applicantData]);

  const handleVerifyCandidateId = async () => {
    if (!user || !candidateIdInput.trim()) return;

    setIsVerifying(true);
    setVerifyError('');

    try {
      const idToken = await user.getIdToken();
      const result = await completeCandidateIdVerification({
        idToken,
        candidateId: candidateIdInput.trim(),
      });
      if (!result.ok) {
        setVerifyError(result.error);
        return;
      }
      setCandidateIdInput('');
    } catch (error) {
      console.error('Candidate ID link error:', error);
      setVerifyError('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const loading = userLoading || appDataLoading || pipelineBusy;

  if (!userLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#4D148C] border-t-transparent" />
          <p className="font-medium text-[#565656]">Signing out…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4">
           <div className="h-12 w-12 border-4 border-[#4D148C] border-t-transparent rounded-full animate-spin" />
           <p className="text-[#565656] font-medium">Fetching your profile...</p>
        </div>
      </div>
    );
  }

  if (staffShouldUseAdminPortal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#4D148C] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#565656] font-medium">Opening admin portal…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <div className="bg-white p-6 rounded-lg border border-[#DE002E]">
          <h2 className="text-xl font-bold text-[#DE002E]">Error</h2>
          <p className="text-[#333333]">Could not load your application data. Please try again later.</p>
          <p className="text-sm text-[#565656]">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!applicantData) {
    return (
      <div className="container py-10">
        <div className="bg-white p-6 rounded-lg border border-[#E3E3E3]">
          <h2 className="text-xl font-bold text-[#333333]">Welcome!</h2>
          <p className="text-[#565656]">
            It looks like we couldn't find your application data. This can
            happen if your profile wasn't created correctly. Please sign out
            and sign up again. If the problem persists, contact support.
          </p>
        </div>
      </div>
    );
  }

  const isSubmitted = !!applicantData.submittedAt;
  const status = applicantData.status || 'pending';
  const isVerified = status === 'verified';

  const flowForScheduling =
    candidatePipeline?.flowStatus ?? applicantData.candidateFlowStatus ?? null;
  const showTestingScheduleLink =
    isVerified &&
    !!candidateIdKey &&
    canBookTestingSession(flowForScheduling) &&
    !hasTestingBooking(candidatePipeline);
  const showIndoctrinationScheduleLink =
    isVerified &&
    !!candidateIdKey &&
    canBookIndoctrinationSession(flowForScheduling) &&
    !hasIndoctrinationBooking(candidatePipeline);
  const testingBooked = isVerified && !!candidateIdKey && hasTestingBooking(candidatePipeline);
  const indoctrinationBooked =
    isVerified && !!candidateIdKey && hasIndoctrinationBooking(candidatePipeline);
  const schedulingParam = candidateIdKey
    ? `?candidateId=${encodeURIComponent(candidateIdKey)}`
    : '';
  const formatSessionTs = (ts: { toDate?: () => Date } | null | undefined) => {
    if (!ts || typeof ts.toDate !== 'function') return null;
    return format(ts.toDate(), 'PPP');
  };
  const showSchedulingSection =
    isVerified &&
    !!candidateIdKey &&
    (showTestingScheduleLink ||
      showIndoctrinationScheduleLink ||
      testingBooked ||
      indoctrinationBooked);

  // Application Progress Logic
  const hasStarted =
    !isSubmitted &&
    (applicantData.flightTime.total > 0 ||
      applicantData.typeRatings.length > 0 ||
      (applicantData.safetyQuestions &&
        Object.values(applicantData.safetyQuestions).some(
          (q) => q && q.answer !== null
        )));

  const applicationStatus = isSubmitted
    ? 'Completed'
    : hasStarted
    ? 'In Progress'
    : 'Not Started';

  const getStatusInfo = () => {
    if (!isVerified) {
      return {
        icon: <Clock className="h-6 w-6 text-[#F7B118]" />,
        badgeText: 'Candidate ID not linked',
        badgeStyle: 'bg-[#F7B118] text-white',
        description: 'Enter your Candidate ID below to finish registration and unlock your portal.'
      };
    }
    switch (applicationStatus) {
      case 'Completed':
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-[#008A00]" />,
          badgeText: 'Completed',
          badgeStyle: 'bg-[#008A00] text-white',
          description: `Submitted on ${applicantData.submittedAt ? format(applicantData.submittedAt.toDate(), 'PPP') : ''}`,
        };
      case 'In Progress':
        return {
          icon: <FileClock className="h-6 w-6 text-[#4D148C]" />,
          badgeText: 'In Progress',
          badgeStyle: 'bg-[#825BAF] text-white',
          description: 'Your application is unlocked and ready for updates.',
        };
      default:
        return {
          icon: <FileText className="h-6 w-6 text-[#8E8E8E]" />,
          badgeText: 'Not Started',
          badgeStyle: 'bg-[#FF6200] text-white',
          description: 'Your application is unlocked and ready for updates.',
        };
    }
  };

  const statusInfo = getStatusInfo();

  const fullName = [applicantData.firstName, applicantData.lastName]
    .filter(Boolean)
    .join(' ');

  let buttonText = 'Update Pilot History';
  if (applicationStatus === 'In Progress') {
    buttonText = 'Continue Pilot History Update';
  } else if (applicationStatus === 'Completed') {
    buttonText = 'View Submitted History';
  }

  return (
    <div className="min-h-screen interior-bg pb-12">
      <InteriorNavbar />
      
      <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-6 pt-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#333333]">
            Welcome, {fullName || user?.email}!
          </h1>
          <p className="text-[#565656]">
            Here is your dashboard.
          </p>
        </div>

        {/* Top row: equal application + records cards */}
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 md:gap-6">
          {/* Application (Start / Continue CTA) */}
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#E3E3E3] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div
              className="h-[3px] w-full shrink-0 bg-[#4D148C]"
              aria-hidden
            />
            <div className="flex min-h-0 flex-1 flex-col justify-between p-6">
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold text-[#333333]">Updated Records</h3>
                  {statusInfo.icon}
                </div>
                <Badge className={cn("mt-2 text-sm px-3 py-1 rounded-full font-bold", statusInfo.badgeStyle)}>
                  {statusInfo.badgeText}
                </Badge>
                <p className="mt-4 text-[#565656]">
                  {statusInfo.description}
                </p>

                {/* Link Candidate ID (registration) */}
                {!isVerified && (
                  <div className="mt-6 p-4 rounded-lg bg-[#FAFAFA] border border-[#E3E3E3] space-y-3">
                    <label className="text-xs font-bold text-[#565656] uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#4D148C]" />
                      Link your Candidate ID
                    </label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter Candidate ID (e.g. 12345678)" 
                        className="bg-white border-[#E3E3E3] h-10"
                        value={candidateIdInput}
                        onChange={(e) => setCandidateIdInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleVerifyCandidateId()
                        }}
                      />
                      <Button 
                        onClick={handleVerifyCandidateId} 
                        disabled={isVerifying || !candidateIdInput.trim()}
                        className="bg-[#4D148C] hover:bg-[#7D22C3] text-white font-bold h-10 px-6 shrink-0"
                      >
                        {isVerifying ? 'Linking…' : 'Link ID'}
                      </Button>
                    </div>
                    {verifyError && (
                      <p
                        className="text-xs font-bold mt-2"
                        style={{ color: '#DE002E' }}
                      >
                        {verifyError}
                      </p>
                    )}
                    <p className="text-[11px] text-[#8E8E8E]">
                      Use the Candidate ID from your invitation email to link this account.
                    </p>
                  </div>
                )}
              </div>

              <Button
                asChild={isVerified}
                size="lg"
                disabled={!isVerified}
                className={cn(
                  "w-full mt-8 h-12 font-bold",
                  !isVerified ? "bg-[#E3E3E3] text-[#8E8E8E] cursor-not-allowed" : (isSubmitted ? "bg-[#565656] hover:bg-[#333333] text-white" : "fedex-btn-primary")
                )}
              >
                {isVerified ? (
                  <Link href="/dashboard/application">
                    {isSubmitted ? 'View Submitted History' : (hasStarted ? 'Continue Pilot History Update' : 'Update Pilot History')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : (
                  <span>
                     {buttonText}
                     <Lock className="ml-2 h-4 w-4 inline" />
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Your Records (profile on file) */}
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-[#E3E3E3] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
            <div
              className="h-[3px] w-full shrink-0 bg-[#FF6200]"
              aria-hidden
            />
            <div className="flex min-h-0 flex-1 flex-col p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-[#333333]">Your Records</h3>
                <div className="h-10 w-10 rounded-full fedex-gradient flex items-center justify-center text-white font-bold text-sm">
                  {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : (user?.email?.[0].toUpperCase() || 'U')}
                </div>
              </div>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-[#8E8E8E] text-[13px] uppercase tracking-wider font-medium">Name</span>
                  <span className="font-semibold text-[#333333] text-base">{fullName || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#8E8E8E] text-[13px] uppercase tracking-wider font-medium">Email</span>
                  <span className="font-semibold text-[#333333] text-base truncate">
                    {applicantData.email}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#8E8E8E] text-[13px] uppercase tracking-wider font-medium">Member Since</span>
                  <span className="font-semibold text-[#333333] text-base">
                    {applicantData.createdAt
                      ? format(applicantData.createdAt.toDate(), 'MMM d, yyyy')
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isSubmitted && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-none bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] p-6 text-center text-white shadow-[0_4px_20px_rgba(77,20,140,0.2)]">
            <h3 className="text-2xl font-bold">Thank You!</h3>
            <p className="mt-2 font-medium opacity-90">
              Your pilot history update has been successfully submitted. We will be in touch soon
              regarding next steps.
            </p>
          </div>
        )}

        {showSchedulingSection && (
          <div
            className="mt-6 rounded-xl border border-[#E3E3E3] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center gap-2 mb-4">
              <CalendarRange className="h-6 w-6 text-[#4D148C]" />
              <h3 className="text-xl font-bold text-[#333333]">Next steps — scheduling</h3>
            </div>
            <p className="text-[14px] text-[#565656] mb-4">
              When HR marks you eligible, you can choose testing and class dates here. Links respect
              your current pipeline stage.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[#F2F2F2] p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#333333] font-semibold">
                  <CalendarRange className="h-4 w-4 text-[#4D148C]" />
                  Testing (cognitive / remote)
                </div>
                {showTestingScheduleLink ? (
                  <Button asChild className="w-full fedex-btn-primary">
                    <Link href={`/schedule/testing${schedulingParam}`}>
                      Choose a testing date
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : testingBooked ? (
                  <p className="text-[13px] text-[#2E7D32] font-semibold">
                    Booked
                    {formatSessionTs(candidatePipeline?.testingSessionDate)
                      ? ` · ${formatSessionTs(candidatePipeline?.testingSessionDate)}`
                      : ''}
                  </p>
                ) : (
                  <p className="text-[13px] text-[#8E8E8E]">Not available for your stage yet.</p>
                )}
              </div>
              <div className="rounded-lg border border-[#F2F2F2] p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#333333] font-semibold">
                  <GraduationCap className="h-4 w-4 text-[#FF6200]" />
                  Indoctrination class
                </div>
                {showIndoctrinationScheduleLink ? (
                  <Button asChild className="w-full fedex-btn-primary">
                    <Link href={`/schedule/indoctrination${schedulingParam}`}>
                      Choose a class date
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : indoctrinationBooked ? (
                  <p className="text-[13px] text-[#2E7D32] font-semibold">
                    Booked
                    {formatSessionTs(candidatePipeline?.indoctrinationSessionDate)
                      ? ` · ${formatSessionTs(candidatePipeline?.indoctrinationSessionDate)}`
                      : ''}
                  </p>
                ) : (
                  <p className="text-[13px] text-[#8E8E8E]">
                    Opens after your interview is scheduled (or when HR invites you).
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Legacy records — same component + treatment as Flight Time tab on application */}
        {isVerified && (
          <div className="mt-8 scroll-mt-24" id="legacy-records">
            <LegacyRecordsContent
              legacyData={applicantData.legacyData}
              candidateId={applicantData.candidateId}
              firstName={applicantData.firstName}
              lastName={applicantData.lastName}
              showNoteBanner
              showPrintHeader
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            />
          </div>
        )}
      </div>
      
      <footer className="mt-auto py-8 text-center text-[#8E8E8E] text-sm interior-bg">
        © {new Date().getFullYear()} FedEx. All rights reserved.{' '}
        <span className="text-[#8E8E8E]">|</span>{' '}
        <Link href="/privacy" className="text-[#4D148C] text-[13px] hover:underline">Privacy Policy</Link>
      </footer>
    </div>
  );
}
