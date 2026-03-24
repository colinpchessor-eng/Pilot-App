'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { addDoc, collection, doc, getDoc, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useUser } from '@/firebase';
import {
  PIPELINE_STAGES,
  canStartCandidateFlow,
  candidateMatchesPipelineStage,
  effectiveCandidateFlowStatus,
  flowStatusBadge,
} from '@/lib/candidate-pipeline';
import { useIdToken } from '@/firebase/auth/use-id-token';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, X, Eye, RotateCcw, UserSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { unparse } from 'papaparse';
import { adminResetCandidateId } from '@/app/admin/actions';

type CandidateRecord = {
  candidateId: string;
  name?: string;
  email?: string;
  legacyApplicationId?: string;
  status?: string;
  assignedUid?: string;
  claimedAt?: any;
  masterKey?: boolean;
  flowStatus?: string;
};

type LegacyRecord = {
  flightTime?: any;
  lastEmployer?: any;
  lastResidence?: any;
  aeronautical?: any;
};

const FILTERS = ['All', 'Not Contacted', 'Verified', 'Has Legacy Data', 'No Legacy Data'] as const;
const PAGE_SIZE = 25;

const FLOW_START_BTN: CSSProperties = {
  background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)',
  color: 'white',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
};

const VALID_STAGE_PARAMS = new Set([
  ...PIPELINE_STAGES.map((s) => s.id),
  'not_selected',
]);

function pipelineStageLabel(stageId: string): string {
  if (stageId === 'not_selected') return 'Not selected';
  return PIPELINE_STAGES.find((s) => s.id === stageId)?.label ?? stageId;
}

