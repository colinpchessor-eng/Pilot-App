'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { triggerAdminVerificationRequestEmail } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';

export default function VerifyRequestPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Apply light theme class to body for this page
    document.body.classList.add('light-theme');
    return () => {
      document.body.classList.remove('light-theme');
    };
  }, []);

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
      /* 
      // TODO: Uncomment when Firestore rules are configured
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
      */

      // Simulate network delay for demo purposes
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Store the success message in sessionStorage for the dashboard to pick up
      sessionStorage.setItem('verificationRequested', 'true');
      
      // Navigate to dashboard after success
      router.push('/dashboard');
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
    <div className="min-h-screen interior-bg">
      <InteriorNavbar />
      <div className="flex items-center justify-center px-4 py-12 pt-16">
        <div className="w-full max-w-2xl">
        <Card className="bg-white border-[#E3E3E3] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold uppercase tracking-wider text-black">
              Verify your identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-[#565656]">
              To protect returning applicants, we verify your identity before
              unlocking your application. An admin will review your request and
              email you a unique access token.
            </p>

            <div className="rounded-md border border-[#E3E3E3] bg-[#FAFAFA] p-4">
              <div className="text-sm text-[#8E8E8E]">Signed in as</div>
              <div className="mt-1 font-medium text-black">{email || 'Unknown'}</div>
            </div>

            {error && <div className="text-sm text-[#DE002E] font-bold">{error}</div>}

            <Button
              className="w-full fedex-btn-primary h-12"
              disabled={submitting || !email}
              onClick={onSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Yes, I want to update my application'
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full fedex-btn-secondary h-12"
              onClick={() => router.push('/login')}
            >
              Back to login
            </Button>
            
            {userDoc?.email && userDoc.email !== email && (
              <p className="text-xs text-[#8E8E8E]">
                Note: your profile email differs from your auth email.
              </p>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
