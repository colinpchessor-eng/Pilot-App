'use client';

import { useState, useRef, useCallback, useMemo, useEffect, type CSSProperties } from 'react';
import { Upload, CheckCircle, AlertTriangle, XCircle, Pencil, Trash2, Download, ArrowRight } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { sendEmail, buildFlowStartedEmail } from '@/lib/email';
import {
  CandidateRowsTableShell,
  candidateRowsTableBodyClass,
  candidateRowsCardFooterClass,
  candidateRowsTableHeadRowClass,
  candidateRowsTableTdClass,
  candidateRowsTableThClass,
  candidateRowsTableTrClass,
} from '@/components/admin/candidate-rows-table-shell';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────
type ParsedCandidate = {
  name: string;
  email: string;
  flightTime: {
    total: number;
    turbinePIC: number;
    sic: number;
    instructor: number;
    dateLastFlown: string;
    lastAircraftFlown: string;
  };
  lastEmployer: {
    company: string;
    title: string;
    city: string;
    state: string;
    from: string;
    to: string;
  };
  lastResidence: { street: string; city: string; state: string; zip: string };
  aeronautical: { typeRatings: string; firstClassMedicalDate: string };
};

type ImportFile = {
  id: string;
  file: File;
  candidateId: string | null;
  parsed: ParsedCandidate | null;
  status: 'ready' | 'warning' | 'error';
  editing: boolean;
  editCandidateId: string;
  editEmail: string;
};

type ImportResult = {
  candidateId: string;
  name: string;
  email: string;
  status: 'imported' | 'skipped' | 'failed';
  message: string;
  /** Set when a new candidateIds doc is created */
  flowStatus?: string;
};

// ─── ID Extraction ──────────────────────────────────────────────────
function extractCandidateId(filename: string): string | null {
  const parenMatch = filename.match(/\((\d+)\)/);
  if (parenMatch) return parenMatch[1];
  const underscoreMatch = filename.match(/__(\d{6,10})_/);
  if (underscoreMatch) return underscoreMatch[1];
  const plainMatch = filename.replace('.html', '').match(/^(\d+)$/);
  if (plainMatch) return plainMatch[1];
  return null;
}

// ─── Format Detection ───────────────────────────────────────────────
function detectFormat(htmlDoc: Document): 'paradox' | 'test' {
  const sectionTitles = htmlDoc.querySelectorAll('.section-title');
  return sectionTitles.length > 0 ? 'test' : 'paradox';
}

// ─── Paradox Real Format Parser ─────────────────────────────────────
function getParadoxAnswer(
  htmlDoc: Document,
  sectionHeading: string,
  questionText: string,
  order?: string,
  exactMatch?: boolean
): string {
  const headings = htmlDoc.querySelectorAll('h3');
  let targetTable: Element | null = null;

  headings.forEach(h => {
    if (h.textContent?.toLowerCase().trim() === sectionHeading.toLowerCase()) {
      let next = h.nextElementSibling;
      while (next && next.tagName !== 'TABLE') {
        next = next.nextElementSibling;
      }
      if (next) targetTable = next;
    }
  });

  if (!targetTable) return '';

  const rows = (targetTable as Element).querySelectorAll('tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const q = cells[0].textContent?.trim() || '';
      const o = cells[1].textContent?.trim() || '';
      const a = cells[2].textContent?.trim() || '';

      const questionMatch = exactMatch
        ? q.toLowerCase() === questionText.toLowerCase()
        : q.toLowerCase().includes(questionText.toLowerCase());

      const orderMatch = !order || o === order;

      if (questionMatch && orderMatch) {
        return a;
      }
    }
  }
  return '';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    year: 'numeric',
  });
}

