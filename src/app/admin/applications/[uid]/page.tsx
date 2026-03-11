'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { ApplicantData } from '@/lib/types';
import { ApplicationViewer } from '@/components/admin/application-viewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center">Loading application...</div>;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load application data: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!applicantData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No application found with the specified ID.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft />
          Back to Applications
        </Button>
        <h1 className="text-2xl font-bold">Application Details</h1>
        <Button onClick={handlePrint}>
          <Printer />
          Print / Send to Paradox
        </Button>
      </div>
      <ApplicationViewer applicantData={applicantData} />
    </div>
  );
}
