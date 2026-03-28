// NOTE: Legacy data in Firestore may have incorrect totals from old import.
// Re-import HTML files through /admin/import to get correct totals.
// Correct totals for Colin Chessor:
// totalPIC: 918.4
// totalSIC: 1239.1
// totalInstructor: 459.1
// total: 2616.6
// turbinePIC: 614.2
// multiEngine: 2014.2
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ArrowLeft, Check, Circle, Loader2 } from 'lucide-react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore, useUser } from '@/firebase';
import type {
  ApplicantData,
  EmploymentHistory,
  LegacyAircraftRow,
  LegacyData,
  SafetyQuestion,
} from '@/lib/types';
import { decryptField, isEncrypted } from '@/lib/encryption';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { sendEmail, buildInterviewEmail, getPublicPortalOrigin } from '@/lib/email';

const SAFETY_LABELS: Record<string, string> = {
  terminations: 'Terminations or resignations in lieu of from any FAA covered positions?',
  askedToResign: 'Asked to resign from any FAA covered position?',
  formalDiscipline: 'Have you ever received formal discipline from your employer?',
  accidents: 'Aircraft accidents?',
  incidents: 'Aircraft Incidents?',
  flightViolations: 'Flight violations?',
  certificateAction: 'Certificate suspension/revocation?',
  pendingFaaAction: 'Pending FAA Action/Letters of investigation?',
  failedCheckRide:
    'Have you ever failed a flight check ride, proficiency check, flight eval, or upgrade attempt aircraft or while compensated as a professional pilot (in the last three years)?',
  investigationBoard: 'Have you ever been called before a field board of investigation for any reason?',
  previousInterview:
    'Have you previously interviewed for the following positions at Fedex (not counting the one that you were hired under)?',
  trainingCommitmentConflict:
    'Do you have any commitment that will not allow you to enter and complete uninterrupted a training syllabus of approximately 10 weeks once commenced?',
  otherInfo: 'Is there anything else you feel warrants and that you would like to bring up at this time?',
};

const SAFETY_ORDER = [
  'terminations',
  'askedToResign',
  'formalDiscipline',
  'accidents',
  'incidents',
  'flightViolations',
  'certificateAction',
  'pendingFaaAction',
  'failedCheckRide',
  'investigationBoard',
  'previousInterview',
  'trainingCommitmentConflict',
  'otherInfo',
] as const;

type FlightTotals = {
  total: number;
  totalPIC: number;
  totalSIC: number;
  totalInstructor: number;
  turbinePIC: number;
  multiEngine: number;
  nightHours: number;
  dateLastFlown: string;
  lastAircraftFlown: string;
};

const FLIGHT_CELL_LABEL_STYLE: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#8E8E8E',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 2,
};

const FLIGHT_NUM_ROWS: { key: keyof FlightTotals; label: string }[] = [
  { key: 'total', label: 'Total Hours' },
  { key: 'totalPIC', label: 'Total PIC' },
  { key: 'totalSIC', label: 'Total SIC' },
  { key: 'totalInstructor', label: 'Total Instr' },
  { key: 'turbinePIC', label: 'Turbine PIC' },
  { key: 'multiEngine', label: 'Multi-Engine' },
  { key: 'nightHours', label: 'Night Hours' },
];

