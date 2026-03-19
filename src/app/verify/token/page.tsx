'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type ApplicantRecord = {
  token: string;
  email: string;
  name: string;
  legacyApplicationId: string;
  assignedUid: string | null;
  status: 'unassigned' | 'token_sent' | 'claimed';
};

export default function VerifyTokenPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedToken = useMemo(
    () => token.trim().toUpperCase().slice(0, 10),
    [token]
  );

  const onConfirm = async () => {
    if (!user?.email) return;
    setLoading(true);
    setError(null);
    try {
      const tokenId = normalizedToken;
      if (!tokenId) {
        setError('Please enter your token.');
        return;
      }

      const applicantRef = doc(firestore, 'applicants', tokenId);
      const snap = await getDoc(applicantRef);
      if (!snap.exists()) {
        setError('Token not found or does not match your account');
        return;
      }

      const applicant = snap.data() as ApplicantRecord;
      const emailMatches =
        applicant.email?.toLowerCase() === user.email.toLowerCase();
      if (!emailMatches) {
        setError('Token not found or does not match your account');
        return;
      }

      // Claim token
      await updateDoc(applicantRef, {
        assignedUid: user.uid,
        status: 'claimed',
      } as any);

      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        status: 'verified',
        verifiedAt: serverTimestamp(),
      } as any);

      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to verify token.');
    } finally {
      setLoading(false);
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
            Enter your access token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Check your email for your unique token and enter it below to unlock
            your application.
          </p>

          <div className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              value={normalizedToken}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ABC123"
              autoComplete="one-time-code"
              inputMode="text"
              maxLength={10}
              className="uppercase tracking-widest"
            />
            <div className="text-xs text-muted-foreground">
              Signed in as: {user?.email}
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <Button
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shimmer-btn"
            disabled={loading || !normalizedToken}
            onClick={onConfirm}
          >
            Confirm
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/verify/request')}
          >
            Request a new token
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