function parseRealFormat(htmlDoc: Document): ParsedCandidate {
  const firstName = getParadoxAnswer(htmlDoc, 'My Information', 'First Name');
  const lastName = getParadoxAnswer(htmlDoc, 'My Information', 'Last Name');
  const email = getParadoxAnswer(htmlDoc, 'My Information', 'Primary Email');
  const street = getParadoxAnswer(htmlDoc, 'Residency History', 'Street Address Line 1', '1');
  const city = getParadoxAnswer(htmlDoc, 'Residency History', 'City', '1');
  const state = getParadoxAnswer(htmlDoc, 'Residency History', 'State / Region', '1');
  const zip = getParadoxAnswer(htmlDoc, 'Residency History', 'ZIP/Postal Code', '1');
  const company = getParadoxAnswer(htmlDoc, 'Work Experience', 'Employer', '1', true);
  const title = getParadoxAnswer(htmlDoc, 'Work Experience', 'Job Title', '1', true);
  const employerCity = getParadoxAnswer(htmlDoc, 'Work Experience', 'City', '1', true);
  const employerState = getParadoxAnswer(htmlDoc, 'Work Experience', 'State', '1', true);
  const employerFrom = getParadoxAnswer(htmlDoc, 'Work Experience', 'Start Date', '1', false);
  const employerTo = getParadoxAnswer(htmlDoc, 'Work Experience', 'End Date', '1', false);

  let totalPIC = 0;
  let totalSIC = 0;
  let totalInstructor = 0;
  let dateLastFlown = '';
  let lastAircraftFlown = '';
  let currentAircraft = '';
  const typeRatings: string[] = [];

  const allRows = htmlDoc.querySelectorAll('tr');
  allRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 3) {
      const q = cells[0].textContent?.trim();
      const a = cells[2].textContent?.trim() || '0';
      if (q === 'Aircraft Type') {
        currentAircraft = a;
        if (a && !typeRatings.includes(a)) typeRatings.push(a);
      }
      if (q === 'PIC Hrs') totalPIC += parseFloat(a) || 0;
      if (q === 'SIC Hrs') totalSIC += parseFloat(a) || 0;
      if (q === 'Instructor Hrs') totalInstructor += parseFloat(a) || 0;
      if (q === 'Last Flown Date' && !dateLastFlown && a) {
        const d = new Date(a);
        if (!isNaN(d.getTime())) {
          dateLastFlown = d.toLocaleDateString('en-US');
          lastAircraftFlown = currentAircraft;
        }
      }
    }
  });

  const medicalRaw = getParadoxAnswer(htmlDoc, 'Certifications', 'Issued:');
  const medicalDate = medicalRaw ? new Date(medicalRaw).toLocaleDateString('en-US') : '';

  return {
    name: `${firstName} ${lastName}`.trim(),
    email,
    flightTime: {
      total: Math.round((totalPIC + totalSIC + totalInstructor) * 10) / 10,
      turbinePIC: totalPIC,
      sic: totalSIC,
      instructor: totalInstructor,
      dateLastFlown,
      lastAircraftFlown,
    },
    lastEmployer: {
      company,
      title,
      city: employerCity,
      state: employerState,
      from: formatDate(employerFrom),
      to: formatDate(employerTo),
    },
    lastResidence: { street, city, state, zip },
    aeronautical: {
      typeRatings: typeRatings.slice(0, 5).join(', '),
      firstClassMedicalDate: medicalDate,
    },
  };
}

// ─── Test Format Parser ─────────────────────────────────────────────
function parseTestFormat(htmlDoc: Document): ParsedCandidate {
  function getFieldValue(label: string): string {
    const rows = htmlDoc.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        if (cells[0].textContent?.trim().toLowerCase().includes(label.toLowerCase())) {
          return cells[1].textContent?.trim() || '';
        }
      }
    }
    return '';
  }

  return {
    name: `${getFieldValue('First Name')} ${getFieldValue('Last Name')}`.trim(),
    email: getFieldValue('Email Address'),
    flightTime: {
      total: parseFloat(getFieldValue('Total Flight Hours').replace(/,/g, '')) || 0,
      turbinePIC: parseFloat(getFieldValue('Turbine PIC Hours').replace(/,/g, '')) || 0,
      sic: parseFloat(getFieldValue('SIC Hours').replace(/,/g, '')) || 0,
      instructor: parseFloat(getFieldValue('Instructor Hours').replace(/,/g, '')) || 0,
      dateLastFlown: getFieldValue('Date Last Flown'),
      lastAircraftFlown: getFieldValue('Last Aircraft Flown'),
    },
    lastEmployer: { company: '', title: '', city: '', state: '', from: '', to: '' },
    lastResidence: { street: '', city: '', state: '', zip: '' },
    aeronautical: {
      typeRatings: getFieldValue('Type Ratings'),
      firstClassMedicalDate: getFieldValue('First Class Medical Date'),
    },
  };
}