const COMBINED_COLUMN_SURFACE: CSSProperties = {
  borderLeft: '2px solid #E3E3E3',
  boxShadow: 'inset 3px 0 0 #008A00',
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function numField(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  return 0;
}

function sumFromAircraft(aircraft: LegacyAircraftRow[]): {
  totalPIC: number;
  totalSIC: number;
  totalInstructor: number;
  nightHours: number;
  multiEngine: number;
  turbinePICFromRows: number;
  hasTurbinePerRow: boolean;
  total: number;
} {
  let totalPIC = 0;
  let totalSIC = 0;
  let totalInstructor = 0;
  let nightHours = 0;
  let multiEngine = 0;
  let turbinePICFromRows = 0;
  let hasTurbinePerRow = false;
  for (const row of aircraft) {
    totalPIC += numField(row.pic ?? row.PIC);
    totalSIC += numField(row.sic ?? row.SIC);
    totalInstructor += numField(row.instructor ?? row.Instructor);
    nightHours += numField(row.night ?? row.nightHours);
    multiEngine += numField(row.multiEngine);
    const tp = row.turbinePIC ?? row.turbinePic;
    if (tp != null && typeof tp === 'number' && !Number.isNaN(tp)) {
      turbinePICFromRows += tp;
      hasTurbinePerRow = true;
    }
  }
  const total = round1(totalPIC + totalSIC + totalInstructor);
  return {
    totalPIC,
    totalSIC,
    totalInstructor,
    nightHours,
    multiEngine,
    turbinePICFromRows,
    hasTurbinePerRow,
    total,
  };
}

function computeLegacyTotals(legacyFlight: LegacyData['flightTime'] | undefined): FlightTotals {
  const aircraft = legacyFlight?.aircraft;
  const fromRows =
    aircraft && Array.isArray(aircraft) && aircraft.length > 0 ? sumFromAircraft(aircraft) : null;

  const stored: FlightTotals = {
    total: numField(legacyFlight?.total),
    totalPIC: numField(legacyFlight?.totalPIC) || numField(legacyFlight?.turbinePIC),
    totalSIC: numField(legacyFlight?.sic) || numField(legacyFlight?.totalSIC),
    totalInstructor:
      numField(legacyFlight?.instructor) || numField(legacyFlight?.totalInstructor),
    turbinePIC: numField(legacyFlight?.turbinePIC),
    multiEngine: numField(legacyFlight?.multiEngine),
    nightHours: numField(legacyFlight?.nightHours),
    dateLastFlown: legacyFlight?.dateLastFlown?.trim() || '—',
    lastAircraftFlown: legacyFlight?.lastAircraftFlown?.trim() || '—',
  };

  if (!fromRows) {
    if (!stored.total && (stored.totalPIC || stored.totalSIC || stored.totalInstructor)) {
      stored.total = round1(stored.totalPIC + stored.totalSIC + stored.totalInstructor);
    }
    return stored;
  }

  const turbinePIC = fromRows.hasTurbinePerRow
    ? fromRows.turbinePICFromRows
    : numField(legacyFlight?.turbinePIC) || fromRows.totalPIC;

  return {
    total: fromRows.total,
    totalPIC: fromRows.totalPIC,
    totalSIC: fromRows.totalSIC,
    totalInstructor: fromRows.totalInstructor,
    turbinePIC,
    multiEngine: fromRows.multiEngine || numField(legacyFlight?.multiEngine),
    nightHours: fromRows.nightHours || numField(legacyFlight?.nightHours),
    dateLastFlown: legacyFlight?.dateLastFlown?.trim() || '—',
    lastAircraftFlown: legacyFlight?.lastAircraftFlown?.trim() || '—',
  };
}

function buildUpdatedTotals(updatedFlight: ApplicantData['flightTime'] | undefined): FlightTotals {
  const empty: FlightTotals = {
    total: 0,
    totalPIC: 0,
    totalSIC: 0,
    totalInstructor: 0,
    turbinePIC: 0,
    multiEngine: 0,
    nightHours: 0,
    dateLastFlown: '—',
    lastAircraftFlown: '—',
  };
  if (!updatedFlight) return empty;

  const ft = updatedFlight;
  const turbinePic = numField(ft.turbinePic);
  const military = numField(ft.military);
  const instructor = numField(ft.instructor);
  return {
    total: numField(ft.total),
    totalPIC: turbinePic + military + instructor,
    totalSIC: numField(ft.sic),
    totalInstructor: instructor,
    turbinePIC: turbinePic,
    multiEngine: numField(ft.multiEngine),
    nightHours: numField(ft.nightHours),
    dateLastFlown: (ft.dateLastFlown && String(ft.dateLastFlown).trim()) || '—',
    lastAircraftFlown: (ft.lastAircraftFlown && String(ft.lastAircraftFlown).trim()) || '—',
  };
}

function formatHoursDisplay(n: number): string {
  return round1(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function deltaBadge(legacy: number, updated: number): { text: string; tone: 'pos' | 'neg' } | null {
  const d = round1(updated - legacy);
  if (d === 0) return null;
  const text = d > 0 ? `+${formatHoursDisplay(d)}` : formatHoursDisplay(d);
  return { text, tone: d > 0 ? 'pos' : 'neg' };
}

function isHighlightDelta(legacy: number, updated: number): boolean {
  const d = updated - legacy;
  return d > 100 || d < -100;
}

function normalizeAircraftRow(row: LegacyAircraftRow) {
  return {
    aircraft: (row.aircraft || row.type || '—').trim() || '—',
    pic: numField(row.pic ?? row.PIC),
    sic: numField(row.sic ?? row.SIC),
    instructor: numField(row.instructor ?? row.Instructor),
    night: numField(row.night ?? row.nightHours),
    lastFlown: String(row.lastFlown || row.lastFlownDate || '—').trim() || '—',
  };
}

function combineHours(legacy: number, updated: number): number {
  return round1(legacy + updated);
}

function parseDateLoose(s: string): number {
  const t = s.trim();
  if (!t || t === '—') return NaN;
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) return parsed;
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2])).getTime();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  return NaN;
}

function combineDateLastFlown(leg: string, upd: string): string {
  const tl = parseDateLoose(leg);
  const tu = parseDateLoose(upd);
  let best = -Infinity;
  if (!Number.isNaN(tl)) best = Math.max(best, tl);
  if (!Number.isNaN(tu)) best = Math.max(best, tu);
  if (best === -Infinity) return '—';
  return format(new Date(best), 'MM/dd/yyyy');
}

function combineLastAircraft(leg: string, upd: string): string {
  const u = upd.trim();
  if (u && u !== '—') return u;
  const l = leg.trim();
  if (l && l !== '—') return l;
  return '—';
}

type CandidateIdsDoc = {
  candidateId?: string;
  flowStatus?: string;
  notes?: string;
  createdAt?: { toDate?: () => Date };
  invitedAt?: { toDate?: () => Date };
  registeredAt?: { toDate?: () => Date };
  verifiedAt?: { toDate?: () => Date };
  submittedAt?: { toDate?: () => Date };
  applicationStartedAt?: { toDate?: () => Date };
  flowStatusUpdatedAt?: { toDate?: () => Date };
  interviewInvitedAt?: { toDate?: () => Date };
};

function formatTs(ts: { toDate?: () => Date } | undefined): string {
  if (!ts?.toDate) return '';
  try {
    return format(ts.toDate(), 'MMM d, yyyy');
  } catch {
    return '';
  }
}

function sortEmploymentRecentFirst(entries: EmploymentHistory[]): EmploymentHistory[] {
  return [...entries].sort((a, b) => {
    const aCurrent = a.endDate === null ? 1 : 0;
    const bCurrent = b.endDate === null ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    const aEnd = a.endDate?.toDate?.()?.getTime() ?? 0;
    const bEnd = b.endDate?.toDate?.()?.getTime() ?? 0;
    return bEnd - aEnd;
  });
}

function decryptAtp(raw: string | null): string {
  if (raw == null || raw === '') return '—';
  const s = String(raw);
  return isEncrypted(s) ? decryptField(s) : s;
}

function decryptMedicalDisplay(raw: ApplicantData['firstClassMedicalDate']): string {
  if (!raw) return '—';
  if (typeof raw === 'string' && isEncrypted(raw)) {
    const d = decryptField(raw);
    try {
      return format(new Date(d), 'PP');
    } catch {
      return d;
    }
  }
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
    try {
      return format((raw as { toDate: () => Date }).toDate(), 'PP');
    } catch {
      return '—';
    }
  }
  return '—';
}

