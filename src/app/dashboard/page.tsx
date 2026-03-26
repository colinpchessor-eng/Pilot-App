'use client';

import { useUser, useDoc, useFirestore } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import { doc } from 'firebase/firestore';
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
  User as UserIcon,
  X,
  Info,
  Database,
  FileDown,
  Lock,
  Clock,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';
import { useRouter } from 'next/navigation';
import { Printer } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [candidateIdInput, setCandidateIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const {
    data: applicantData,
    loading: appDataLoading,
    error,
  } = useDoc<ApplicantData>(userDocRef);

  useEffect(() => {
    const success = sessionStorage.getItem('verificationRequested');
    if (success === 'true') {
      setShowSuccessBanner(true);
      sessionStorage.removeItem('verificationRequested');
    }
  }, []);

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
      console.error('Verification error:', error);
      setVerifyError('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const loading = userLoading || appDataLoading;

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

  const legacyData = applicantData?.legacyData || null;
  const flightTime = legacyData?.flightTime || null;
  const lastEmployer = legacyData?.lastEmployer || null;
  const lastResidence = legacyData?.lastResidence || null;

  const isSubmitted = !!applicantData.submittedAt;
  const status = applicantData.status || 'pending';
  const isVerified = status === 'verified';

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
        badgeText: 'Unverified',
        badgeStyle: 'bg-[#F7B118] text-white',
        description: 'Verify your Application ID to unlock your portal.'
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

  let buttonText = 'Start Application';
  if (applicationStatus === 'In Progress') {
    buttonText = 'Continue Your Application';
  } else if (applicationStatus === 'Completed') {
    buttonText = 'View Submitted Application';
  }

  return (
    <div className="min-h-screen interior-bg pb-12">
      <InteriorNavbar />
      
      <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-6 pt-4">
        {showSuccessBanner && (
          <Alert className="relative border-[#E3E3E3] border-l-4 border-l-[#007AB7] bg-[#F2F2F2] text-[#333333] rounded-md">
            <Info className="h-4 w-4 text-[#007AB7]" />
            <AlertTitle className="font-bold text-[#007AB7]">Verification Request Sent</AlertTitle>
            <AlertDescription className="pr-8">
              Your request has been received. An admin will review your information.
            </AlertDescription>
            <button 
              onClick={() => setShowSuccessBanner(false)}
              className="absolute top-4 right-4 text-[#8E8E8E] hover:text-[#333333] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#333333]">
            Welcome, {fullName || user?.email}!
          </h1>
          <p className="text-[#565656]">
            Here is your application dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* Application Status Tile */}
          <div className="md:col-span-2 lg:col-span-2 p-6 rounded-xl border border-[#E3E3E3] border-top-3 border-t-[#4D148C] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col justify-between">
            <div className="border-t-[3px] border-t-[#4D148C] pt-4 -mt-6 rounded-t-xl">
              <div className="flex justify-between items-start mt-2">
                <h3 className="text-xl font-bold text-[#333333]">Application Status</h3>
                {statusInfo.icon}
              </div>
              <Badge className={cn("mt-2 text-sm px-3 py-1 rounded-full font-bold", statusInfo.badgeStyle)}>
                {statusInfo.badgeText}
              </Badge>
              <p className="mt-4 text-[#565656]">
                {statusInfo.description}
              </p>

              {/* Application ID Verification Section */}
              {!isVerified && (
                <div className="mt-6 p-4 rounded-lg bg-[#FAFAFA] border border-[#E3E3E3] space-y-3">
                  <label className="text-xs font-bold text-[#565656] uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#4D148C]" />
                    Candidate ID Verification
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
                      {isVerifying ? 'Verifying...' : 'Verify'}
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
                    New pilots must verify their Application ID to continue.
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
                  {isSubmitted ? 'View Submitted Application' : (hasStarted ? 'Continue Your Application' : 'Start Application')}
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

          {/* Legacy Records Card - ONLY SHOWS FOR VERIFIED USERS */}
          {isVerified && (
            <div className="legacy-print-area p-6 rounded-xl border border-[#E3E3E3] bg-white shadow-[0_4px_20px_rgba(0,122,183,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ borderTop: '3px solid #007AB7' }}>
              <div className="hidden print:block mb-6">
                <h1 className="text-xl font-bold text-[#333333] mb-2">FedEx Pilot Application — Legacy Records</h1>
                {applicantData.candidateId && <p className="text-sm text-[#565656]">Candidate ID: {applicantData.candidateId}</p>}
                <p className="text-sm text-[#565656]">Name: {[applicantData.firstName, applicantData.lastName].filter(Boolean).join(' ')}</p>
                <p className="text-sm text-[#565656]">Printed: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="pt-4 -mt-6 rounded-t-xl">
                <div className="flex justify-between items-start mt-2">
                  <h3 className="text-xl font-bold text-[#333333]">Your Legacy Records</h3>
                  <Database className="h-6 w-6 shrink-0" style={{ color: '#007AB7' }} />
                </div>
                <p className="text-xs text-[#8E8E8E] mt-1">
                  Data imported from your previous application on file
                </p>
                <div className="mt-4">
                  {!legacyData ? (
                    <p className="text-[13px]" style={{ color: '#8E8E8E' }}>No legacy records found.</p>
                  ) : (
                    <>
                      <div className="mb-5">
                        <h4 className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-3">FLIGHT TIME SUMMARY</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-[#565656]">Total Hours:</span><span className="font-semibold text-[#333333]">{flightTime?.total ?? '—'}</span></div>
                          <div className="flex justify-between"><span className="text-[#565656]">Turbine PIC:</span><span className="font-semibold text-[#333333]">{flightTime?.turbinePIC ?? '—'}</span></div>
                          <div className="flex justify-between"><span className="text-[#565656]">Military:</span><span className="font-semibold text-[#333333]">{flightTime?.military ?? '—'}</span></div>
                          <div className="flex justify-between"><span className="text-[#565656]">Multi-Engine:</span><span className="font-semibold text-[#333333]">{flightTime?.multiEngine ?? '—'}</span></div>
                          <div className="flex justify-between"><span className="text-[#565656]">Instructor:</span><span className="font-semibold text-[#333333]">{flightTime?.instructor ?? '—'}</span></div>
                          <div className="flex justify-between"><span className="text-[#565656]">SIC Hours:</span><span className="font-semibold text-[#333333]">{flightTime?.sic ?? '—'}</span></div>
                        </div>
                      </div>
                      <div className="mb-5 p-3 rounded" style={{ background: 'rgba(0,122,183,0.06)', borderLeft: '3px solid #007AB7' }}>
                        <div className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-1">Date Last Flown</div>
                        <div className="text-[#333333] font-semibold">{flightTime?.dateLastFlown ?? '—'}</div>
                        {(flightTime?.lastAircraftFlown) && <div className="text-xs text-[#8E8E8E] mt-1">{flightTime.lastAircraftFlown}</div>}
                      </div>
                      <div className="mb-5">
                        <h4 className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-2">LAST EMPLOYER ON FILE</h4>
                        <div className="space-y-1">
                          <div className="font-bold text-[#333333]" style={{ fontSize: 15 }}>{lastEmployer?.company ?? '—'}</div>
                          <div className="text-[#565656]" style={{ fontSize: 13 }}>{lastEmployer?.title ?? '—'}</div>
                          <div className="text-[#8E8E8E]" style={{ fontSize: 12 }}>{[lastEmployer?.city, lastEmployer?.state].filter(Boolean).join(', ') || '—'}</div>
                          <div className="text-[#8E8E8E]" style={{ fontSize: 12 }}>{(lastEmployer?.from ?? '—')} → {(lastEmployer?.to ?? '—')}</div>
                        </div>
                      </div>
                      <div className="mb-5">
                        <h4 className="text-xs font-bold text-[#8E8E8E] uppercase tracking-wider mb-2">LAST RESIDENCE ON FILE</h4>
                        <div className="space-y-1">
                          <div className="font-bold text-[#333333]">{lastResidence?.street ?? '—'}</div>
                          <div className="text-[#565656]">{[lastResidence?.city, lastResidence?.state, lastResidence?.zip].filter(Boolean).join(' ') || '—'}</div>
                          <div className="text-[#8E8E8E]" style={{ fontSize: 12 }}>{(lastResidence?.from ?? '—')} → {(lastResidence?.to ?? '—')}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="print-hide w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors hover:!bg-[#007AB7] hover:!text-white"
                        style={{ background: 'white', border: '1.5px solid #007AB7', color: '#007AB7' }}
                      >
                        <Printer className="h-4 w-4" /> Print Legacy Records
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile Tile */}
          <div className="p-6 rounded-xl border border-[#E3E3E3] border-top-3 border-t-[#FF6200] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
             <div className="border-t-[3px] border-t-[#FF6200] pt-4 -mt-6 rounded-t-xl">
              <div className="flex justify-between items-start mt-2">
                <h3 className="text-xl font-bold text-[#333333]">Your Profile</h3>
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

          {/* Thank you Tile */}
          {isSubmitted && (
            <div className="md:col-span-3 lg:col-span-1 p-6 rounded-xl border border-none fedex-gradient text-white flex flex-col items-center justify-center text-center shadow-[0_4px_20px_rgba(77,20,140,0.2)]">
              <h3 className="text-2xl font-bold">Thank You!</h3>
              <p className="mt-2 opacity-90 font-medium">
                Your application has been successfully submitted. We will be in
                touch soon regarding next steps.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-auto py-8 text-center text-[#8E8E8E] text-sm interior-bg">
        © {new Date().getFullYear()} FedEx. All rights reserved.{' '}
        <span className="text-[#8E8E8E]">|</span>{' '}
        <Link href="/privacy" className="text-[#4D148C] text-[13px] hover:underline">Privacy Policy</Link>
      </footer>
    </div>
  );
}