export default function AdminCandidatesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { getIdToken } = useIdToken();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const stageParamRaw = searchParams.get('stage');
  const stageParam =
    stageParamRaw && VALID_STAGE_PARAMS.has(stageParamRaw) ? stageParamRaw : null;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [page, setPage] = useState(0);
  const [flowStarting, setFlowStarting] = useState<Record<string, boolean>>({});
  const [legacyModal, setLegacyModal] = useState<{ open: boolean; data: LegacyRecord | null; id: string }>({ open: false, data: null, id: '' });
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<CandidateRecord | null>(null);
  const [resetting, setResetting] = useState(false);

  const candidatesQuery = useMemo(() => query(collection(firestore, 'candidateIds')), [firestore]);
  const { data: allCandidates, loading } = useCollection<CandidateRecord>(candidatesQuery);

  const legacyQuery = useMemo(() => query(collection(firestore, 'legacyData')), [firestore]);
  const { data: allLegacy } = useCollection<any>(legacyQuery);

  const legacyMap = useMemo(() => {
    const m = new Map<string, any>();
    allLegacy?.forEach((l: any) => { if (l.candidateId) m.set(l.candidateId, l); });
    return m;
  }, [allLegacy]);

  const filtered = useMemo(() => {
    let list = allCandidates ?? [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.candidateId || '').toLowerCase().includes(s) ||
          (c.name || '').toLowerCase().includes(s) ||
          (c.email || '').toLowerCase().includes(s)
      );
    }
    if (filter === 'Not Contacted') list = list.filter((c) => c.status === 'unassigned');
    else if (filter === 'Verified') list = list.filter((c) => c.status === 'claimed');
    else if (filter === 'Has Legacy Data') list = list.filter((c) => legacyMap.has(c.candidateId));
    else if (filter === 'No Legacy Data') list = list.filter((c) => !legacyMap.has(c.candidateId));
    if (stageParam === 'not_selected') {
      list = list.filter((c) => effectiveCandidateFlowStatus(c.flowStatus) === 'not_selected');
    } else if (stageParam) {
      list = list.filter((c) => candidateMatchesPipelineStage(c.flowStatus, stageParam));
    }
    return list;
  }, [allCandidates, search, filter, legacyMap, stageParam]);

  const handleStartCandidateFlow = async (c: CandidateRecord) => {
    if (!user?.uid) {
      toast({ variant: 'destructive', title: 'Not signed in', description: 'Sign in as admin to start the flow.' });
      return;
    }
    const id = c.candidateId;
    setFlowStarting((prev) => ({ ...prev, [id]: true }));
    try {
      await updateDoc(doc(firestore, 'candidateIds', id), {
        flowStatus: 'invited',
        invitedAt: serverTimestamp(),
        flowStatusUpdatedAt: serverTimestamp(),
      });
      await addDoc(collection(firestore, 'auditLog'), {
        action: 'flow_started',
        adminUid: user.uid,
        adminEmail: user.email ?? '',
        candidateId: id,
        candidateName: c.name || '',
        timestamp: serverTimestamp(),
      });
      toast({ title: 'Flow started', description: `${c.name || id} is now invited.` });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not start flow',
        description: e?.message ?? 'Unknown error',
      });
    } finally {
      setFlowStarting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleViewLegacy = async (id: string) => {
    setLoadingLegacy(true);
    try {
      const snap = await getDoc(doc(firestore, 'legacyData', id));
      setLegacyModal({ open: true, data: snap.exists() ? (snap.data() as LegacyRecord) : null, id });
    } catch {
      setLegacyModal({ open: true, data: null, id });
    }
    setLoadingLegacy(false);
  };

  const handleReset = async () => {
    if (!resetConfirm) return;
    setResetting(true);
    try {
      const idToken = await getIdToken();
      const result = await adminResetCandidateId({
        idToken,
        candidateId: resetConfirm.candidateId,
      });
      if (result.success) {
        toast({ title: 'Candidate ID Reset', description: result.message });
        setResetConfirm(null);
      } else {
        toast({ variant: 'destructive', title: 'Reset Failed', description: result.message });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Reset Failed', description: e.message });
    }
    setResetting(false);
  };

  const handleExport = () => {
    const rows = filtered.map((c) => {
      const legacy = legacyMap.get(c.candidateId);
      return {
        CandidateID: c.candidateId, Name: c.name || '', Email: c.email || '',
        LegacyAppID: c.legacyApplicationId || '', Status: c.status || '',
        FlightHours: legacy?.flightTime?.total ?? '', LastEmployer: legacy?.lastEmployer?.company ?? '',
        VerifiedAt: c.claimedAt?.toDate ? format(c.claimedAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
      };
    });
    const csv = unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'candidates-filtered.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ft = legacyModal.data?.flightTime;
  const emp = legacyModal.data?.lastEmployer;
  const res = legacyModal.data?.lastResidence;
  const aero = legacyModal.data?.aeronautical;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#333333]">Candidate Management</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">All candidates imported from Paradox</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search by name, email or Candidate ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pr-10 bg-white border-[#E3E3E3] text-[#333333] placeholder:text-[#8E8E8E]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-[#333333]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 items-center">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0); }}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors"
            style={filter === f ? { background: '#4D148C', color: 'white' } : { background: '#F2F2F2', color: '#565656' }}
          >
            {f}
          </button>
        ))}
        {stageParam && (
          <span className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-2 py-1.5 text-[13px] font-medium bg-[#EDE7F6] text-[#4D148C] border border-[#D1C4E9]">
            Pipeline: {pipelineStageLabel(stageParam)}
            <button
              type="button"
              onClick={() => { router.push('/admin/candidates'); setPage(0); }}
              className="rounded-full p-0.5 hover:bg-[#D1C4E9] text-[#4D148C]"
              aria-label="Clear pipeline filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>

      {/* Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold text-[#333333]">Candidates ({filtered.length})</h2>
          <span className="admin-tooltip">
            <span className="admin-tooltip-text">Download filtered candidate list as a spreadsheet</span>
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center bg-white border-[1.5px] border-[#E3E3E3] rounded-lg px-4 py-2 text-[13px] font-semibold text-[#565656] transition-all hover:border-[#4D148C] hover:text-[#4D148C] disabled:opacity-40"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </button>
          </span>
        </div>

        {loading ? (
          <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading...</div>
        ) : pageItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center py-16">
            <UserSearch className="h-12 w-12 text-[#E3E3E3] mb-4" />
            <h3 className="text-[15px] font-semibold text-[#333333]">No candidates found</h3>
            <p className="text-[13px] text-[#8E8E8E] mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F2F2F2] border-b-2 border-[#E3E3E3]">
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Candidate ID</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Name</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em] hidden sm:table-cell">Email</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em] hidden md:table-cell">Legacy ID</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Status</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em] hidden lg:table-cell">Flight Hrs</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em] hidden lg:table-cell">Last Employer</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em] hidden md:table-cell">Verified At</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((c) => {
                      const legacy = legacyMap.get(c.candidateId);
                      return (
                        <tr key={c.candidateId} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-4 py-3.5 text-[14px] font-mono font-medium text-[#333333]">{c.candidateId}</td>
                          <td className="px-4 py-3.5 text-[14px] text-[#333333]">{c.name || '—'}</td>
                          <td className="px-4 py-3.5 text-[14px] text-[#333333] hidden sm:table-cell">{c.email || '—'}</td>
                          <td className="px-4 py-3.5 text-[14px] text-[#333333] hidden md:table-cell">{c.legacyApplicationId || '—'}</td>
                          <td className="px-4 py-3.5">
                            <Badge className={c.status === 'claimed' ? 'bg-[#008A00] text-white' : 'bg-[#8E8E8E] text-white'}>
                              {c.status === 'claimed' ? 'Verified' : 'Not Contacted'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-[14px] text-[#333333] hidden lg:table-cell">{legacy?.flightTime?.total ?? '—'}</td>
                          <td className="px-4 py-3.5 text-[14px] text-[#333333] hidden lg:table-cell">{legacy?.lastEmployer?.company ?? '—'}</td>
                          <td className="px-4 py-3.5 text-[14px] text-[#333333] hidden md:table-cell">{c.claimedAt?.toDate ? format(c.claimedAt.toDate(), 'PPp') : '—'}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-2 items-end">
                              {(c.flowStatus === 'submitted' || c.flowStatus === 'under_review') &&
                                c.assignedUid && (
                                  <span className="admin-tooltip">
                                    <span className="admin-tooltip-text">View merged application data</span>
                                    <Link
                                      href={`/admin/review/${c.assignedUid}`}
                                      className="inline-flex items-center justify-center rounded-md px-3.5 py-[7px] text-[12px] font-semibold text-white transition-all hover:brightness-110"
                                      style={{ background: '#FF6200' }}
                                    >
                                      Review
                                    </Link>
                                  </span>
                                )}
                              {canStartCandidateFlow(c.flowStatus) ? (
                                <button
                                  type="button"
                                  disabled={!!flowStarting[c.candidateId]}
                                  onClick={() => handleStartCandidateFlow(c)}
                                  className="inline-flex items-center justify-center border-0 cursor-pointer transition-opacity disabled:opacity-50"
                                  style={FLOW_START_BTN}
                                >
                                  {flowStarting[c.candidateId] ? 'Starting…' : 'Start Flow'}
                                </button>
                              ) : (
                                <span
                                  className="inline-block whitespace-nowrap"
                                  style={{
                                    borderRadius: 99,
                                    padding: '4px 12px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: flowStatusBadge(c.flowStatus).bg,
                                    color: flowStatusBadge(c.flowStatus).color,
                                  }}
                                >
                                  {flowStatusBadge(c.flowStatus).label}
                                </span>
                              )}
                              <span className="admin-tooltip">
                                <span className="admin-tooltip-text">View flight hours and legacy records</span>
                                <button
                                  onClick={() => handleViewLegacy(c.candidateId)}
                                  disabled={loadingLegacy}
                                  className="inline-flex items-center rounded-md px-3.5 py-[7px] text-[12px] font-semibold text-white transition-all disabled:opacity-50"
                                  style={{ background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)' }}
                                >
                                  <Eye className="h-3 w-3 mr-1.5" /> View Legacy
                                </button>
                              </span>
                              <span className="admin-tooltip">
                                <span className="admin-tooltip-text">Allow candidate to re-verify with a new account</span>
                                <button
                                  onClick={() => setResetConfirm(c)}
                                  className="inline-flex items-center bg-white border-[1.5px] border-[#E3E3E3] rounded-md px-3.5 py-[7px] text-[12px] font-semibold text-[#8E8E8E] transition-all hover:border-[#DE002E] hover:text-[#DE002E]"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1.5" /> Reset ID
                                </button>
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-[13px] text-[#8E8E8E]">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} candidates
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="border-[#E3E3E3] text-[#565656]">Prev</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="border-[#E3E3E3] text-[#565656]">Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Legacy Modal */}
      {legacyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setLegacyModal({ open: false, data: null, id: '' })}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-[#E3E3E3] max-h-[80vh] overflow-y-auto w-[90%] max-w-[560px]"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: 32 }}
          >
            <h2 className="text-[18px] font-bold text-[#333333] mb-6">Legacy Data — {legacyModal.id}</h2>
            {!legacyModal.data ? (
              <p className="text-[13px] text-[#8E8E8E]">No legacy data found for this candidate.</p>
            ) : (
              <div>
                {ft && (
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.08em] mb-3 mt-0 pb-1.5 border-b border-[#F2F2F2]">FLIGHT TIME SUMMARY</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(ft).filter(([, v]) => typeof v === 'number').map(([k, v]) => (
                        <div key={k} className="bg-[#FAFAFA] rounded-lg px-3 py-2.5">
                          <div className="text-[12px] text-[#8E8E8E]">{k.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}</div>
                          <div className="text-[16px] font-bold text-[#333333]">{String(v)}</div>
                        </div>
                      ))}
                    </div>
                    {(ft.dateLastFlown || ft.lastAircraftFlown) && (
                      <div className="my-2 rounded-r-md" style={{ background: 'rgba(0,122,183,0.06)', borderLeft: '3px solid #007AB7', padding: '10px 14px' }}>
                        <div className="text-[11px] font-bold text-[#007AB7] uppercase">Date Last Flown</div>
                        <div className="text-[16px] font-bold text-[#333333]">{ft.dateLastFlown || '—'}</div>
                        {ft.lastAircraftFlown && <div className="text-[13px] text-[#565656]">{ft.lastAircraftFlown}</div>}
                      </div>
                    )}
                  </div>
                )}
                {emp && (emp.company || emp.title) && (
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.08em] mb-3 mt-5 pb-1.5 border-b border-[#F2F2F2]">LAST EMPLOYER</h4>
                    <p className="text-[14px] font-semibold text-[#333333]">{emp.company || '—'}</p>
                    <p className="text-[13px] text-[#565656]">{emp.title}</p>
                    <p className="text-[13px] text-[#565656]">{[emp.city, emp.state].filter(Boolean).join(', ')}</p>
                    <p className="text-[13px] text-[#565656]">{emp.from} → {emp.to}</p>
                  </div>
                )}
                {res && (res.street || res.city) && (
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.08em] mb-3 mt-5 pb-1.5 border-b border-[#F2F2F2]">LAST RESIDENCE</h4>
                    <p className="text-[14px] font-semibold text-[#333333]">{res.street || '—'}</p>
                    <p className="text-[13px] text-[#565656]">{[res.city, res.state, res.zip].filter(Boolean).join(' ')}</p>
                    <p className="text-[13px] text-[#565656]">{res.from} → {res.to}</p>
                  </div>
                )}
                {aero && (
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.08em] mb-3 mt-5 pb-1.5 border-b border-[#F2F2F2]">AERONAUTICAL</h4>
                    <p className="text-[13px] text-[#565656]">ATP: <span className="text-[14px] font-semibold text-[#333333]">{aero.atpNumber || '—'}</span></p>
                    <p className="text-[13px] text-[#565656]">Medical: <span className="text-[14px] font-semibold text-[#333333]">{aero.firstClassMedicalDate || '—'}</span></p>
                    <p className="text-[13px] text-[#565656]">Type Ratings: <span className="text-[14px] font-semibold text-[#333333]">{aero.typeRatings || '—'}</span></p>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setLegacyModal({ open: false, data: null, id: '' })}
              className="w-full mt-6 bg-white border-[1.5px] border-[#E3E3E3] rounded-lg py-2.5 text-[14px] font-semibold text-[#565656] transition-all hover:border-[#4D148C] hover:text-[#4D148C]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation */}
      <AlertDialog open={!!resetConfirm} onOpenChange={(o) => !o && setResetConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#333333]">Reset Candidate ID?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8E8E8E]">
              This will reset <strong className="text-[#333333]">{resetConfirm?.candidateId}</strong> to &quot;unassigned&quot; and remove the user link. The candidate will need to verify again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting} className="border-[#E3E3E3] text-[#565656]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={resetting} className="bg-[#DE002E] hover:bg-[#b8002a] text-white">
              {resetting ? 'Resetting...' : 'Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