function parseParadoxHTML(htmlString: string): ParsedCandidate {
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(htmlString, 'text/html');
  const format = detectFormat(htmlDoc);
  return format === 'paradox' ? parseRealFormat(htmlDoc) : parseTestFormat(htmlDoc);
}

// ─── Page Component ─────────────────────────────────────────────────
const flowStartBtnStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)',
  color: 'white',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
};

export default function AdminImportPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const [files, setFiles] = useState<ImportFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [flowStarted, setFlowStarted] = useState<Record<string, boolean>>({});
  const [flowStarting, setFlowStarting] = useState<Record<string, boolean>>({});
  const [startAllOpen, setStartAllOpen] = useState(false);
  const [startAllBusy, setStartAllBusy] = useState(false);
  const flowStartedRef = useRef(flowStarted);
  useEffect(() => {
    flowStartedRef.current = flowStarted;
  }, [flowStarted]);

  const readyCount = useMemo(() => files.filter(f => f.status === 'ready').length, [files]);
  const warningCount = useMemo(() => files.filter(f => f.status === 'warning').length, [files]);
  const errorCount = useMemo(() => files.filter(f => f.status === 'error').length, [files]);
  const importableCount = readyCount + warningCount;

  // ── Process dropped/selected files ──────────────────────────────
  const processFiles = useCallback(async (fileList: FileList) => {
    const newFiles: ImportFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.name.endsWith('.html')) continue;

      const candidateId = extractCandidateId(file.name);
      const text = await file.text();
      let parsed: ParsedCandidate | null = null;

      try {
        parsed = parseParadoxHTML(text);
      } catch {
        parsed = null;
      }

      let status: ImportFile['status'] = 'ready';
      if (!candidateId) status = 'error';
      else if (!parsed?.email) status = 'warning';

      newFiles.push({
        id: `${file.name}-${Date.now()}-${i}`,
        file,
        candidateId,
        parsed,
        status,
        editing: false,
        editCandidateId: candidateId || '',
        editEmail: parsed?.email || '',
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = '';
  }, [processFiles]);

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const toggleEdit = (id: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      if (f.editing) {
        const newId = f.editCandidateId.trim() || null;
        const newEmail = f.editEmail.trim();
        const parsed = f.parsed ? { ...f.parsed, email: newEmail || f.parsed.email } : f.parsed;
        let status: ImportFile['status'] = 'ready';
        if (!newId) status = 'error';
        else if (!parsed?.email) status = 'warning';
        return { ...f, candidateId: newId, parsed, status, editing: false };
      }
      return { ...f, editing: true, editCandidateId: f.candidateId || '', editEmail: f.parsed?.email || '' };
    }));
  };

  // ── Import to Firestore ─────────────────────────────────────────
  const runImport = async () => {
    setConfirmOpen(false);
    setImporting(true);
    setProgress(0);
    setLogLines([]);
    setResults([]);
    setFlowStarted({});
    flowStartedRef.current = {};
    setFlowStarting({});

    const importable = files.filter(f => f.candidateId && f.parsed);
    const total = importable.length;
    const newResults: ImportResult[] = [];

    for (let i = 0; i < total; i++) {
      const f = importable[i];
      const cid = f.candidateId!;
      const data = f.parsed!;

      try {
        await setDoc(doc(firestore, 'legacyData', cid), {
          candidateId: cid,
          name: data.name,
          email: data.email,
          importedAt: new Date().toISOString(),
          source: 'web-import',
          flightTime: data.flightTime,
          lastEmployer: data.lastEmployer,
          lastResidence: data.lastResidence,
          aeronautical: data.aeronautical,
        }, { merge: true });

        const candidateRef = doc(firestore, 'candidateIds', cid);
        const existing = await getDoc(candidateRef);

        if (existing.exists()) {
          const line = `⏭  ${data.name || cid} (${cid}) — skipped (already exists)`;
          setLogLines(prev => [...prev, line]);
          newResults.push({ candidateId: cid, name: data.name, email: data.email, status: 'skipped', message: 'Already exists' });
        } else {
          await setDoc(candidateRef, {
            candidateId: cid,
            name: data.name || '',
            email: data.email || '',
            legacyApplicationId: cid,
            status: 'unassigned',
            assignedUid: '',
            masterKey: false,
            claimedAt: '',
            createdAt: serverTimestamp(),
            source: 'web-import',
            flowStatus: 'imported',
            flowStatusUpdatedAt: serverTimestamp(),
          });
          const line = `✅ ${data.name || cid} (${cid}) — imported (flowStatus: imported)`;
          setLogLines(prev => [...prev, line]);
          newResults.push({
            candidateId: cid,
            name: data.name,
            email: data.email,
            status: 'imported',
            message: 'Success',
            flowStatus: 'imported',
          });
        }
      } catch (err: any) {
        const line = `❌ ${data.name || cid} (${cid}) — failed: ${err.message}`;
        setLogLines(prev => [...prev, line]);
        newResults.push({ candidateId: cid, name: data.name, email: data.email, status: 'failed', message: err.message });
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    const errFiles = files.filter(f => !f.candidateId || !f.parsed);
    for (const f of errFiles) {
      const line = `❌ ${f.file.name} — failed: no candidate ID`;
      setLogLines(prev => [...prev, line]);
      newResults.push({ candidateId: '', name: f.file.name, email: '', status: 'failed', message: 'No candidate ID' });
    }

    setResults(newResults);
    setDone(true);
    setImporting(false);
  };

  const startCandidateFlow = async (candidateId: string, candidateName: string, candidateEmail: string) => {
    if (!user?.uid || !candidateId) return;
    if (flowStartedRef.current[candidateId]) return;
    const email = (candidateEmail || '').trim();
    if (!email) return;
    setFlowStarting((prev) => ({ ...prev, [candidateId]: true }));
    try {
      await updateDoc(doc(firestore, 'candidateIds', candidateId), {
        flowStatus: 'invited',
        invitedAt: serverTimestamp(),
        flowStatusUpdatedAt: serverTimestamp(),
      });
      await addDoc(collection(firestore, 'auditLog'), {
        action: 'flow_started',
        adminUid: user.uid,
        adminEmail: user.email ?? '',
        candidateId,
        candidateName: candidateName || '',
        timestamp: serverTimestamp(),
      });
      const html = buildFlowStartedEmail(candidateName || 'Candidate', email, candidateId);
      await sendEmail(firestore, {
        to: email,
        subject: 'Your FedEx Pilot Application — Action Required',
        html,
        type: 'flow_started',
        candidateId,
        candidateName: candidateName || '',
        sentBy: user.uid,
        sentByEmail: user.email || '',
      });
      flowStartedRef.current = { ...flowStartedRef.current, [candidateId]: true };
      setFlowStarted((prev) => ({ ...prev, [candidateId]: true }));
    } finally {
      setFlowStarting((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  const runStartAllFlows = async () => {
    const rows = results.filter((r) => r.status === 'imported' && r.candidateId);
    setStartAllOpen(false);
    setStartAllBusy(true);
    try {
      for (const r of rows) {
        if (flowStartedRef.current[r.candidateId]) continue;
        await startCandidateFlow(r.candidateId, r.name || '', r.email || '');
      }
    } finally {
      setStartAllBusy(false);
    }
  };

  // ── Download CSV report ─────────────────────────────────────────
  const downloadReport = () => {
    const header = 'CandidateID,Name,Email,Status,FlowStatus,Message';
    const rows = results.map(r =>
      [r.candidateId, r.name, r.email, r.status, r.flowStatus ?? '', r.message]
        .map(v => `"${(v || '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `import-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-scroll log
  const scrollLog = useCallback(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, []);
  useMemo(() => scrollLog(), [logLines, scrollLog]);

  const importedCount = results.filter(r => r.status === 'imported').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const importedRows = useMemo(() => results.filter((r) => r.status === 'imported'), [results]);

  // ── Status icon helper ──────────────────────────────────────────
  const StatusIcon = ({ status }: { status: ImportFile['status'] }) => {
    if (status === 'ready') return <CheckCircle className="h-4 w-4 text-[#008A00]" />;
    if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-[#F7B118]" />;
    return <XCircle className="h-4 w-4 text-[#DE002E]" />;
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#333333]">Import Candidates</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">Upload Paradox HTML files to import candidate records</p>
      </div>

      {/* ── COMPLETION SUMMARY ─────────────────────────────────── */}
      {done && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(0,138,0,0.06)', border: '1px solid rgba(0,138,0,0.2)' }}>
          <div className="flex items-start gap-4">
            <CheckCircle className="h-8 w-8 text-[#008A00] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-[18px] font-bold text-[#333333]">Import Complete</h2>
              {importedCount > 0 && user && (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={startAllBusy}
                    onClick={() => setStartAllOpen(true)}
                    className="inline-flex items-center justify-center border-0 cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={flowStartBtnStyle}
                  >
                    {startAllBusy ? 'Starting…' : 'Start All Flows'}
                  </button>
                </div>
              )}
              <div className="mt-2 space-y-1 text-[14px] text-[#333333]">
                <div>{importedCount} candidate{importedCount !== 1 ? 's' : ''} imported successfully</div>
                <div>{skippedCount} skipped (already exist)</div>
                <div>{failedCount} failed</div>
                {importedCount > 0 && (
                  <p className="text-[13px] text-[#565656] pt-2 border-t border-[rgba(0,138,0,0.15)] mt-2">
                    Pipeline: new <code className="text-[12px] bg-white/80 px-1 rounded">candidateIds</code> documents were created with{' '}
                    <span className="font-semibold text-[#333333]">flowStatus: imported</span> and{' '}
                    <span className="font-semibold text-[#333333]">flowStatusUpdatedAt</span> set to the import time.
                  </p>
                )}
              </div>
              {importedRows.length > 0 && user && (
                <div className="mt-4 pt-4 border-t border-[rgba(0,138,0,0.15)] space-y-2">
                  <h3 className="text-[13px] font-bold text-[#565656] uppercase tracking-wide">Imported candidates</h3>
                  <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {importedRows.map((r) => {
                      const started = flowStarted[r.candidateId];
                      const busy = flowStarting[r.candidateId];
                      return (
                        <li
                          key={r.candidateId}
                          className="flex flex-wrap items-center gap-3 justify-between bg-white/70 rounded-lg px-3 py-2 border border-[rgba(0,138,0,0.12)]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-semibold text-[#333333] truncate">{r.name || r.candidateId}</div>
                            <div className="text-[12px] font-mono text-[#8E8E8E]">{r.candidateId}</div>
                          </div>
                          {started ? (
                            <button
                              type="button"
                              disabled
                              className="shrink-0 border-0 cursor-default rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
                              style={{ background: '#008A00', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
                            >
                              ✓ Flow Started
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => startCandidateFlow(r.candidateId, r.name || '', r.email || '')}
                              className="shrink-0 border-0 cursor-pointer transition-opacity disabled:opacity-50"
                              style={flowStartBtnStyle}
                            >
                              {busy ? 'Starting…' : 'Start Candidate Flow'}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center bg-white border-[1.5px] border-[#E3E3E3] rounded-lg px-5 py-2.5 text-[14px] font-semibold text-[#333333] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all hover:border-[#4D148C] hover:text-[#4D148C]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Report CSV
                </button>
                <Link
                  href="/admin/candidates"
                  className="inline-flex items-center rounded-lg px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)' }}
                >
                  Go to Candidates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT PROGRESS ────────────────────────────────────── */}
      {importing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[14px] text-[#333333] font-medium">
            <span>Importing candidates...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#E3E3E3] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #4D148C 0%, #FF6200 100%)',
              }}
            />
          </div>
          <div
            ref={logRef}
            className="bg-[#FAFAFA] border border-[#E3E3E3] rounded-lg p-4 max-h-[240px] overflow-y-auto font-mono text-[13px] text-[#333333] space-y-1"
          >
            {logLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOG (shown after completion too) ────────────────────── */}
      {done && logLines.length > 0 && (
        <div
          ref={logRef}
          className="bg-[#FAFAFA] border border-[#E3E3E3] rounded-lg p-4 max-h-[240px] overflow-y-auto font-mono text-[13px] text-[#333333] space-y-1"
        >
          {logLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* ── DROP ZONE ──────────────────────────────────────────── */}
      {!importing && !done && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
            style={{
              height: 240,
              border: `2px dashed ${dragOver ? '#4D148C' : '#E3E3E3'}`,
              borderRadius: 16,
              background: dragOver ? 'rgba(77,20,140,0.04)' : '#FAFAFA',
            }}
          >
            <Upload className="h-12 w-12 mb-3" style={{ color: dragOver ? '#4D148C' : '#8E8E8E' }} />
            <div className="text-[16px] font-semibold text-[#333333]">Drop Paradox HTML files here</div>
            <div className="text-[13px] text-[#8E8E8E] mt-1">or click to browse files</div>
            <div className="text-[12px] text-[#8E8E8E] mt-2">Supports multiple files — all formats accepted</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            multiple
            hidden
            onChange={handleFileSelect}
          />
        </>
      )}

      {/* ── PREVIEW TABLE ──────────────────────────────────────── */}
      {files.length > 0 && !importing && !done && (
        <div className="space-y-4">
          <CandidateRowsTableShell
            toolbar={
              <h2 className="text-[20px] font-bold text-[#333333]">
                Ready to Import — {files.length} candidate{files.length !== 1 ? 's' : ''}
              </h2>
            }
            footer={
              <div className={candidateRowsCardFooterClass}>
                <span>
                  {files.length} file{files.length !== 1 ? 's' : ''} in queue
                </span>
                <span className="text-[12px]">
                  <span className="text-[#008A00]">{readyCount} ready</span>
                  <span className="mx-2 text-[#E3E3E3]">·</span>
                  <span className="text-[#F7B118]">
                    {warningCount} warning{warningCount !== 1 ? 's' : ''}
                  </span>
                  <span className="mx-2 text-[#E3E3E3]">·</span>
                  <span className="text-[#DE002E]">
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </span>
                </span>
              </div>
            }
          >
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className={candidateRowsTableHeadRowClass}>
                  <th className={cn(candidateRowsTableThClass, 'w-[50px]')}>Status</th>
                  <th className={candidateRowsTableThClass}>Filename</th>
                  <th className={candidateRowsTableThClass}>Candidate ID</th>
                  <th className={candidateRowsTableThClass}>Name</th>
                  <th className={candidateRowsTableThClass}>Email</th>
                  <th className={candidateRowsTableThClass}>Total Hours</th>
                  <th className={candidateRowsTableThClass}>Last Employer</th>
                  <th className={cn(candidateRowsTableThClass, 'w-[100px] text-right')}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={candidateRowsTableBodyClass}>
                {files.map((f) => (
                  <tr key={f.id} className={candidateRowsTableTrClass}>
                    <td className={candidateRowsTableTdClass}>
                      <StatusIcon status={f.status} />
                    </td>
                    <td
                      className={cn(candidateRowsTableTdClass, 'max-w-[200px] truncate text-[13px] text-[#333333]')}
                      title={f.file.name}
                    >
                      {f.file.name}
                    </td>
                    <td className={cn(candidateRowsTableTdClass, 'font-mono text-[13px] text-[#333333]')}>
                      {f.editing ? (
                        <Input
                          value={f.editCandidateId}
                          onChange={(e) =>
                            setFiles((prev) =>
                              prev.map((x) =>
                                x.id === f.id ? { ...x, editCandidateId: e.target.value } : x
                              )
                            )
                          }
                          className="h-8 w-[120px] text-[13px] font-mono"
                          placeholder="Enter ID"
                        />
                      ) : (
                        f.candidateId || (
                          <span className="text-[12px] text-[#DE002E]">No ID found</span>
                        )
                      )}
                    </td>
                    <td className={cn(candidateRowsTableTdClass, 'text-[13px] text-[#333333]')}>
                      {f.parsed?.name || '—'}
                    </td>
                    <td className={cn(candidateRowsTableTdClass, 'text-[13px] text-[#333333]')}>
                      {f.editing ? (
                        <Input
                          value={f.editEmail}
                          onChange={(e) =>
                            setFiles((prev) =>
                              prev.map((x) =>
                                x.id === f.id ? { ...x, editEmail: e.target.value } : x
                              )
                            )
                          }
                          className="h-8 w-[180px] text-[13px]"
                          placeholder="email@example.com"
                        />
                      ) : (
                        f.parsed?.email || (
                          <span className="text-[12px] text-[#F7B118]">Not found</span>
                        )
                      )}
                    </td>
                    <td className={cn(candidateRowsTableTdClass, 'text-[13px] text-[#333333]')}>
                      {f.parsed?.flightTime.total
                        ? f.parsed.flightTime.total.toLocaleString()
                        : '—'}
                    </td>
                    <td className={cn(candidateRowsTableTdClass, 'text-[13px] text-[#333333]')}>
                      {f.parsed?.lastEmployer.company || '—'}
                    </td>
                    <td className={cn(candidateRowsTableTdClass, 'space-x-1 text-right')}>
                      <button
                        type="button"
                        onClick={() => toggleEdit(f.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E3E3E3] text-[#565656] transition-colors hover:border-[#4D148C] hover:text-[#4D148C]"
                        title={f.editing ? 'Save' : 'Edit'}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E3E3E3] text-[#565656] transition-colors hover:border-[#DE002E] hover:text-[#DE002E]"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CandidateRowsTableShell>

          {/* Import button */}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={importableCount === 0}
            className="w-full h-[52px] rounded-lg text-[16px] font-bold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)' }}
          >
            Import All Candidates
          </button>
        </div>
      )}

      {/* ── CONFIRMATION DIALOG ────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#333333]">Confirm Import</DialogTitle>
          </DialogHeader>
          <div className="text-[14px] text-[#333333] space-y-3">
            <p>You are about to import <strong>{importableCount}</strong> candidate record{importableCount !== 1 ? 's' : ''} to Firestore.</p>
            <div className="space-y-1.5 text-[13px]">
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#008A00]" /> Create legacyData records</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#008A00]" /> Create candidateIds records</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#008A00]" /> NOT overwrite existing records</div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="border-[#E3E3E3] text-[#565656]">
              Cancel
            </Button>
            <button
              onClick={runImport}
              className="inline-flex items-center rounded-lg px-5 py-2.5 text-[14px] font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)' }}
            >
              Continue
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={startAllOpen} onOpenChange={setStartAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#333333]">Start all flows?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#565656]">
              Start candidate flow for all {importedCount} imported candidates?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={startAllBusy} className="border-[#E3E3E3] text-[#565656]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void runStartAllFlows();
              }}
              disabled={startAllBusy}
              className="text-white border-0"
              style={{ background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)' }}
            >
              {startAllBusy ? 'Starting…' : 'Start all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