type TimelineStep = {
  id: string;
  label: string;
  ts: (c: CandidateIdsDoc, userCreated?: Date | null) => string;
};

const TIMELINE_STEPS: TimelineStep[] = [
  { id: 'imported', label: 'Imported', ts: (c) => formatTs(c.createdAt) },
  { id: 'invited', label: 'Invited', ts: (c) => formatTs(c.invitedAt) },
  {
    id: 'registered',
    label: 'Registered',
    ts: (c, uc) => formatTs(c.registeredAt) || (uc ? format(uc, 'MMM d, yyyy') : ''),
  },
  { id: 'verified', label: 'Verified', ts: (c) => formatTs(c.verifiedAt) },
  { id: 'submitted', label: 'Submitted', ts: (c) => formatTs(c.submittedAt) },
  {
    id: 'under_review',
    label: 'Under Review',
    ts: (c) => (c.flowStatus === 'under_review' ? formatTs(c.flowStatusUpdatedAt) : ''),
  },
  {
    id: 'interview',
    label: 'Interview',
    ts: (c) => formatTs(c.interviewInvitedAt),
  },
  {
    id: 'decision',
    label: 'Decision',
    ts: (c) =>
      c.flowStatus === 'hired' || c.flowStatus === 'not_selected'
        ? formatTs(c.flowStatusUpdatedAt)
        : '',
  },
];

function stepVisual(
  stepIndex: number,
  flowStatus: string | undefined
): 'check' | 'hourglass' | 'empty' {
  const f = flowStatus || 'submitted';
  if (f === 'hired' || f === 'not_selected') {
    return stepIndex <= 7 ? 'check' : 'empty';
  }
  if (f === 'interview_sent' || f === 'scheduled') {
    if (stepIndex <= 5) return 'check';
    if (stepIndex === 6) return 'hourglass';
    return 'empty';
  }
  if (f === 'under_review') {
    if (stepIndex <= 4) return 'check';
    if (stepIndex === 5) return 'hourglass';
    return 'empty';
  }
  if (f === 'submitted') {
    if (stepIndex <= 4) return 'check';
    if (stepIndex === 5) return 'hourglass';
    return 'empty';
  }
  if (f === 'in_progress') {
    if (stepIndex <= 4) return 'check';
    if (stepIndex === 5) return 'hourglass';
    return 'empty';
  }
  if (stepIndex <= 4) return 'check';
  if (stepIndex === 5) return 'hourglass';
  return 'empty';
}

