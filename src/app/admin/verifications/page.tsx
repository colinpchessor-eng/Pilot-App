'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  collection,
  doc,
  getDoc,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  triggerApplicantRejectionEmail,
  triggerApplicantTokenEmail,
} from '@/app/actions';

type PendingVerification = {
  uid: string;
  email: string;
  displayName: string | null;
  requestedAt: any;
  status: 'pending' | 'approved' | 'rejected';
};

type ApplicantRecord = {
  token: string;
  email: string;
  name: string;
  legacyApplicationId: string;
  assignedUid: string | null;
  status: 'unassigned' | 'token_sent' | 'claimed';
};

export default function AdminVerificationsPage() {
  const firestore = useFirestore();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PendingVerification | null>(null);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingQuery = useMemo(
    () =>
      query(
        collection(firestore, 'pendingVerifications'),
        where('status', '==', 'pending')
      ),
    [firestore]
  );

  const { data, loading, error: loadError } =
    useCollection<PendingVerification>(pendingQuery);

  const rows = data ?? [];

  const openApprove = (row: PendingVerification) => {
    setSelected(row);
    setToken('');
    setError(null);
    setOpen(true);
  };

  const handleApprove = async () => {
    if (!selected) return;
    const tokenId = token.trim().toUpperCase().slice(0, 10);
    if (!tokenId) {
      setError('Token is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Ensure applicant token exists and matches email
      const applicantRef = doc(firestore, 'applicants', tokenId);
      const applicantSnap = await getDoc(applicantRef);
      if (!applicantSnap.exists()) {
        setError('Applicant token not found in /applicants.');
        return;
      }
      const applicant = applicantSnap.data() as ApplicantRecord;
      if (applicant.email?.toLowerCase() !== selected.email.toLowerCase()) {
        setError('Token email does not match the pending verification email.');
        return;
      }

      // Update pending verification
      const pendingRef = doc(firestore, 'pendingVerifications', selected.uid);
      await updateDoc(pendingRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
      } as any);

      // Update applicant
      await updateDoc(applicantRef, {
        status: 'token_sent',
        assignedUid: selected.uid,
      } as any);

      // Update user status
      const userRef = doc(firestore, 'users', selected.uid);
      await updateDoc(userRef, {
        status: 'token_sent',
      } as any);

      await triggerApplicantTokenEmail({
        email: selected.email,
        displayName: selected.displayName,
        token: tokenId,
      });

      setOpen(false);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (row: PendingVerification) => {
    setSaving(true);
    setError(null);
    try {
      const pendingRef = doc(firestore, 'pendingVerifications', row.uid);
      await updateDoc(pendingRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      } as any);

      const userRef = doc(firestore, 'users', row.uid);
      await updateDoc(userRef, {
        status: 'pending',
      } as any);

      await triggerApplicantRejectionEmail({
        email: row.email,
        displayName: row.displayName,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Identity Verifications</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading...</div>}
          {loadError && (
            <div className="text-destructive">
              Error loading verifications: {loadError.message}
            </div>
          )}
          {error && <div className="text-destructive">{error}</div>}

          {!loading && rows.length === 0 ? (
            <div className="text-muted-foreground">No pending requests.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.uid}>
                    <TableCell className="font-medium">
                      {row.displayName ?? 'N/A'}
                    </TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      {row.requestedAt?.toDate
                        ? format(row.requestedAt.toDate(), 'PPp')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        onClick={() => openApprove(row)}
                        className="bg-[var(--color-accent-purple)] hover:bg-[color-mix(in_srgb,var(--color-accent-purple)_85%,white)] text-white"
                        disabled={saving}
                      >
                        Approve &amp; Send Token
                      </Button>
                      <Button
                        className="bg-[#c0392b] hover:bg-[#a93226] text-white"
                        onClick={() => handleReject(row)}
                        disabled={saving}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign token</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Approving: <span className="text-foreground">{selected?.email}</span>
            </div>
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ABC123"
              maxLength={10}
              className="uppercase tracking-widest"
            />
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              className="bg-[var(--color-accent-purple)] hover:bg-[color-mix(in_srgb,var(--color-accent-purple)_85%,white)] text-white"
              disabled={saving}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

