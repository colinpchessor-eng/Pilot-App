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
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';

export default function ApplicationPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const {
    data: applicantData,
    loading,
    error,
  } = useDoc<ApplicantData>(userDocRef);

  // Fetch and save legacy data when user is verified but legacyData is missing
  useEffect(() => {
    if (!user || !firestore || !applicantData) return;
    const status = applicantData.status || 'pending';
    const candidateId = applicantData.candidateId;
    const hasLegacy = applicantData.legacyData != null;
    if (status !== 'verified' || !candidateId || hasLegacy) return;

    (async () => {
      try {
        const legacyRef = doc(firestore, 'legacyData', candidateId);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, { legacyData: legacySnap.data() });
        }
      } catch (e) {
        console.error('Failed to fetch legacy data:', e);
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

  return (
    <div className="min-h-screen interior-bg pb-12">
      <InteriorNavbar />
      <div className="container mx-auto max-w-5xl py-8">
        <ApplicationForm applicantData={applicantData} />
      </div>
    </div>
  );
}
