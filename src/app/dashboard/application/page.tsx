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
import { doc } from 'firebase/firestore';

export default function ApplicationPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const {
    data: applicantData,
    loading,
    error,
  } = useDoc<ApplicantData>(userDocRef);

  if (loading) {
    return (
      <div className="container py-10 text-center">
        <p>Loading application data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Could not load your application data. Please try again later.</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!applicantData) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Could not find application data for your account. Please contact
              support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <ApplicationForm applicantData={applicantData} />
    </div>
  );
}
