'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useDoc, useFirestore } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
            <CardTitle>Welcome!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              It looks like we couldn't find your application data. This can
              happen if your profile wasn't created correctly. Please sign out
              and sign up again. If the problem persists, contact support.
            </p>
          </CardContent>
        </Card>
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

  const fullName = [applicantData.firstName, applicantData.lastName]
    .filter(Boolean)
    .join(' ');

  let buttonText = 'Start Application';
  if (applicationStatus === 'In Progress') {
    buttonText = 'Continue Your Application';
  }

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <Card className="shadow-xl transition-shadow duration-300 hover:shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Welcome, {fullName || user?.email}!
          </CardTitle>
          <CardDescription>
            Here's a summary of your pilot application profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSubmitted && (
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center">
              <h3 className="text-2xl font-bold text-primary">Thank You!</h3>
              <p className="mt-2 text-primary/80">
                Your application has been successfully submitted. We will be in
                touch soon.
              </p>
            </div>
          )}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{fullName || 'N/A'}</p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{applicantData.email}</p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {applicantData.createdAt
                  ? format(applicantData.createdAt.toDate(), 'MMMM d, yyyy')
                  : 'N/A'}
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Application Status
              </p>
              <Badge
                variant={
                  applicationStatus === 'Completed' ? 'default' : 'secondary'
                }
              >
                {applicationStatus}
              </Badge>
            </div>
            {applicantData.submittedAt && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Submitted On
                  </p>
                  <p className="font-medium">
                    {format(
                      applicantData.submittedAt.toDate(),
                      'MMMM d, yyyy'
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
          {!isSubmitted && (
            <Button asChild size="lg" className="w-full">
              <Link href="/dashboard/application">{buttonText}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
