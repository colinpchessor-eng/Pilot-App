'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
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
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CandidateRowsTableShell,
  candidateRowsTableBodyClass,
  candidateRowsTableHeadRowClass,
  candidateRowsTableTdClass,
  candidateRowsTableThClass,
  candidateRowsTableTrClass,
  candidateRowsCardFooterClass,
} from '@/components/admin/candidate-rows-table-shell';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MailPlus,
  RotateCcw,
  User,
  UserSearch,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { unparse } from 'papaparse';
import { adminResetCandidateId } from '@/app/admin/actions';
import { sendEmail, buildFlowStartedEmail } from '@/lib/email';

type CandidateRecord = {
  candidateId: string;
  name?: string;
  email?: string;
  /** Admin override for outreach / Start Flow when import email is stale */
  contactEmail?: string;
  legacyApplicationId?: string;
  status?: string;
  assignedUid?: string;
  claimedAt?: { toDate?: () => Date };
  invitedAt?: { toDate?: () => Date };
  submittedAt?: { toDate?: () => Date };
  flowStatusUpdatedAt?: { toDate?: () => Date };
  masterKey?: boolean;
  flowStatus?: string;
};

type LegacyRecord = {
  flightTime?: Record<string, unknown> & { total?: unknown; lastAircraftFlown?: string };
  lastEmployer?: {
    company?: string;
    title?: string;
    city?: string;
    state?: string;
    from?: string;
    to?: string;
  };
  lastResidence?: unknown;
  aeronautical?: {
    typeRatings?: string;
    atpNumber?: string;
    firstClassMedicalDate?: string;
  };
};

const FILTERS = ['All', 'Not Contacted', 'ID linked', 'Has Legacy Data', 'No Legacy Data'] as const;
const PAGE_SIZE = 25;

const LIST_TABS = [
  { id: 'all' as const, label: 'All Candidates' },
  { id: 'new' as const, label: 'New' },
  { id: 'interviewing' as const, label: 'Interviewing' },
  { id: 'hired' as const, label: 'Hired' },
];

const NEW_PIPELINE_STATUSES = new Set([
  'imported',
  'invited',
  'registered',
  'verified',
  'in_progress',
]);

const VALID_STAGE_PARAMS = new Set([
  ...PIPELINE_STAGES.map((s) => s.id),
  'not_selected',
]);

const AVATAR_PALETTE = [
  { bg: '#EDE7F6', fg: '#4D148C' },
  { bg: '#FFF3E0', fg: '#E65100' },
  { bg: '#E3F2FD', fg: '#1565C0' },
  { bg: '#E8F5E9', fg: '#2E7D32' },
  { bg: '#F3E5F5', fg: '#6A1B9A' },
];

