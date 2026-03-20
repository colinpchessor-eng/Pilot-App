'use client';

import { useUser, useDoc, useFirestore } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [appIdInput, setAppIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(false);

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

  const handleVerifyId = async () => {
    if (!user || !userDocRef) return;
    
    setIsVerifying(true);
    setVerifyError(false);

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (appIdInput.toUpperCase() === 'ABC123') {
      try {
        await updateDoc(userDocRef, {
          status: 'verified',
          verifiedAt: serverTimestamp()
        } as any);
        // sessionStorage flag for UI immediate response if needed
        sessionStorage.setItem('isBridged', 'true');
      } catch (e) {
        console.error("Failed to update status", e);
      }
    } else {
      setVerifyError(true);
    }
    setIsVerifying(false);
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
                    Application ID Verification
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter ID (e.g. ABC123)" 
                      className="bg-white border-[#E3E3E3] h-10"
                      value={appIdInput}
                      onChange={(e) => setAppIdInput(e.target.value)}
                    />
                    <Button 
                      onClick={handleVerifyId} 
                      disabled={isVerifying || !appIdInput}
                      className="bg-[#4D148C] hover:bg-[#7D22C3] text-white font-bold h-10 px-6 shrink-0"
                    >
                      {isVerifying ? "..." : "Verify"}
                    </Button>
                  </div>
                  {verifyError && <p className="text-xs text-[#DE002E] font-bold">Invalid Application ID. Please try again.</p>}
                  <p className="text-[11px] text-[#8E8E8E]">New pilots must verify their Application ID to continue.</p>
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
            <div className="p-6 rounded-xl border border-[#E3E3E3] border-top-3 border-t-[#007AB7] bg-white shadow-[0_4px_20px_rgba(0,122,183,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-t-[3px] border-t-[#007AB7] pt-4 -mt-6 rounded-t-xl">
                <div className="flex justify-between items-start mt-2">
                  <h3 className="text-xl font-bold text-[#333333]">Legacy Records</h3>
                  <Database className="h-6 w-6 text-[#007AB7]" />
                </div>
                <div className="mt-6 p-4 rounded-lg bg-[#F2F2F2] border border-[#E3E3E3] flex flex-col items-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <FileDown className="h-6 w-6 text-[#007AB7]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#333333]">application_archive_2023.pdf</p>
                    <p className="text-xs text-[#8E8E8E]">Last synced: {format(new Date(), 'MMM d, yyyy')}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-[#007AB7] text-[#007AB7] font-bold hover:bg-[#007AB7] hover:text-white transition-all">
                    View Stored Data
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8E8E8E]">Stored Flight Time:</span>
                    <span className="font-bold text-[#333333]">2,450 hrs</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8E8E8E]">Type Ratings:</span>
                    <span className="font-bold text-[#333333]">B737, MD11</span>
                  </div>
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
        © {new Date().getFullYear()} FedEx. All rights reserved.
      </footer>
    </div>
  );
}
