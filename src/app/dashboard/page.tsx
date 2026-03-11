'use client';

import { useUser, useDoc, useFirestore } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import { doc } from 'firebase/firestore';
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
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const {
    data: applicantData,
    loading: appDataLoading,
    error,
  } = useDoc<ApplicantData>(userDocRef);

  const loading = userLoading || appDataLoading;

  if (loading) {
    return (
      <div className="container py-10 text-center">
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-bold text-destructive">Error</h2>
          <p>Could not load your application data. Please try again later.</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!applicantData) {
    return (
      <div className="container py-10">
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-bold">Welcome!</h2>
          <p>
            It looks like we couldn't find your application data. This can
            happen if your profile wasn't created correctly. Please sign out
            and sign up again. If the problem persists, contact support.
          </p>
        </div>
      </div>
    );
  }

  const isSubmitted = !!applicantData.submittedAt;

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
    switch (applicationStatus) {
      case 'Completed':
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
          badgeVariant: 'default' as const,
          description: `Submitted on ${
            applicantData.submittedAt
              ? format(applicantData.submittedAt.toDate(), 'PPP')
              : ''
          }`,
        };
      case 'In Progress':
        return {
          icon: <FileClock className="h-6 w-6 text-accent" />,
          badgeVariant: 'secondary' as const,
          description: 'You can continue where you left off.',
        };
      default:
        return {
          icon: <FileText className="h-6 w-6 text-muted-foreground" />,
          badgeVariant: 'secondary' as const,
          description: 'Your application is waiting for you.',
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
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome, {fullName || user?.email}!
        </h1>
        <p className="text-muted-foreground">
          Here is your application dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Application Status Tile */}
        <div className="md:col-span-2 lg:col-span-2 p-6 rounded-lg border bg-card flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold">Application Status</h3>
              {statusInfo.icon}
            </div>
            <Badge variant={statusInfo.badgeVariant} className="mt-2 text-base">
              {applicationStatus}
            </Badge>
            <p className="mt-2 text-muted-foreground">
              {statusInfo.description}
            </p>
          </div>
          {!isSubmitted && (
            <Button
              asChild
              size="lg"
              className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Link href="/dashboard/application">
                {buttonText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Profile Tile */}
        <div className="p-6 rounded-lg border bg-card">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold">Your Profile</h3>
            <UserIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium text-right">{fullName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-right truncate">
                {applicantData.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since</span>
              <span className="font-medium text-right">
                {applicantData.createdAt
                  ? format(applicantData.createdAt.toDate(), 'MMM d, yyyy')
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Thank you Tile */}
        {isSubmitted && (
          <div className="md:col-span-3 lg:col-span-1 p-6 rounded-lg border bg-gradient-to-br from-primary to-purple-800 text-primary-foreground flex flex-col items-center justify-center text-center">
            <h3 className="text-2xl font-bold">Thank You!</h3>
            <p className="mt-2 opacity-80">
              Your application has been successfully submitted. We will be in
              touch soon regarding next steps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