export default function AdminReviewPage() {
  const params = useParams();
  const uid = typeof params.uid === 'string' ? params.uid : '';
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const { toast } = useToast();

  const userRef = uid ? doc(firestore, 'users', uid) : undefined;
  const { data: applicant, loading: userLoading, error: userError } = useDoc<ApplicantData>(userRef);

  const candidateId = applicant?.candidateId?.trim() || '';
  const candidateRef = candidateId ? doc(firestore, 'candidateIds', candidateId) : undefined;
  const { data: candidate, loading: candLoading } = useDoc<CandidateIdsDoc>(candidateRef);

  const legacyRef = candidateId ? doc(firestore, 'legacyData', candidateId) : undefined;
  const { data: legacyRaw, loading: legLoading } = useDoc<LegacyData & { aeronautical?: { typeRatings?: string; firstClassMedicalDate?: string; atpNumber?: string } }>(
    legacyRef
  );

  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSave, setNotesSave] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [markingInterview, setMarkingInterview] = useState(false);
  const [markingReview, setMarkingReview] = useState(false);
  const [aircraftBreakdownOpen, setAircraftBreakdownOpen] = useState(false);

  const firstName = applicant?.firstName?.trim() || '';
  const fullName = [applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ').trim() || applicant?.email || 'Candidate';

  const defaultInviteBody = useMemo(() => {
    const fn = firstName || 'Candidate';
    return `Dear ${fn},

Thank you for submitting your FedEx pilot application. We would like to invite you to an in-person interview. Please use the link below to select your preferred interview time from our available slots.

[CALENDAR LINK - Coming Soon]

We look forward to speaking with you.

FedEx Express Pilot Recruiting`;
  }, [firstName]);

  const [inviteMessage, setInviteMessage] = useState(defaultInviteBody);
  useEffect(() => {
    setInviteMessage(defaultInviteBody);
  }, [defaultInviteBody]);

  useEffect(() => {
    document.body.classList.add('admin-review-print-active');
    return () => document.body.classList.remove('admin-review-print-active');
  }, []);

  useEffect(() => {
    setNotesDirty(false);
    setNotes('');
  }, [uid]);

  useEffect(() => {
    if (!candidateId || !candidate || notesDirty) return;
    setNotes(String(candidate.notes ?? ''));
  }, [candidateId, candidate, notesDirty]);

  useEffect(() => {
    if (!candidateId || !notesDirty) return;
    setNotesSave('saving');
    const t = window.setTimeout(async () => {
      try {
        await updateDoc(doc(firestore, 'candidateIds', candidateId), { notes });
        setNotesSave('saved');
        setNotesDirty(false);
        window.setTimeout(() => setNotesSave('idle'), 2000);
      } catch (e) {
        console.error('Notes save:', e);
        setNotesSave('idle');
      }
    }, 1000);
    return () => window.clearTimeout(t);
  }, [notes, notesDirty, candidateId, firestore]);

  const legacyFt = legacyRaw?.flightTime;
  const legacyAero = legacyRaw?.aeronautical;
  const legacyTotals = useMemo(() => computeLegacyTotals(legacyRaw?.flightTime), [legacyRaw?.flightTime]);
  const updatedTotals = useMemo(() => buildUpdatedTotals(applicant?.flightTime), [applicant?.flightTime]);
  const flightBannerTotals = useMemo(
    () => ({
      combinedTotal: combineHours(legacyTotals.total, updatedTotals.total),
      combinedPIC: combineHours(legacyTotals.totalPIC, updatedTotals.totalPIC),
      combinedSIC: combineHours(legacyTotals.totalSIC, updatedTotals.totalSIC),
    }),
    [legacyTotals, updatedTotals]
  );

  const legacyAircraftList = legacyFt?.aircraft;
  const aircraftRowsNormalized =
    legacyAircraftList && legacyAircraftList.length > 0
      ? legacyAircraftList.map(normalizeAircraftRow)
      : null;
  const aircraftColumnTotals =
    aircraftRowsNormalized?.reduce(
      (acc, r) => ({
        pic: acc.pic + r.pic,
        sic: acc.sic + r.sic,
        instructor: acc.instructor + r.instructor,
        night: acc.night + r.night,
      }),
      { pic: 0, sic: 0, instructor: 0, night: 0 }
    ) ?? null;

  const markUnderReview = useCallback(async () => {
    if (!candidateId || !uid) return;
    setMarkingReview(true);
    try {
      await updateDoc(doc(firestore, 'candidateIds', candidateId), {
        flowStatus: 'under_review',
        flowStatusUpdatedAt: serverTimestamp(),
      });
      await updateDoc(doc(firestore, 'users', uid), {
        candidateFlowStatus: 'under_review',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingReview(false);
    }
  }, [candidateId, firestore, uid]);

  const markInterviewSent = useCallback(async () => {
    if (!candidateId || !uid || !adminUser) return;
    const toEmail = applicant?.email?.trim();
    if (!toEmail) {
      toast({
        variant: 'destructive',
        title: 'No email',
        description: 'Applicant has no email on file.',
      });
      return;
    }
    setMarkingInterview(true);
    try {
      const scheduleUrl = `${getPublicPortalOrigin()}/schedule?candidateId=${encodeURIComponent(candidateId)}`;
      const html = buildInterviewEmail(fullName, toEmail, scheduleUrl);
      await sendEmail(firestore, {
        to: toEmail,
        subject: 'FedEx Pilot Interview Invitation',
        html,
        type: 'interview_invite',
        candidateId,
        candidateName: fullName,
        sentBy: adminUser.uid,
        sentByEmail: adminUser.email || '',
      });
      await updateDoc(doc(firestore, 'candidateIds', candidateId), {
        flowStatus: 'interview_sent',
        interviewInvitedAt: serverTimestamp(),
        flowStatusUpdatedAt: serverTimestamp(),
      });
      await updateDoc(doc(firestore, 'users', uid), {
        candidateFlowStatus: 'interview_sent',
      });
      await addDoc(collection(firestore, 'auditLog'), {
        action: 'interview_invited',
        adminUid: adminUser.uid,
        adminEmail: adminUser.email ?? '',
        candidateId,
        candidateName: fullName,
        timestamp: serverTimestamp(),
      });
      toast({
        title: 'Interview invitation sent',
        description: `Interview invitation sent to ${toEmail}`,
      });
      setInviteOpen(false);
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Failed to send invitation',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setMarkingInterview(false);
    }
  }, [candidateId, firestore, uid, adminUser, fullName, applicant?.email, toast]);

  const copyInviteMessage = useCallback(() => {
    void navigator.clipboard.writeText(inviteMessage);
  }, [inviteMessage]);

  const userCreated = applicant?.createdAt?.toDate?.() ?? null;
  const flow = String(candidate?.flowStatus || applicant?.candidateFlowStatus || 'submitted');

  const interviewSentAt =
    candidate?.interviewInvitedAt && typeof candidate.interviewInvitedAt.toDate === 'function'
      ? candidate.interviewInvitedAt.toDate()
      : null;
  const interviewAlreadySent =
    flow === 'interview_sent' || flow === 'scheduled' || interviewSentAt != null;

  const loading = userLoading || (!!candidateId && (candLoading || legLoading));

  if (!uid) {
    return <div className="text-[#8E8E8E] text-sm py-12">Invalid link.</div>;
  }

  if (userError || (!userLoading && !applicant)) {
    return (
      <div className="space-y-4">
        <Link href="/admin/candidates" className="inline-flex items-center text-[14px] font-semibold text-[#4D148C] hover:underline review-action-buttons">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Candidates
        </Link>
        <p className="text-[#DE002E]">Could not load this applicant.</p>
      </div>
    );
  }

  if (loading || !applicant) {
    return (
      <div className="flex items-center justify-center py-24 text-[#8E8E8E]">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading review…
      </div>
    );
  }

  if (!applicant.submittedAt) {
    return (
      <div className="space-y-4">
        <Link href="/admin/candidates" className="inline-flex items-center text-[14px] font-semibold text-[#4D148C] hover:underline review-action-buttons">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Candidates
        </Link>
        <p className="text-[#565656]">This application has not been submitted yet.</p>
      </div>
    );
  }

  if (!candidateId) {
    return (
      <div className="space-y-4">
        <Link href="/admin/candidates" className="inline-flex items-center text-[14px] font-semibold text-[#4D148C] hover:underline review-action-buttons">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Candidates
        </Link>
        <p className="text-[#565656]">No Candidate ID linked to this user.</p>
      </div>
    );
  }

  const submittedDate = applicant.submittedAt?.toDate
    ? format(applicant.submittedAt.toDate(), 'PPpp')
    : '—';

  const initials = [applicant.firstName?.[0], applicant.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || (applicant.email?.[0]?.toUpperCase() ?? '?');

  const employmentSorted = sortEmploymentRecentFirst(applicant.employmentHistory || []);

  return (
    <div className="admin-review-page space-y-8 pb-16">
      <div className="hidden print:block review-print-header text-center border-b border-[#333] pb-4 mb-6">
        <div className="flex justify-center">
          <FedExBrandMark height={36} />
        </div>
        <h1 className="text-lg font-bold mt-3 text-[#333333]">Pilot Application Review</h1>
        <p className="text-sm mt-1 text-[#333333]">
          {fullName} · Candidate ID {candidateId}
        </p>
        <p className="text-xs text-[#565656] mt-1">Printed {format(new Date(), 'PPpp')}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/candidates"
            className="review-action-buttons inline-flex items-center text-[14px] font-semibold text-[#4D148C] hover:underline mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Candidates
          </Link>
        </div>
        <div className="review-action-buttons flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold border border-[#E3E3E3] bg-white text-[#333333] hover:border-[#4D148C]"
          >
            Print Full Report
          </button>
          {interviewAlreadySent ? (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold border border-[#008A00] bg-[#E8F5E9] text-[#1B5E20] hover:bg-[#C8E6C9] transition-colors"
            >
              Interview invitation sent
              {interviewSentAt ? ` · ${format(interviewSentAt, 'MMM d, yyyy')}` : ''}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold bg-[#4D148C] text-white hover:brightness-110"
            >
              Invite to Interview
            </button>
          )}
          <button
            type="button"
            disabled={markingReview}
            onClick={() => void markUnderReview()}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold border border-[#E3E3E3] bg-white text-[#333333] hover:border-[#FF6200] disabled:opacity-50"
          >
            {markingReview ? 'Updating…' : 'Mark Under Review'}
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-[28px] font-bold text-[#333333]">{fullName}</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">
          {applicant.email || '—'} · Candidate ID {candidateId}
        </p>
      </div>

      {/* Section 1 — Header + timeline */}
      <section className="review-section print:break-inside-avoid bg-white rounded-xl border border-[#E3E3E3] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] print:shadow-none print:border print:rounded-none">
        <div className="flex flex-col lg:flex-row lg:justify-between gap-8">
          <div className="flex gap-4 items-start">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[22px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 50%, #FF6200 100%)' }}
            >
              {initials}
            </div>
            <div>
              <p className="text-[24px] font-bold text-[#333333]">{fullName}</p>
              <p className="text-[14px] text-[#565656] mt-1">{applicant.email || '—'}</p>
              <p className="text-[14px] font-mono text-[#565656] mt-0.5">{candidateId}</p>
              <p className="text-[13px] text-[#8E8E8E] mt-2">
                Application submitted: <span className="text-[#333333] font-medium">{submittedDate}</span>
              </p>
            </div>
          </div>
          <div className="min-w-0 lg:max-w-md">
            <p className="text-[11px] font-bold text-[#8E8E8E] uppercase tracking-wider mb-3">Flow timeline</p>
            <ul className="space-y-2">
              {TIMELINE_STEPS.map((step, i) => {
                const ts = step.ts(candidate || {}, userCreated);
                const vis = stepVisual(i, flow);

                let icon: ReactNode;
                if (vis === 'empty') {
                  icon = <Circle className="h-4 w-4 text-[#CFCFCF]" strokeWidth={2} />;
                } else if (vis === 'hourglass') {
                  icon = <span className="text-[14px]" aria-hidden>⏳</span>;
                } else {
                  icon = <Check className="h-4 w-4 text-[#008A00]" strokeWidth={2.5} />;
                }

                const isCurrent = vis === 'hourglass';

                return (
                  <li key={step.id} className="flex items-start gap-2 text-[13px]">
                    <span className="mt-0.5 shrink-0 w-5 flex justify-center">{icon}</span>
                    <span className={isCurrent ? 'font-semibold text-[#333333]' : 'text-[#565656]'}>
                      {step.label}
                      {isCurrent ? <span className="text-[#8E8E8E] font-normal"> (current)</span> : null}
                      {vis === 'check' && ts ? (
                        <span className="font-normal text-[#8E8E8E]"> — {ts}</span>
                      ) : null}
                      {vis === 'hourglass' && ts ? (
                        <span className="font-normal text-[#8E8E8E]"> — {ts}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2 — Flight hours */}
      <section className="review-section print:break-inside-avoid w-full max-w-full print:border-0">
        <div
          className="flight-hours-summary-banner mb-4 print:break-inside-avoid"
          style={{
            background:
              'linear-gradient(135deg, rgba(0,138,0,0.06) 0%, rgba(0,138,0,0.02) 100%)',
            border: '1px solid rgba(0,138,0,0.2)',
            borderRadius: 12,
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#333333', margin: 0 }}>
              Combined Flight Hours Snapshot
            </p>
            <p style={{ fontSize: 12, color: '#8E8E8E', margin: '4px 0 0' }}>
              Legacy Paradox data + candidate updates
            </p>
          </div>
          <div className="flex items-stretch gap-0">
            <div className="flex flex-col items-center px-4 min-w-[100px]">
              <span
                className="tabular-nums"
                style={{ fontSize: 28, fontWeight: 800, color: '#333333', lineHeight: 1.1 }}
              >
                {formatHoursDisplay(flightBannerTotals.combinedTotal)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#8E8E8E',
                  textTransform: 'uppercase',
                  marginTop: 4,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Total Hours
              </span>
            </div>
            <div className="w-px self-stretch bg-[#E3E3E3] my-1" aria-hidden />
            <div className="flex flex-col items-center px-4 min-w-[100px]">
              <span
                className="tabular-nums"
                style={{ fontSize: 28, fontWeight: 800, color: '#333333', lineHeight: 1.1 }}
              >
                {formatHoursDisplay(flightBannerTotals.combinedPIC)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#8E8E8E',
                  textTransform: 'uppercase',
                  marginTop: 4,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Total PIC
              </span>
            </div>
            <div className="w-px self-stretch bg-[#E3E3E3] my-1" aria-hidden />
            <div className="flex flex-col items-center px-4 min-w-[100px]">
              <span
                className="tabular-nums"
                style={{ fontSize: 28, fontWeight: 800, color: '#333333', lineHeight: 1.1 }}
              >
                {formatHoursDisplay(flightBannerTotals.combinedSIC)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#8E8E8E',
                  textTransform: 'uppercase',
                  marginTop: 4,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                Total SIC
              </span>
            </div>
          </div>
        </div>

        <div
          className="flight-hours-compare bg-white print:border print:rounded-none"
          style={{
            width: '100%',
            border: '1px solid #E3E3E3',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div
              style={{
                background: 'rgba(77,20,140,0.06)',
                borderRight: '2px solid #E3E3E3',
                padding: '14px 20px',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: '#4D148C', margin: 0 }}>
                Legacy Data (Paradox)
              </p>
              <p style={{ fontSize: 11, color: '#8E8E8E', margin: '4px 0 0' }}>Data on file before update</p>
            </div>
            <div
              style={{
                background: 'rgba(255,98,0,0.06)',
                borderRight: '2px solid #E3E3E3',
                padding: '14px 20px',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: '#FF6200', margin: 0 }}>
                Updated Application
              </p>
              <p style={{ fontSize: 11, color: '#8E8E8E', margin: '4px 0 0' }}>
                Candidate&apos;s current submission
              </p>
            </div>
            <div
              style={{
                background: 'rgba(0,138,0,0.06)',
                padding: '14px 20px',
                ...COMBINED_COLUMN_SURFACE,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: '#008A00', margin: 0 }}>Combined Total</p>
              <p style={{ fontSize: 11, color: '#8E8E8E', margin: '4px 0 0' }}>
                Legacy + Updated snapshot
              </p>
            </div>
          </div>

          {FLIGHT_NUM_ROWS.map((row, idx) => {
            const leg = legacyTotals[row.key] as number;
            const upd = updatedTotals[row.key] as number;
            const combined = combineHours(leg, upd);
            const badge = deltaBadge(leg, upd);
            const highlight = isHighlightDelta(leg, upd);
            const zebra = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
            const rowBg = highlight ? 'rgba(247,177,24,0.06)' : zebra;
            return (
              <div
                key={row.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  borderTop: '1px solid #F2F2F2',
                  background: rowBg,
                  borderLeft: highlight ? '3px solid #F7B118' : undefined,
                }}
              >
                <div
                  style={{
                    padding: '12px 20px',
                    borderRight: '2px solid #E3E3E3',
                    background: highlight ? 'transparent' : rowBg,
                    minWidth: 0,
                  }}
                >
                  <div style={FLIGHT_CELL_LABEL_STYLE}>{row.label}</div>
                  <div
                    className="tabular-nums"
                    style={{ fontSize: 20, fontWeight: 700, color: '#4D148C' }}
                  >
                    {formatHoursDisplay(leg)}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px 20px',
                    borderRight: '2px solid #E3E3E3',
                    background: highlight ? 'transparent' : rowBg,
                    minWidth: 0,
                  }}
                >
                  <div style={FLIGHT_CELL_LABEL_STYLE}>{row.label}</div>
                  <div className="flex flex-wrap items-baseline gap-0">
                    <span
                      className="tabular-nums"
                      style={{ fontSize: 20, fontWeight: 700, color: '#FF6200' }}
                    >
                      {formatHoursDisplay(upd)}
                    </span>
                    {badge ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 99,
                          padding: '2px 8px',
                          marginLeft: 8,
                          background:
                            badge.tone === 'pos' ? 'rgba(0,138,0,0.1)' : 'rgba(222,0,46,0.08)',
                          color: badge.tone === 'pos' ? '#008A00' : '#DE002E',
                        }}
                      >
                        {badge.text}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px 20px',
                    background: highlight ? 'transparent' : rowBg,
                    minWidth: 0,
                    ...COMBINED_COLUMN_SURFACE,
                  }}
                >
                  <div style={FLIGHT_CELL_LABEL_STYLE}>{row.label}</div>
                  <div
                    className="tabular-nums"
                    style={{ fontSize: 22, fontWeight: 800, color: '#008A00' }}
                  >
                    {formatHoursDisplay(combined)}
                  </div>
                </div>
              </div>
            );
          })}

          {(() => {
            const divIdx = FLIGHT_NUM_ROWS.length;
            const zebra = divIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  borderTop: '1px solid #E3E3E3',
                  background: zebra,
                }}
              >
                <div
                  style={{
                    padding: '10px 20px',
                    borderRight: '2px solid #E3E3E3',
                    background: zebra,
                    minHeight: 12,
                  }}
                />
                <div
                  style={{
                    padding: '10px 20px',
                    borderRight: '2px solid #E3E3E3',
                    background: zebra,
                    minHeight: 12,
                  }}
                />
                <div
                  style={{
                    padding: '12px 20px',
                    background: zebra,
                    ...COMBINED_COLUMN_SURFACE,
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#008A00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  —
                </div>
              </div>
            );
          })()}

          {(['dateLastFlown', 'lastAircraftFlown'] as const).map((key, j) => {
            const label = key === 'dateLastFlown' ? 'Date Last Flown' : 'Last Aircraft';
            const leg = legacyTotals[key];
            const upd = updatedTotals[key];
            const combined =
              key === 'dateLastFlown'
                ? combineDateLastFlown(leg, upd)
                : combineLastAircraft(leg, upd);
            const idx = FLIGHT_NUM_ROWS.length + 1 + j;
            const zebra = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
            return (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  borderTop: '1px solid #F2F2F2',
                  background: zebra,
                }}
              >
                <div
                  style={{
                    padding: '12px 20px',
                    borderRight: '2px solid #E3E3E3',
                    background: zebra,
                    minWidth: 0,
                  }}
                >
                  <div style={FLIGHT_CELL_LABEL_STYLE}>{label}</div>
                  <div
                    style={{ fontSize: 14, fontWeight: 700, color: '#4D148C', wordBreak: 'break-word' }}
                  >
                    {leg}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px 20px',
                    borderRight: '2px solid #E3E3E3',
                    background: zebra,
                    minWidth: 0,
                  }}
                >
                  <div style={FLIGHT_CELL_LABEL_STYLE}>{label}</div>
                  <div
                    style={{ fontSize: 14, fontWeight: 700, color: '#FF6200', wordBreak: 'break-word' }}
                  >
                    {upd}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px 20px',
                    background: zebra,
                    minWidth: 0,
                    ...COMBINED_COLUMN_SURFACE,
                  }}
                >
                  <div style={FLIGHT_CELL_LABEL_STYLE}>{label}</div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: '#008A00',
                      wordBreak: 'break-word',
                    }}
                  >
                    {combined}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {aircraftRowsNormalized && aircraftColumnTotals ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setAircraftBreakdownOpen((o) => !o)}
              className="bg-transparent border-0 p-0 cursor-pointer"
              style={{ fontSize: 13, color: '#4D148C', fontWeight: 600 }}
            >
              {aircraftBreakdownOpen ? 'Show Aircraft Breakdown ▲' : 'Show Aircraft Breakdown ▼'}
            </button>
            {aircraftBreakdownOpen ? (
              <div
                className="mt-3 rounded-md border border-[#E3E3E3] overflow-hidden"
                style={{ width: '100%' }}
              >
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr style={{ background: '#F2F2F2' }}>
                      {['Aircraft', 'PIC', 'SIC', 'Instructor', 'Night', 'Last Flown'].map((h) => (
                        <th
                          key={h}
                          className={`px-3 py-2 text-left font-bold text-[#565656] uppercase tracking-wide text-[11px] ${h !== 'Aircraft' && h !== 'Last Flown' ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aircraftRowsNormalized.map((r, i) => (
                      <tr
                        key={i}
                        style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}
                      >
                        <td className="px-3 py-2 text-[#333333]">{r.aircraft}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatHoursDisplay(r.pic)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatHoursDisplay(r.sic)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatHoursDisplay(r.instructor)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatHoursDisplay(r.night)}</td>
                        <td className="px-3 py-2 text-[#333333]">{r.lastFlown}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid #E3E3E3', fontWeight: 700, background: '#FFFFFF' }}>
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatHoursDisplay(aircraftColumnTotals.pic)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatHoursDisplay(aircraftColumnTotals.sic)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatHoursDisplay(aircraftColumnTotals.instructor)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatHoursDisplay(aircraftColumnTotals.night)}
                      </td>
                      <td className="px-3 py-2">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Section 3 — Employment */}
      <section className="review-section print:break-inside-avoid rounded-xl border border-[#E3E3E3] overflow-hidden bg-white print:border">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div
            className="review-compare-head-legacy px-4 py-3 border-b md:border-b-0 md:border-r border-[#E3E3E3]"
            style={{ background: 'rgba(77,20,140,0.06)' }}
          >
            <p className="text-[15px] font-bold text-[#333333]">Legacy — Last employer</p>
            <p className="text-[12px] text-[#565656]">Paradox</p>
          </div>
          <div
            className="review-compare-head-updated px-4 py-3 border-b border-[#E3E3E3]"
            style={{ background: 'rgba(255,98,0,0.06)' }}
          >
            <p className="text-[15px] font-bold text-[#333333]">Updated — Employment history</p>
            <p className="text-[12px] text-[#565656]">Most recent first</p>
          </div>
          <div className="p-4 border-b md:border-b-0 md:border-r border-[#F2F2F2] min-h-[120px]">
            {legacyRaw?.lastEmployer?.company || legacyRaw?.lastEmployer?.title ? (
              <div className="text-[14px] text-[#333333] space-y-1">
                <p className="font-semibold text-[#4D148C]">{legacyRaw.lastEmployer.company || '—'}</p>
                <p>{legacyRaw.lastEmployer.title || '—'}</p>
                <p className="text-[#565656]">
                  {[legacyRaw.lastEmployer.city, legacyRaw.lastEmployer.state].filter(Boolean).join(', ')}
                </p>
                <p className="text-[12px] text-[#8E8E8E]">
                  {legacyRaw.lastEmployer.from} → {legacyRaw.lastEmployer.to}
                </p>
              </div>
            ) : (
              <p className="text-[#8E8E8E] text-sm">No legacy employer on file.</p>
            )}
          </div>
          <div className="p-4 space-y-4">
            {employmentSorted.length === 0 ? (
              <p className="text-[#8E8E8E] text-sm">No employment entries.</p>
            ) : (
              employmentSorted.map((job, i) => (
                <div key={i} className="border-b border-[#F2F2F2] last:border-0 pb-3 last:pb-0 text-[14px]">
                  <p className="font-semibold text-[#FF6200]">{job.employerName}</p>
                  <p className="text-[#333333]">{job.jobTitle}</p>
                  <p className="text-[12px] text-[#8E8E8E] mt-1">
                    {job.startDate?.toDate ? format(job.startDate.toDate(), 'MMM yyyy') : '—'} —{' '}
                    {job.endDate === null
                      ? 'Present'
                      : job.endDate?.toDate
                        ? format(job.endDate.toDate(), 'MMM yyyy')
                        : '—'}
                  </p>
                  <p className="text-[12px] text-[#565656] mt-1">{job.duties}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Section 4 — Aeronautical */}
      <section className="review-section print:break-inside-avoid rounded-xl border border-[#E3E3E3] overflow-hidden bg-white print:border">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div
            className="review-compare-head-legacy px-4 py-3 border-b md:border-b-0 md:border-r border-[#E3E3E3]"
            style={{ background: 'rgba(77,20,140,0.06)' }}
          >
            <p className="text-[15px] font-bold text-[#333333]">Legacy — Aeronautical</p>
          </div>
          <div
            className="review-compare-head-updated px-4 py-3 border-b border-[#E3E3E3]"
            style={{ background: 'rgba(255,98,0,0.06)' }}
          >
            <p className="text-[15px] font-bold text-[#333333]">Updated — Aeronautical</p>
          </div>
          <div className="p-4 border-b md:border-b-0 md:border-r border-[#F2F2F2] space-y-3 text-[14px]">
            <div>
              <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">ATP Number</p>
              <p className="text-[#4D148C] mt-1">{legacyAero?.atpNumber || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">Type Ratings</p>
              <p className="text-[#4D148C] mt-1">{legacyAero?.typeRatings || legacyRaw?.flightTime?.lastAircraftFlown || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">First Class Medical</p>
              <p className="text-[#4D148C] mt-1">{legacyAero?.firstClassMedicalDate || '—'}</p>
            </div>
          </div>
          <div className="p-4 space-y-3 text-[14px]">
            <div>
              <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">ATP Number</p>
              <p className="text-[#FF6200] mt-1">{decryptAtp(applicant.atpNumber)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">Type Ratings</p>
              <p className="text-[#FF6200] mt-1">{applicant.typeRatings || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8E8E8E] uppercase">First Class Medical</p>
              <p className="text-[#FF6200] mt-1">{decryptMedicalDisplay(applicant.firstClassMedicalDate)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 — Safety */}
      <section className="review-section print:break-inside-avoid rounded-xl border border-[#E3E3E3] p-6 bg-white print:border space-y-4">
        <h2 className="text-[18px] font-bold text-[#333333]">Safety questions</h2>
        <div className="space-y-4">
          {SAFETY_ORDER.map((key) => {
            const label = SAFETY_LABELS[key];
            const q = applicant.safetyQuestions?.[key as keyof ApplicantData['safetyQuestions']] as SafetyQuestion | undefined;
            if (!label || !q) return null;
            const yes = q.answer === 'yes';
            return (
              <div
                key={key}
                className={`rounded-lg border border-[#E3E3E3] p-4 ${yes ? 'border-l-4 border-l-[#DE002E] bg-[#FFF5F5]' : ''}`}
              >
                <p className="text-[14px] text-[#333333] font-medium pr-2">{label}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="inline-block rounded-full px-3 py-0.5 text-[11px] font-bold text-white"
                    style={{ background: yes ? '#DE002E' : '#008A00' }}
                  >
                    {q.answer === 'no' ? 'No' : q.answer === 'yes' ? 'Yes' : '—'}
                  </span>
                </div>
                {yes && (q.explanation || '').trim() ? (
                  <div className="mt-3 rounded-md bg-[#FAFAFA] border border-[#E3E3E3] px-3 py-2 text-[13px] text-[#333333]">
                    {q.explanation}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 6 — Certification */}
      <section className="review-section print:break-inside-avoid rounded-xl border border-[#E3E3E3] p-6 bg-white print:border">
        <h2 className="text-[18px] font-bold text-[#333333] mb-4">Certification</h2>
        <p className="text-[14px] text-[#333333]">
          Application certified:{' '}
          <span className="font-semibold">{applicant.isCertified ? 'Yes' : 'No'}</span>
        </p>
        <p className="text-[14px] text-[#565656] mt-2">
          Printed / digital name:{' '}
          <span className="font-medium text-[#333333]">{applicant.printedName?.trim() || '—'}</span>
        </p>
      </section>

      {/* Section 7 — HR Notes */}
      <section className="review-hr-notes review-section rounded-xl border border-[#E3E3E3] p-6 bg-white">
        <h2 className="text-[18px] font-bold text-[#333333]">HR Notes (Internal Only)</h2>
        <p className="text-[13px] text-[#8E8E8E] mt-1 mb-3">
          These notes are not visible to the candidate
        </p>
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          className="min-h-[120px] resize-y border-[#E3E3E3] text-[#333333]"
          placeholder="Internal notes…"
        />
        <div className="mt-2 flex items-center gap-2 text-[12px] text-[#8E8E8E]">
          {notesSave === 'saving' && <span>Saving…</span>}
          {notesSave === 'saved' && <span className="text-[#008A00] font-semibold">Saved</span>}
        </div>
      </section>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {interviewAlreadySent ? 'Interview invitation (sent)' : 'Invite to Interview'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[14px] text-[#333333]">
            {interviewAlreadySent ? (
              <p className="text-[13px] text-[#565656] rounded-lg bg-[#FAFAFA] border border-[#E3E3E3] px-3 py-2">
                This candidate was already marked as invited
                {interviewSentAt ? ` on ${format(interviewSentAt, 'PP')}` : ''}. You can edit the message and
                send again if needed.
              </p>
            ) : null}
            <p>
              <span className="font-semibold">{fullName}</span>
              <br />
              <span className="text-[#565656]">{applicant.email}</span>
            </p>
            <p className="text-[#565656]">
              Interview invitation will be sent to:{' '}
              <span className="font-semibold text-[#333333]">{applicant.email}</span>
            </p>
            <Textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="min-h-[220px] text-[13px] border-[#E3E3E3]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={copyInviteMessage} className="border-[#E3E3E3]">
              Copy Message
            </Button>
            <Button
              type="button"
              disabled={markingInterview}
              onClick={() => void markInterviewSent()}
              className="bg-[#4D148C] hover:bg-[#7D22C3] text-white"
            >
              {markingInterview ? 'Saving…' : interviewAlreadySent ? 'Send again' : 'Mark as Invited'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
