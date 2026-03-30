'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { useFirestore, useUser } from '@/firebase';
import { useIdToken } from '@/firebase/auth/use-id-token';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Eye, LockOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminCompleteUnlockRequest } from '@/app/admin/actions';

type UnlockRequestRow = {
  id: string;
  uid: string;
  name?: string;
  email?: string;
  candidateId?: string | null;
  reason?: string;
  requestedAt?: { toDate: () => Date };
  status: 'pending' | 'completed';
  completedAt?: { toDate: () => Date };
  completedBy?: string;
};

export function AdminUnlockRequestsPanel({ embedded = false }: { embedded?: boolean }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { getIdToken } = useIdToken();
  const { toast } = useToast();

  const [rows, setRows] = useState<UnlockRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [detail, setDetail] = useState<UnlockRequestRow | null>(null);

  const q = useMemo(
    () => query(collection(firestore, 'applicationUnlockRequests'), orderBy('requestedAt', 'desc')),
    [firestore]
  );

  useEffect(() => {
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setRows(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<UnlockRequestRow, 'id'>),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [q]);

  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  const handleComplete = async () => {
    if (!confirmId || !user) return;
    setCompleting(true);
    try {
      const idToken = await getIdToken();
      const result = await adminCompleteUnlockRequest({ idToken, requestDocId: confirmId });
      if (result.success) {
        toast({ title: 'Updated', description: 'Unlock request marked complete.' });
        setConfirmId(null);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : 'Request failed',
      });
    }
    setCompleting(false);
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#333333]">Unlock application requests</h1>
          <p className="text-[14px] text-[#8E8E8E] mt-1">
            Candidates who need their submitted application reopened for edits
          </p>
        </div>
      )}
      {embedded && (
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="text-[20px] font-bold text-[#333333] flex items-center gap-2">
            <LockOpen className="h-6 w-6 text-[#4D148C] shrink-0" />
            Unlock application requests
          </h2>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-[#F7B118] text-white text-[12px] font-bold px-2.5 min-h-[22px]">
              {pendingCount} pending
            </span>
          )}
          <p className="w-full text-[14px] text-[#8E8E8E]">
            After you unlock or change records in the system, mark the request complete here.
          </p>
        </div>
      )}

      {rows.length === 0 && !loading ? (
        <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center py-16">
          <CheckCircle className="h-12 w-12 text-[#008A00] mb-4" />
          <h3 className="text-[15px] font-semibold text-[#333333]">No unlock requests</h3>
          <p className="text-[13px] text-[#8E8E8E] mt-1">New submissions will appear in this table.</p>
        </div>
      ) : loading ? (
        <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading...</div>
      ) : (
        <div>
          {!embedded && (
            <h2 className="text-[20px] font-bold text-[#333333] mb-4">
              Requests ({rows.length}){pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
            </h2>
          )}
          <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-[#F2F2F2] border-b-2 border-[#E3E3E3]">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em] hidden sm:table-cell">
                    Candidate ID
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Requested
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3.5 text-[14px] font-medium text-[#333333]">{r.name || '—'}</td>
                    <td className="px-4 py-3.5 text-[14px] text-[#333333]">{r.email || '—'}</td>
                    <td className="px-4 py-3.5 text-[14px] font-mono text-[#333333] hidden sm:table-cell">
                      {r.candidateId || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-[14px] text-[#333333]">
                      {r.requestedAt?.toDate ? format(r.requestedAt.toDate(), 'PPp') : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={
                          r.status === 'pending' ? 'bg-[#F7B118] text-white' : 'bg-[#008A00] text-white'
                        }
                      >
                        {r.status === 'pending' ? 'Pending' : 'Completed'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <button type="button" onClick={() => setDetail(r)} className="fedex-btn-outline-neutral">
                        <Eye className="h-3 w-3 mr-1" /> Details
                      </button>
                      {r.status === 'pending' && (
                        <button type="button" onClick={() => setConfirmId(r.id)} className="fedex-btn-primary-sm">
                          Mark complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog
        open={!!confirmId}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#333333]">Mark unlock request complete?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8E8E8E]">
            Confirm you have addressed this candidate&apos;s application unlock (or decided not to unlock) so
            the queue stays accurate.
          </p>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmId(null)}
              disabled={completing}
              className="border-[#E3E3E3] text-[#565656]"
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className="fedex-btn-primary-sm !px-4 !py-2 disabled:opacity-40"
            >
              {completing ? 'Saving...' : 'Mark complete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#333333]">Unlock request details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm text-[#333333]">
              <div>
                <span className="text-[#8E8E8E]">Name:</span>{' '}
                <span className="font-medium">{detail.name || '—'}</span>
              </div>
              <div>
                <span className="text-[#8E8E8E]">Email:</span>{' '}
                <span className="font-medium">{detail.email || '—'}</span>
              </div>
              <div>
                <span className="text-[#8E8E8E]">Candidate ID:</span>{' '}
                <span className="font-mono font-medium">{detail.candidateId || '—'}</span>
              </div>
              <div>
                <span className="text-[#8E8E8E]">Requested:</span>{' '}
                <span className="font-medium">
                  {detail.requestedAt?.toDate ? format(detail.requestedAt.toDate(), 'PPPp') : '—'}
                </span>
              </div>
              <div>
                <span className="text-[#8E8E8E]">Status:</span>{' '}
                <span className="font-medium">{detail.status}</span>
              </div>
              {detail.reason && (
                <div>
                  <span className="text-[#8E8E8E] block mb-1">Reason:</span>
                  <p className="bg-[#FAFAFA] p-2 rounded text-xs whitespace-pre-wrap">{detail.reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)} className="border-[#E3E3E3] text-[#565656]">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