function pipelineStageLabel(stageId: string): string {
  if (stageId === 'not_selected') return 'Not selected';
  return PIPELINE_STAGES.find((s) => s.id === stageId)?.label ?? stageId;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function avatarColors(candidateId: string) {
  return AVATAR_PALETTE[hashString(candidateId) % AVATAR_PALETTE.length];
}

function initialsFromName(name: string | undefined, fallbackId: string): string {
  const n = (name || '').trim();
  if (!n) return (fallbackId.slice(0, 2) || '??').toUpperCase();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

function effectiveContactEmail(c: CandidateRecord): string {
  return (c.contactEmail || c.email || '').trim();
}

function formatFirestoreDate(v: { toDate?: () => Date } | undefined): string | null {
  if (v?.toDate) {
    try {
      return format(v.toDate(), 'MMM d, yyyy');
    } catch {
      return null;
    }
  }
  return null;
}

function appliedDateLabel(c: CandidateRecord): string {
  return (
    formatFirestoreDate(c.claimedAt) ??
    formatFirestoreDate(c.submittedAt) ??
    formatFirestoreDate(c.invitedAt) ??
    formatFirestoreDate(c.flowStatusUpdatedAt) ??
    '—'
  );
}

function rankFleetFromLegacy(legacy: LegacyRecord | undefined): string {
  if (!legacy) return '—';
  const title = (legacy.lastEmployer?.title || '').trim();
  const aircraft =
    (legacy.flightTime?.lastAircraftFlown || '').trim() ||
    (legacy.aeronautical?.typeRatings || '').trim().split(',')[0]?.trim() ||
    '';
  if (title && aircraft) return `${title} / ${aircraft}`;
  if (title) return title;
  if (aircraft) return aircraft;
  return '—';
}

function pageButtonIndices(current: number, totalPages: number): number[] {
  if (totalPages <= 0) return [];
  const max = 5;
  if (totalPages <= max) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const half = 2;
  let start = Math.max(0, current - half);
  let end = Math.min(totalPages - 1, start + max - 1);
  start = Math.max(0, end - max + 1);
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
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
  const [listTab, setListTab] = useState<(typeof LIST_TABS)[number]['id']>('all');
  const [page, setPage] = useState(0);
  const [flowStarting, setFlowStarting] = useState<Record<string, boolean>>({});
  const [legacyModal, setLegacyModal] = useState<{
    open: boolean;
    data: LegacyRecord | null;
    id: string;
  }>({ open: false, data: null, id: '' });
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<CandidateRecord | null>(null);
  const [resetting, setResetting] = useState(false);
  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    candidate: CandidateRecord | null;
    draft: string;
  }>({ open: false, candidate: null, draft: '' });
  const [savingContactEmail, setSavingContactEmail] = useState(false);

  const candidatesQuery = useMemo(() => query(collection(firestore, 'candidateIds')), [firestore]);
  const { data: allCandidates, loading } = useCollection<CandidateRecord>(candidatesQuery);

  const legacyQuery = useMemo(() => query(collection(firestore, 'legacyData')), [firestore]);
  const { data: allLegacy } = useCollection<Record<string, unknown>>(legacyQuery);

  const legacyMap = useMemo(() => {
    const m = new Map<string, LegacyRecord>();
    allLegacy?.forEach((l) => {
      const id = l.candidateId as string | undefined;
      if (id) m.set(id, l as LegacyRecord);
    });
    return m;
  }, [allLegacy]);

  const baseFiltered = useMemo(() => {
    let list = allCandidates ?? [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.candidateId || '').toLowerCase().includes(s) ||
          (c.name || '').toLowerCase().includes(s) ||
          (c.email || '').toLowerCase().includes(s) ||
          (c.contactEmail || '').toLowerCase().includes(s)
      );
    }
    if (filter === 'Not Contacted') list = list.filter((c) => c.status === 'unassigned');
    else if (filter === 'ID linked') list = list.filter((c) => c.status === 'claimed');
    else if (filter === 'Has Legacy Data') list = list.filter((c) => legacyMap.has(c.candidateId));
    else if (filter === 'No Legacy Data') list = list.filter((c) => !legacyMap.has(c.candidateId));
    return list;
  }, [allCandidates, search, filter, legacyMap]);

  const filtered = useMemo(() => {
    let list = baseFiltered;
    if (stageParam === 'not_selected') {
      list = list.filter((c) => effectiveCandidateFlowStatus(c.flowStatus) === 'not_selected');
    } else if (stageParam) {
      list = list.filter((c) => candidateMatchesPipelineStage(c.flowStatus, stageParam));
    } else if (listTab === 'new') {
      list = list.filter((c) =>
        NEW_PIPELINE_STATUSES.has(effectiveCandidateFlowStatus(c.flowStatus))
      );
    } else if (listTab === 'interviewing') {
      list = list.filter((c) => {
        const eff = effectiveCandidateFlowStatus(c.flowStatus);
        return (
          ['interview_sent', 'scheduled'].includes(eff) ||
          ['testing_invited', 'testing_scheduled'].includes(eff) ||
          ['indoctrination_invited', 'indoctrination_scheduled'].includes(eff)
        );
      });
    } else if (listTab === 'hired') {
      list = list.filter((c) => effectiveCandidateFlowStatus(c.flowStatus) === 'hired');
    }
    return list;
  }, [baseFiltered, stageParam, listTab]);

  const openContactEmailDialog = (c: CandidateRecord) => {
    setEmailDialog({
      open: true,
      candidate: c,
      draft: (c.contactEmail || '').trim(),
    });
  };

  const handleSaveContactEmail = async () => {
    if (!emailDialog.candidate || !user?.uid) {
      toast({
        variant: 'destructive',
        title: 'Not signed in',
        description: 'Sign in as admin to update contact email.',
      });
      return;
    }
    const id = emailDialog.candidate.candidateId;
    const trimmed = emailDialog.draft.trim();
    const prev = (emailDialog.candidate.contactEmail || '').trim();
    setSavingContactEmail(true);
    try {
      await updateDoc(doc(firestore, 'candidateIds', id), {
        ...(trimmed ? { contactEmail: trimmed } : { contactEmail: deleteField() }),
      });
      await addDoc(collection(firestore, 'auditLog'), {
        action: 'contact_email_updated',
        adminUid: user.uid,
        adminEmail: user.email ?? '',
        candidateId: id,
        candidateName: emailDialog.candidate.name || '',
        previousContactEmail: prev || null,
        contactEmail: trimmed || null,
        timestamp: serverTimestamp(),
      });
      toast({
        title: trimmed ? 'Contact email saved' : 'Override removed',
        description: trimmed
          ? `Outreach will use ${trimmed}.`
          : 'Outreach will use the imported email again.',
      });
      setEmailDialog({ open: false, candidate: null, draft: '' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ variant: 'destructive', title: 'Could not save', description: msg });
    } finally {
      setSavingContactEmail(false);
    }
  };

  const handleStartCandidateFlow = async (c: CandidateRecord) => {
    if (!user?.uid) {
      toast({
        variant: 'destructive',
        title: 'Not signed in',
        description: 'Sign in as admin to start the flow.',
      });
      return;
    }
    const id = c.candidateId;
    const email = effectiveContactEmail(c);
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'No email on file',
        description: 'Set a contact email for this candidate before starting the flow.',
      });
      return;
    }
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
      const html = buildFlowStartedEmail(c.name || 'Candidate', email, id);
      await sendEmail(firestore, {
        to: email,
        subject: 'Your FedEx Pilot History Update — Action Required',
        html,
        type: 'flow_started',
        candidateId: id,
        candidateName: c.name || '',
        sentBy: user.uid,
        sentByEmail: user.email || '',
      });
      toast({
        title: 'Flow started',
        description: `Email sent to ${email}. ${c.name || id} is now invited.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({
        variant: 'destructive',
        title: 'Could not start flow',
        description: msg,
      });
    } finally {
      setFlowStarting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage =
    totalPages <= 0 ? 0 : Math.min(page, Math.max(0, totalPages - 1));
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleViewLegacy = async (id: string) => {
    setLoadingLegacy(true);
    try {
      const snap = await getDoc(doc(firestore, 'legacyData', id));
      setLegacyModal({
        open: true,
        data: snap.exists() ? (snap.data() as LegacyRecord) : null,
        id,
      });
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Reset failed';
      toast({ variant: 'destructive', title: 'Reset Failed', description: msg });
    }
    setResetting(false);
  };

  const handleExport = () => {
    const rows = filtered.map((c) => {
      const legacy = legacyMap.get(c.candidateId);
      return {
        CandidateID: c.candidateId,
        Name: c.name || '',
        Email: effectiveContactEmail(c),
        ImportedEmail: c.email || '',
        ContactEmailOverride: c.contactEmail || '',
        LegacyAppID: c.legacyApplicationId || '',
        Status: c.status || '',
        FlightHours: legacy?.flightTime?.total ?? '',
        LastEmployer: legacy?.lastEmployer?.company ?? '',
        ClaimedAt: c.claimedAt?.toDate
          ? format(c.claimedAt.toDate(), 'yyyy-MM-dd HH:mm')
          : '',
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

  const clearPipelineFromUrl = () => {
    router.replace('/admin/candidates');
  };

  const tabIsActive = (id: (typeof LIST_TABS)[number]['id']) =>
    !stageParam && listTab === id;

  const ft = legacyModal.data?.flightTime;
  const emp = legacyModal.data?.lastEmployer;
  const res = legacyModal.data?.lastResidence as
    | { street?: string; city?: string; state?: string; zip?: string; from?: string; to?: string }
    | undefined;
  const aero = legacyModal.data?.aeronautical;

  const paginationIndices = pageButtonIndices(safePage, totalPages);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#333333]">Candidate Management</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">All candidates imported from Paradox</p>
      </div>

      <div className="relative">
        <Input
          placeholder="Search by name, email or Candidate ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="pr-10 bg-white border-[#E3E3E3] text-[#333333] placeholder:text-[#8E8E8E]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-[#333333]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading...</div>
      ) : (allCandidates?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-[#E3E3E3] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center py-16">
          <UserSearch className="h-12 w-12 text-[#E3E3E3] mb-4" />
          <h3 className="text-[15px] font-semibold text-[#333333]">No candidates yet</h3>
          <p className="text-[13px] text-[#8E8E8E] mt-1">Import or add candidates to see them here.</p>
        </div>
      ) : (
        <CandidateRowsTableShell
          tabs={
            <div className="flex flex-wrap gap-6 sm:gap-8">
              {LIST_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setListTab(t.id);
                    setPage(0);
                    if (stageParam) clearPipelineFromUrl();
                  }}
                  className={cn(
                    '-mb-px border-b-2 pb-4 text-[14px] font-medium transition-colors',
                    tabIsActive(t.id)
                      ? 'border-[#4D148C] font-bold text-[#4D148C]'
                      : 'border-transparent text-[#8E8E8E] hover:text-[#4D148C]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          }
          toolbar={
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFilter(f);
                      setPage(0);
                    }}
                    className="rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                    style={
                      filter === f
                        ? { background: '#4D148C', color: 'white' }
                        : { background: '#F2F2F2', color: '#565656' }
                    }
                  >
                    {f}
                  </button>
                ))}
                {stageParam && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#D1C4E9] bg-[#EDE7F6] py-1.5 pl-3.5 pr-2 text-[13px] font-medium text-[#4D148C]">
                    Pipeline: {pipelineStageLabel(stageParam)}
                    <button
                      type="button"
                      onClick={() => {
                        clearPipelineFromUrl();
                        setPage(0);
                      }}
                      className="rounded-full p-0.5 text-[#4D148C] hover:bg-[#D1C4E9]"
                      aria-label="Clear pipeline filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <h2 className="text-[15px] font-bold text-[#333333] sm:hidden">
                  {filtered.length} candidates
                </h2>
                <span className="admin-tooltip">
                  <span className="admin-tooltip-text">
                    Download filtered candidate list as a spreadsheet
                  </span>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={filtered.length === 0}
                    className="inline-flex items-center rounded-lg border-[1.5px] border-[#E3E3E3] bg-white px-4 py-2 text-[13px] font-semibold text-[#565656] transition-all hover:border-[#4D148C] hover:text-[#4D148C] disabled:opacity-40"
                  >
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                  </button>
                </span>
              </div>
            </div>
          }
          footer={
            filtered.length > 0 ? (
              <div className={candidateRowsCardFooterClass}>
                <span>
                  Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
                  {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}{' '}
                  candidates
                </span>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous page"
                      disabled={safePage <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="rounded-lg bg-[#F2F2F2] p-2 text-[#565656] transition-colors hover:bg-[#E3E3E3] disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {paginationIndices.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPage(i)}
                        className={cn(
                          'min-w-[2.25rem] rounded-lg px-2 py-2 text-[13px] font-semibold transition-colors',
                          i === safePage
                            ? 'bg-[#4D148C] text-white'
                            : 'bg-[#F2F2F2] text-[#565656] hover:bg-[#E3E3E3]'
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-label="Next page"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      className="rounded-lg bg-[#F2F2F2] p-2 text-[#565656] transition-colors hover:bg-[#E3E3E3] disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null
          }
        >
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-[13px] text-[#8E8E8E]">
              No candidates match these filters.
            </div>
          ) : (
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className={candidateRowsTableHeadRowClass}>
                  <th className={candidateRowsTableThClass}>Candidate</th>
                  <th className={cn(candidateRowsTableThClass, 'hidden md:table-cell')}>
                    Rank / fleet
                  </th>
                  <th className={candidateRowsTableThClass}>Contact</th>
                  <th className={candidateRowsTableThClass}>Pipeline</th>
                  <th className={cn(candidateRowsTableThClass, 'hidden lg:table-cell')}>
                    Applied
                  </th>
                  <th className={cn(candidateRowsTableThClass, 'hidden sm:table-cell')}>
                    Account
                  </th>
                  <th className={cn(candidateRowsTableThClass, 'text-right')}>Actions</th>
                </tr>
              </thead>
              <tbody className={candidateRowsTableBodyClass}>
                {pageItems.map((c) => {
                  const legacy = legacyMap.get(c.candidateId);
                  const badge = flowStatusBadge(c.flowStatus);
                  const colors = avatarColors(c.candidateId);
                  const contact = effectiveContactEmail(c);
                  const importEmail = (c.email || '').trim();
                  const showLegacyHint =
                    !!c.contactEmail && !!importEmail && c.contactEmail.trim() !== importEmail;

                  return (
                    <tr key={c.candidateId} className={candidateRowsTableTrClass}>
                      <td className={candidateRowsTableTdClass}>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{ background: colors.bg, color: colors.fg }}
                          >
                            {initialsFromName(c.name, c.candidateId)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[#333333]">
                              {c.name || '—'}
                            </div>
                            <div className="truncate font-mono text-[11px] text-[#8E8E8E]">
                              {c.candidateId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={cn(candidateRowsTableTdClass, 'hidden text-[13px] text-[#565656] md:table-cell')}>
                        {rankFleetFromLegacy(legacy)}
                      </td>
                      <td className={candidateRowsTableTdClass}>
                        <div className="flex min-w-0 items-start gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] text-[#333333]">
                              {contact || '—'}
                            </div>
                            {showLegacyHint ? (
                              <div className="truncate text-[10px] text-[#8E8E8E]">
                                Import: {importEmail}
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => openContactEmailDialog(c)}
                            className="mt-0.5 shrink-0 rounded-md border border-[#E3E3E3] bg-[#FAFAFA] p-1 text-[#4D148C] transition-colors hover:border-[#4D148C] hover:bg-white"
                            title="Set current contact email"
                            aria-label="Set current contact email"
                          >
                            <MailPlus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className={candidateRowsTableTdClass}>
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className={cn(candidateRowsTableTdClass, 'hidden text-[13px] text-[#565656] lg:table-cell')}>
                        {appliedDateLabel(c)}
                      </td>
                      <td className={cn(candidateRowsTableTdClass, 'hidden sm:table-cell')}>
                        <Badge
                          className={
                            c.status === 'claimed'
                              ? 'bg-[#008A00] text-white'
                              : 'bg-[#8E8E8E] text-white'
                          }
                        >
                          {c.status === 'claimed' ? 'ID linked' : 'Not contacted'}
                        </Badge>
                      </td>
                      <td className={cn(candidateRowsTableTdClass, 'text-right')}>
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          {c.assignedUid ? (
                            <span className="admin-tooltip">
                              <span className="admin-tooltip-text">
                                Application review — profile, legacy data, and submitted form
                              </span>
                              <Link
                                href={`/admin/review/${c.assignedUid}`}
                                className="inline-flex items-center justify-center rounded-full border border-[#E3E3E3] bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#4D148C] transition-all hover:border-[#4D148C]"
                              >
                                <User className="mr-1 h-3 w-3" />
                                Profile
                              </Link>
                            </span>
                          ) : (
                            <span
                              className="inline-flex cursor-default items-center justify-center rounded-full border border-[#F2F2F2] bg-[#FAFAFA] px-3.5 py-1.5 text-[11px] font-medium text-[#B8B8B8]"
                              title="No portal account linked yet — use Start Flow or wait for the candidate to register"
                            >
                              No account
                            </span>
                          )}
                          {canStartCandidateFlow(c.flowStatus) ? (
                            <button
                              type="button"
                              disabled={!!flowStarting[c.candidateId]}
                              onClick={() => handleStartCandidateFlow(c)}
                              className="fedex-btn-primary-sm inline-flex !cursor-pointer !rounded-full !px-3.5 !py-1.5 text-[11px] disabled:opacity-50"
                            >
                              {flowStarting[c.candidateId] ? 'Starting…' : 'Start Flow'}
                            </button>
                          ) : null}
                          <span className="admin-tooltip">
                            <span className="admin-tooltip-text">
                              View flight hours and legacy records
                            </span>
                            <button
                              type="button"
                              onClick={() => handleViewLegacy(c.candidateId)}
                              disabled={loadingLegacy}
                              className="inline-flex items-center rounded-full border border-[#E3E3E3] bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#4D148C] transition-all hover:border-[#4D148C] disabled:opacity-50"
                            >
                              <Eye className="mr-1 h-3 w-3" /> Legacy
                            </button>
                          </span>
                          <span className="admin-tooltip">
                            <span className="admin-tooltip-text">
                              Allow candidate to re-verify with a new account
                            </span>
                            <button
                              type="button"
                              onClick={() => setResetConfirm(c)}
                              className="inline-flex items-center rounded-full border border-[#E3E3E3] bg-[#F2F2F2] px-3.5 py-1.5 text-[11px] font-bold text-[#8E8E8E] transition-all hover:border-[#DE002E] hover:text-[#DE002E]"
                            >
                              <RotateCcw className="mr-1 h-3 w-3" /> Reset
                            </button>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CandidateRowsTableShell>
      )}

      <Dialog
        open={emailDialog.open}
        onOpenChange={(o) => {
          if (!o) setEmailDialog({ open: false, candidate: null, draft: '' });
        }}
      >
        <DialogContent className="border-[#E3E3E3] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#333333]">Current contact email</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#8E8E8E]">
            Imported email (legacy system):{' '}
            <span className="font-medium text-[#565656]">
              {emailDialog.candidate?.email?.trim() || '—'}
            </span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="contact-email" className="text-[#333333]">
              Email to use for Start Flow and outreach
            </Label>
            <Input
              id="contact-email"
              type="email"
              autoComplete="off"
              placeholder="name@example.com"
              value={emailDialog.draft}
              onChange={(e) =>
                setEmailDialog((prev) => ({ ...prev, draft: e.target.value }))
              }
              className="border-[#E3E3E3]"
            />
            <p className="text-[12px] text-[#8E8E8E]">
              Leave blank and save to remove the override and use the imported email again.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-[#E3E3E3]"
              disabled={savingContactEmail}
              onClick={() => setEmailDialog((prev) => ({ ...prev, draft: '' }))}
            >
              Clear field
            </Button>
            <Button
              type="button"
              className="bg-[#4D148C] hover:bg-[#3d0f6e]"
              disabled={savingContactEmail}
              onClick={handleSaveContactEmail}
            >
              {savingContactEmail ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {legacyModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setLegacyModal({ open: false, data: null, id: '' })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-[90%] max-w-[560px] overflow-y-auto rounded-2xl border border-[#E3E3E3] bg-white"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: 32 }}
          >
            <h2 className="mb-6 text-[18px] font-bold text-[#333333]">
              Legacy Data — {legacyModal.id}
            </h2>
            {!legacyModal.data ? (
              <p className="text-[13px] text-[#8E8E8E]">No legacy data found for this candidate.</p>
            ) : (
              <div>
                {ft && (
                  <div>
                    <h4 className="mt-0 border-b border-[#F2F2F2] pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8E8E8E]">
                      FLIGHT TIME SUMMARY
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(ft)
                        .filter(([, v]) => typeof v === 'number')
                        .map(([k, v]) => (
                          <div key={k} className="rounded-lg bg-[#FAFAFA] px-3 py-2.5">
                            <div className="text-[12px] text-[#8E8E8E]">
                              {k
                                .replace(/([A-Z])/g, ' $1')
                                .replace(/^./, (s: string) => s.toUpperCase())}
                            </div>
                            <div className="text-[16px] font-bold text-[#333333]">{String(v)}</div>
                          </div>
                        ))}
                    </div>
                    {(ft.dateLastFlown || ft.lastAircraftFlown) && (
                      <div
                        className="my-2 rounded-r-md"
                        style={{
                          background: 'rgba(0,122,183,0.06)',
                          borderLeft: '3px solid #007AB7',
                          padding: '10px 14px',
                        }}
                      >
                        <div className="text-[11px] font-bold uppercase text-[#007AB7]">
                          Date Last Flown
                        </div>
                        <div className="text-[16px] font-bold text-[#333333]">
                          {String(ft.dateLastFlown ?? '—')}
                        </div>
                        {ft.lastAircraftFlown && (
                          <div className="text-[13px] text-[#565656]">{ft.lastAircraftFlown}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {emp && (emp.company || emp.title) && (
                  <div>
                    <h4 className="mt-5 border-b border-[#F2F2F2] pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8E8E8E]">
                      LAST EMPLOYER
                    </h4>
                    <p className="text-[14px] font-semibold text-[#333333]">{emp.company || '—'}</p>
                    <p className="text-[13px] text-[#565656]">{emp.title}</p>
                    <p className="text-[13px] text-[#565656]">
                      {[emp.city, emp.state].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-[13px] text-[#565656]">
                      {emp.from} → {emp.to}
                    </p>
                  </div>
                )}
                {res && (res.street || res.city) && (
                  <div>
                    <h4 className="mt-5 border-b border-[#F2F2F2] pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8E8E8E]">
                      LAST RESIDENCE
                    </h4>
                    <p className="text-[14px] font-semibold text-[#333333]">{res.street || '—'}</p>
                    <p className="text-[13px] text-[#565656]">
                      {[res.city, res.state, res.zip].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-[13px] text-[#565656]">
                      {res.from} → {res.to}
                    </p>
                  </div>
                )}
                {aero && (
                  <div>
                    <h4 className="mt-5 border-b border-[#F2F2F2] pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8E8E8E]">
                      AERONAUTICAL
                    </h4>
                    <p className="text-[13px] text-[#565656]">
                      ATP:{' '}
                      <span className="text-[14px] font-semibold text-[#333333]">
                        {aero.atpNumber || '—'}
                      </span>
                    </p>
                    <p className="text-[13px] text-[#565656]">
                      Medical:{' '}
                      <span className="text-[14px] font-semibold text-[#333333]">
                        {aero.firstClassMedicalDate || '—'}
                      </span>
                    </p>
                    <p className="text-[13px] text-[#565656]">
                      Type Ratings:{' '}
                      <span className="text-[14px] font-semibold text-[#333333]">
                        {aero.typeRatings || '—'}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setLegacyModal({ open: false, data: null, id: '' })}
              className="mt-6 w-full rounded-lg border-[1.5px] border-[#E3E3E3] bg-white py-2.5 text-[14px] font-semibold text-[#565656] transition-all hover:border-[#4D148C] hover:text-[#4D148C]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={!!resetConfirm} onOpenChange={(o) => !o && setResetConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#333333]">Reset Candidate ID?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8E8E8E]">
              This will reset{' '}
              <strong className="text-[#333333]">{resetConfirm?.candidateId}</strong> to
              &quot;unassigned&quot; and remove the user link. The candidate will need to verify
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting} className="border-[#E3E3E3] text-[#565656]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting}
              className="bg-[#DE002E] text-white hover:bg-[#b8002a]"
            >
              {resetting ? 'Resetting...' : 'Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
