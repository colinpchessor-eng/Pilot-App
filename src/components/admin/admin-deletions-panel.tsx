'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useUser } from '@/firebase';
import { useIdToken } from '@/firebase/auth/use-id-token';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminCompleteDeletion } from '@/app/admin/actions';

type DeletionRequest = {
  uid: string;
  name?: string;
  email?: string;
  candidateId?: string;
  requestedAt?: any;
  status: 'pending' | 'completed';
  completedAt?: any;
  completedBy?: string;
  notes?: string;
};

export function AdminDeletionsPanel({ embedded = false }: { embedded?: boolean }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { getIdToken } = useIdToken();
  const { toast } = useToast();

  const [confirmTarget, setConfirmTarget] = useState<DeletionRequest | null>(null);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [completing, setCompleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<DeletionRequest | null>(null);

  const deletionsQuery = useMemo(
    () => query(collection(firestore, 'deletionRequests'), orderBy('requestedAt', 'desc')),
    [firestore]
  );
  const { data, loading } = useCollection<DeletionRequest>(deletionsQuery);
  const rows = data ?? [];
  const allChecked = checks.every(Boolean);
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  const handleComplete = async () => {
    if (!confirmTarget || !user) return;
    setCompleting(true);
    try {
      const idToken = await getIdToken();
      const result = await adminCompleteDeletion({
        idToken,
        requestUid: confirmTarget.uid,
      });
      if (result.success) {
        toast({ title: 'Marked Complete', description: `Deletion for ${confirmTarget.email} recorded.` });
        setConfirmTarget(null);
        setChecks([false, false, false, false]);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
    setCompleting(false);
  };

  const CHECKLIST = ['users collection', 'candidateIds collection', 'legacyData collection', 'Firebase Auth account'];

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#333333]">Deletion Requests</h1>
          <p className="text-[14px] text-[#8E8E8E] mt-1">Pending candidate data deletion requests</p>
        </div>
      )}
      {embedded && (
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="text-[20px] font-bold text-[#333333] flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-[#4D148C] shrink-0" />
            Deletion Requests
          </h2>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-[#DE002E] text-white text-[12px] font-bold px-2.5 min-h-[22px]">
              {pendingCount} pending
            </span>
          )}
          <p className="w-full text-[14px] text-[#8E8E8E]">Review and mark data removal complete after backend cleanup.</p>
        </div>
      )}

      {rows.length === 0 && !loading ? (
        <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center py-16">
          <CheckCircle className="h-12 w-12 text-[#008A00] mb-4" />
          <h3 className="text-[15px] font-semibold text-[#333333]">No pending deletion requests</h3>
          <p className="text-[13px] text-[#8E8E8E] mt-1">All deletion requests have been processed.</p>
        </div>
      ) : loading ? (
        <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading...</div>
      ) : (
        <div>
          {!embedded && (
            <h2 className="text-[20px] font-bold text-[#333333] mb-4">
              Requests ({rows.length}){pendingCount > 0 && ` · ${pendingCount} pending`}
            </h2>
          )}
          <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F2F2F2] border-b-2 border-[#E3E3E3]">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Email</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em] hidden sm:table-cell">Candidate ID</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Requested At</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.uid} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3.5 text-[14px] font-medium text-[#333333]">{r.name || '—'}</td>
                    <td className="px-4 py-3.5 text-[14px] text-[#333333]">{r.email || '—'}</td>
                    <td className="px-4 py-3.5 text-[14px] font-mono text-[#333333] hidden sm:table-cell">{r.candidateId || '—'}</td>
                    <td className="px-4 py-3.5 text-[14px] text-[#333333]">{r.requestedAt?.toDate ? format(r.requestedAt.toDate(), 'PPp') : '—'}</td>
                    <td className="px-4 py-3.5">
                      <Badge className={r.status === 'pending' ? 'bg-[#F7B118] text-white' : 'bg-[#008A00] text-white'}>
                        {r.status === 'pending' ? 'Pending' : 'Completed'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <span className="admin-tooltip">
                        <span className="admin-tooltip-text">View deletion request details and add notes</span>
                        <button type="button" onClick={() => setDetailTarget(r)} className="fedex-btn-outline-neutral">
                          <Eye className="h-3 w-3 mr-1" /> Details
                        </button>
                      </span>
                      {r.status === 'pending' && (
                        <span className="admin-tooltip">
                          <span className="admin-tooltip-text">Confirm you have deleted all data for this candidate</span>
                          <button
                            type="button"
                            onClick={() => { setConfirmTarget(r); setChecks([false, false, false, false]); }}
                            className="fedex-btn-primary-sm"
                          >
                            Mark Complete
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#333333]">Confirm Data Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8E8E8E]">
            Confirm you have manually deleted all data for <strong className="text-[#333333]">{confirmTarget?.email}</strong> from:
          </p>
          <div className="space-y-3 mt-2">
            {CHECKLIST.map((item, idx) => (
              <label key={item} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks[idx]}
                  onChange={(e) => { const next = [...checks]; next[idx] = e.target.checked; setChecks(next); }}
                  style={{ width: 18, height: 18, accentColor: '#4D148C' }}
                />
                <span className="text-sm text-[#333333]">{item}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-[#DE002E] mt-2 font-medium">This action is irreversible.</p>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setConfirmTarget(null)} disabled={completing} className="border-[#E3E3E3] text-[#565656]">Cancel</Button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={!allChecked || completing}
              className="fedex-btn-primary-sm !px-4 !py-2 disabled:opacity-40"
            >
              {completing ? 'Completing...' : 'Confirm Deletion Complete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailTarget} onOpenChange={(o) => !o && setDetailTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#333333]">Deletion Request Details</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-3 text-sm text-[#333333]">
              <div><span className="text-[#8E8E8E]">Name:</span> <span className="font-medium">{detailTarget.name || '—'}</span></div>
              <div><span className="text-[#8E8E8E]">Email:</span> <span className="font-medium">{detailTarget.email || '—'}</span></div>
              <div><span className="text-[#8E8E8E]">Candidate ID:</span> <span className="font-mono font-medium">{detailTarget.candidateId || '—'}</span></div>
              <div><span className="text-[#8E8E8E]">Requested:</span> <span className="font-medium">{detailTarget.requestedAt?.toDate ? format(detailTarget.requestedAt.toDate(), 'PPPp') : '—'}</span></div>
              <div><span className="text-[#8E8E8E]">Status:</span> <span className="font-medium">{detailTarget.status}</span></div>
              {detailTarget.completedBy && <div><span className="text-[#8E8E8E]">Completed by:</span> <span className="font-medium">{detailTarget.completedBy}</span></div>}
              {detailTarget.notes && (
                <div>
                  <span className="text-[#8E8E8E] block mb-1">Notes:</span>
                  <p className="bg-[#FAFAFA] p-2 rounded text-xs">{detailTarget.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)} className="border-[#E3E3E3] text-[#565656]">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
