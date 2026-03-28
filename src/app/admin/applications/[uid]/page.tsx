'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { ApplicantData } from '@/lib/types';
import { ApplicationViewer } from '@/components/admin/application-viewer';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ApplicationViewPage() {
  const router = useRouter();
  const params = useParams();
  const firestore = useFirestore();
  const userId = params.uid as string;

  const userDocRef = useMemo(
    () => (userId ? doc(firestore, 'users', userId) : undefined),
    [firestore, userId]
  );

  const {
    data: applicantData,
    loading,
    error,
  } = useDoc<ApplicantData>(userDocRef);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#8E8E8E] text-sm">Loading profile…</div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto border-[#E3E3E3]">
        <CardHeader>
          <CardTitle className="text-[#333333]">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#565656]">Failed to load application data: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!applicantData) {
    return (
      <Card className="max-w-4xl mx-auto border-[#E3E3E3]">
        <CardHeader>
          <CardTitle className="text-[#333333]">Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#565656]">No application found with the specified ID.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="admin-review-page space-y-8 pb-16 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <Link
            href="/admin/candidates"
            className="inline-flex items-center text-[14px] font-semibold text-[#4D148C] hover:underline"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Candidates
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold border border-[#E3E3E3] bg-white text-[#333333] hover:border-[#4D148C]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold border border-[#E3E3E3] bg-white text-[#333333] hover:border-[#4D148C]"
          >
            Print full report
          </button>
        </div>
      </div>

      <ApplicationViewer applicantData={applicantData} />
    </div>
  );
}
