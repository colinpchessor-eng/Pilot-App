'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { triggerAdminVerificationRequestEmail } from '@/app/actions';

export default function VerifyRequestPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRef = useMemo(
    () => (user ? doc(firestore, 'users', user.uid) : undefined),
    [firestore, user]
  );
  const { data: userDoc } = useDoc<ApplicantData>(userRef, { listen: false });

  const email = user?.email ?? '';

  const onSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      // Create /pendingVerifications/{uid}
      const pendingRef = doc(firestore, 'pendingVerifications', user.uid);
      await setDoc(
        pendingRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName ?? null,
          requestedAt: serverTimestamp(),
          status: 'pending',
        },
        { merge: true }
      );

      // Update /users/{uid} status
      if (userRef) {
        await updateDoc(userRef, {
          status: 'pending',
          requestedAt: serverTimestamp(),
        } as any);
      }

      await triggerAdminVerificationRequestEmail({
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? null,
      });

      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="container py-10 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold uppercase tracking-wider">
            Verify your identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!submitted ? (
            <>
              <p className="text-muted-foreground">
                To protect returning applicants, we verify your identity before
                unlocking your application. An admin will review your request and
                email you a unique access token.
              </p>

              <div className="rounded-md border bg-background/40 p-4">
                <div className="text-sm text-muted-foreground">Signed in as</div>
                <div className="mt-1 font-medium">{email || 'Unknown'}</div>
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              <Button
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shimmer-btn"
                disabled={submitting || !email}
                onClick={onSubmit}
              >
                Yes, I want to update my application
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Back to login
              </Button>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">
                Your request has been sent.
              </p>
              <p className="text-muted-foreground">
                You will receive an email with your access token shortly.
              </p>
              <Button
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shimmer-btn"
                onClick={() => router.push('/verify/token')}
              >
                Enter token
              </Button>
            </>
          )}
          {userDoc?.email && userDoc.email !== email && (
            <p className="text-xs text-muted-foreground">
              Note: your profile email differs from your auth email.
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

