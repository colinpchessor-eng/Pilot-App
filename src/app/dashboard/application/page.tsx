'use client';
import { ApplicationForm } from '@/components/application-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useDoc, useFirestore } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import {
  markApplicationFlowOpened,
  syncLegacyDataForUser,
} from '@/app/applicant/verification-actions';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';

export default function ApplicationPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const flowOpenedRef = useRef(false);

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const {
    data: applicantData,
    loading,
    error,
  } = useDoc<ApplicantData>(userDocRef);

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

  // First open: mark candidate pipeline as in_progress (once per mount when eligible)
  useEffect(() => {
    if (!user || !firestore || !applicantData || flowOpenedRef.current) return;
    const candidateId = applicantData.candidateId;
    const status = applicantData.status;
    if (!candidateId || status !== 'verified') return;

    flowOpenedRef.current = true;
    (async () => {
      try {
        const ref = doc(firestore, 'candidateIds', candidateId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          flowOpenedRef.current = false;
          return;
        }
        const d = snap.data();
        if (d.applicationStartedAt) return;

        const idToken = await user.getIdToken();
        const result = await markApplicationFlowOpened({ idToken });
        if (!result.ok) {
          console.error('Flow status (application opened):', result.error);
          flowOpenedRef.current = false;
        }
      } catch (e) {
        console.error('Flow status (application opened):', e);
        flowOpenedRef.current = false;
      }
    })();
  }, [user, firestore, applicantData]);

  if (loading) {
    return (
      <div className="container py-10 text-center">
        <p className="text-[#333333]">Loading application data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <Card className="border-[#DE002E] bg-white">
          <CardHeader>
            <CardTitle className="text-[#DE002E]">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#333333]">Could not load your application data. Please try again later.</p>
            <p className="text-sm text-[#565656]">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!applicantData) {
    return (
      <div className="container py-10">
        <Card className="border-[#E3E3E3] bg-white">
          <CardHeader>
            <CardTitle className="text-[#333333]">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#565656]">
              Could not find application data for your account. Please contact
              support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((applicantData.status || 'pending') !== 'verified') {
    return (
      <div className="min-h-screen interior-bg pb-12">
        <InteriorNavbar />
        <div className="container mx-auto max-w-5xl py-8">
          <Card className="border-[#E3E3E3] bg-white">
            <CardHeader>
              <CardTitle className="text-[#333333]">Verification required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[#565656]">
                Complete candidate verification on your dashboard before opening the
                application.
              </p>
              <Button asChild className="fedex-btn-primary">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F5F5F7] pb-12">
      <div
        className="pointer-events-none fixed top-[-10%] left-[-5%] z-0 h-[40%] w-[40%] rounded-full bg-[#4D148C]/5 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed bottom-[-10%] right-[-5%] z-0 h-[30%] w-[30%] rounded-full bg-[#FF6200]/5 blur-[100px]"
        aria-hidden
      />
      <InteriorNavbar />
      <div className="relative z-[1] container mx-auto max-w-5xl px-4 py-8">
        <ApplicationForm applicantData={applicantData} />
      </div>
    </div>
  );
}
