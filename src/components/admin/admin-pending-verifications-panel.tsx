'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { collection, doc, getDoc, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore } from '@/firebase';
import { useIdToken } from '@/firebase/auth/use-id-token';
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
import { adminApproveVerification, adminRejectVerification } from '@/app/admin/actions';
import { ShieldCheck } from 'lucide-react';

type PendingVerification = {
  uid: string;
  email: string;
  displayName: string | null;
  requestedAt: { toDate?: () => Date };
  status: 'pending' | 'approved' | 'rejected';
};

export function AdminPendingVerificationsPanel() {
  const firestore = useFirestore();
  const { getIdToken } = useIdToken();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PendingVerification | null>(null);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legacyPreview, setLegacyPreview] = useState<Record<string, unknown> | null>(null);
  const [legacyExpanded, setLegacyExpanded] = useState(false);
  const [loadingLegacy, setLoadingLegacy] = useState(false);

  const pendingQuery = useMemo(
    () => query(collection(firestore, 'pendingVerifications'), where('status', '==', 'pending')),
    [firestore]
  );
  const { data, loading, error: loadError } = useCollection<PendingVerification>(pendingQuery);
  const rows = data ?? [];

  const openApprove = (row: PendingVerification) => {
    setSelected(row);
    setToken('');
    setError(null);
    setLegacyPreview(null);
    setLegacyExpanded(false);
    setOpen(true);
  };

  const loadLegacyPreview = async (candidateId: string) => {
    if (!candidateId) return;
    setLoadingLegacy(true);
    try {
      const snap = await getDoc(doc(firestore, 'legacyData', candidateId));
      setLegacyPreview(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
    } catch {
      setLegacyPreview(null);
    }
    setLoadingLegacy(false);
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
      const idToken = await getIdToken();
      const result = await adminApproveVerification({
        idToken,
        uid: selected.uid,
        email: selected.email,
        displayName: selected.displayName,
        tokenId,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

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
      const idToken = await getIdToken();
      const result = await adminRejectVerification({
        idToken,
        uid: row.uid,
        email: row.email,
        displayName: row.displayName,
      });

      if (!result.success) {
        setError(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject.');
    } finally {
      setSaving(false);
    }
  };

  const ft = legacyPreview?.flightTime as Record<string, unknown> | undefined;
  const le = legacyPreview?.lastEmployer as { company?: string; title?: string } | undefined;

  return (
    <div id="identity-verifications" className="space-y-4 scroll-mt-24">
      <div>
        <h2 className="text-[20px] font-bold text-[#333333]">Identity Verifications</h2>
        <p className="text-[14px] text-[#8E8E8E] mt-1">Review and approve pending identity requests</p>
      </div>

      {loading && <div className="text-[#8E8E8E] text-sm py-8 text-center">Loading...</div>}
      {loadError && (
        <div className="text-[#DE002E] text-sm py-8 text-center">Error: {loadError.message}</div>
      )}
      {error && !open && <div className="text-[#DE002E] text-sm font-medium">{error}</div>}

      {!loading && rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center py-16">
          <ShieldCheck className="h-12 w-12 text-[#E3E3E3] mb-4" />
          <h3 className="text-[15px] font-semibold text-[#333333]">No pending verifications</h3>
          <p className="text-[13px] text-[#8E8E8E] mt-1">All identity requests have been processed.</p>
        </div>
      ) : (
        !loading && (
          <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F2F2F2] border-b-2 border-[#E3E3E3]">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Requested At
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.uid}
                    className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 py-3.5 text-[14px] text-[#333333] font-medium">
                      {row.displayName ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-[14px] text-[#333333]">{row.email}</td>
                    <td className="px-4 py-3.5 text-[14px] text-[#333333]">
                      {row.requestedAt?.toDate ? format(row.requestedAt.toDate(), 'PPp') : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <span className="admin-tooltip">
                        <span className="admin-tooltip-text">
                          Send this candidate their Candidate ID and unlock their application
                        </span>
                        <button
                          type="button"
                          onClick={() => openApprove(row)}
                          disabled={saving}
                          className="inline-flex items-center rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                          style={{
                            background:
                              'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)',
                          }}
                        >
                          Approve &amp; Send Token
                        </button>
                      </span>
                      <span className="admin-tooltip">
                        <span className="admin-tooltip-text">Deny this verification request</span>
                        <button
                          type="button"
                          className="inline-flex items-center bg-white border-[1.5px] border-[#E3E3E3] rounded-lg px-4 py-2 text-[13px] font-semibold text-[#8E8E8E] transition-all hover:border-[#DE002E] hover:text-[#DE002E] disabled:opacity-50"
                          onClick={() => handleReject(row)}
                          disabled={saving}
                        >
                          Reject
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#333333]">Assign token</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-[#8E8E8E]">
              Approving: <span className="text-[#333333] font-medium">{selected?.email}</span>
            </div>
            <Label htmlFor="token" className="text-[#333333]">
              Token
            </Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ABC123"
              maxLength={10}
              className="uppercase tracking-widest"
            />

            <div className="mt-3 border border-[#E3E3E3] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (!legacyExpanded && token.trim()) loadLegacyPreview(token.trim().toUpperCase());
                  setLegacyExpanded(!legacyExpanded);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#8E8E8E] hover:bg-[#FAFAFA] transition-colors"
              >
                <span>View Legacy Data</span>
                <span>{legacyExpanded ? '▲' : '▼'}</span>
              </button>
              {legacyExpanded && (
                <div className="px-3 pb-3 text-xs space-y-2 border-t border-[#E3E3E3]">
                  {loadingLegacy ? (
                    <p className="pt-2 text-[#8E8E8E]">Loading...</p>
                  ) : !legacyPreview ? (
                    <p className="pt-2 text-[#8E8E8E]">
                      {token.trim() ? 'No legacy data found.' : 'Enter a token above first.'}
                    </p>
                  ) : (
                    <div className="pt-2 space-y-2 text-[#333333]">
                      {ft && (
                        <div>
                          <span
                            className="font-bold text-[#8E8E8E] uppercase tracking-wider block mb-1"
                            style={{ fontSize: 10 }}
                          >
                            Flight Time
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                            <span className="text-[#8E8E8E]">Total:</span>
                            <span>{ft.total ?? '—'}</span>
                            <span className="text-[#8E8E8E]">Turbine PIC:</span>
                            <span>{ft.turbinePIC ?? '—'}</span>
                          </div>
                        </div>
                      )}
                      {le?.company && (
                        <div>
                          <span
                            className="font-bold text-[#8E8E8E] uppercase tracking-wider block mb-1"
                            style={{ fontSize: 10 }}
                          >
                            Last Employer
                          </span>
                          <span>{le.company}</span>
                          {le.title && (
                            <span className="text-[#8E8E8E]"> — {le.title}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-[#DE002E] font-medium">{error}</div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="border-[#E3E3E3] text-[#565656]">
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className="inline-flex items-center rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)',
              }}
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
