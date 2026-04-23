'use client';

// INITIAL SETUP: Manually create `authorizedAdmins` docs (doc ID = lowercased email), or use
// "Initialize Default Admins" on Developer Tools when the collection is empty.
// Staff self-signup requires a matching active row (role admin or dev); there is no hard-coded bootstrap email.
//
// DevTools API routes (`/api/admin/devtools/*`, delete-auth-user, etc.) expect `Authorization: Bearer <Firebase ID token>`
// for a user whose Firestore `users/{uid}.role` is `dev` (see `verifyDevToolsAccess` in firebase-admin.ts).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, type Auth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import type { ApplicantData } from '@/lib/types';
import { canAccessDevTools } from '@/lib/roles';
import { AdminAccessManagement } from '@/components/admin/devtools/admin-access-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  extractCandidateIdFromFilename,
  parseParadoxHTMLString,
} from '@/lib/paradox-html-parser';
import { Loader2, RefreshCw, Copy, Mail } from 'lucide-react';
import { testEmailDelivery } from '@/app/admin/devtools/email-test-actions';

type CandidateRow = {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  flowStatus?: string;
  assignedUid?: string;
};

type FindPreview = {
  uid: string | null;
  userEmail: string | null;
  candidateId: string;
  candidateIdsExists: boolean;
  legacyExists: boolean;
  pendingExists: boolean;
  authExists: boolean | null;
  auditCount: number | null;
  mailCount: number | null;
};

async function devtoolsJson<T>(url: string, idToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...init?.headers,
    },
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || res.statusText);
  }
  return json as T;
}

const DEVTOOLS_SECONDARY_APP = 'devtools-create-test-user';

/** Secondary Firebase app so createUserWithEmailAndPassword does not replace the admin session. */
function getDevToolsSecondaryAuth(): Auth {
  let app: FirebaseApp;
  try {
    app = getApp(DEVTOOLS_SECONDARY_APP);
  } catch {
    app = initializeApp(firebaseConfig, DEVTOOLS_SECONDARY_APP);
  }
  return getAuth(app);
}

export function DevToolsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const [userData, setUserData] = useState<ApplicantData | null>(null);

  useEffect(() => {
    document.title = 'Developer Tools | Admin';
  }, []);

  useEffect(() => {
    if (!user || !firestore) return;
    const unsub = onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
      setUserData(snap.exists() ? ({ uid: snap.id, ...snap.data() } as ApplicantData) : null);
    });
    return () => unsub();
  }, [user, firestore]);

  const access = canAccessDevTools(userData ?? undefined);
  useEffect(() => {
    if (userData === null && user) return;
    if (user && userData && !access) {
      router.replace('/admin');
    }
  }, [user, userData, access, router]);

  const idToken = useCallback(async () => {
    if (!user) throw new Error('Not signed in');
    return user.getIdToken();
  }, [user]);

  const [emailInput, setEmailInput] = useState('');
  const [cidInput, setCidInput] = useState('');
  const [findLoading, setFindLoading] = useState(false);
  const [preview, setPreview] = useState<FindPreview | null>(null);
  const [findError, setFindError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSummary, setResetSummary] = useState<string[] | null>(null);

  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [legacyMap, setLegacyMap] = useState<Record<string, boolean>>({});
  const [authMap, setAuthMap] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [htmlDrag, setHtmlDrag] = useState(false);
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [htmlParsed, setHtmlParsed] = useState<ReturnType<typeof parseParadoxHTMLString> | null>(
    null
  );
  const [htmlCid, setHtmlCid] = useState<string | null>(null);
  const [htmlBusy, setHtmlBusy] = useState(false);
  const [htmlMsg, setHtmlMsg] = useState<string | null>(null);

  const [tuEmail, setTuEmail] = useState(() => `test+${Date.now()}@gmail.com`);
  const [tuPass, setTuPass] = useState('TestPassword123!');
  const [tuCid, setTuCid] = useState('');
  const [tuBusy, setTuBusy] = useState(false);
  const [tuMsg, setTuMsg] = useState<string | null>(null);
  const [tuCreds, setTuCreds] = useState<string | null>(null);

  const [snapshotSizes, setSnapshotSizes] = useState({
    users: 0,
    legacy: 0,
    audit: 0,
    mail: 0,
  });
  const [authCount, setAuthCount] = useState<number | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [nukeOpen, setNukeOpen] = useState(false);
  const [nukePhrase, setNukePhrase] = useState('');
  const [nukeBusy, setNukeBusy] = useState(false);

  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [testEmailBusy, setTestEmailBusy] = useState<string | null>(null);
  const [testEmailMsg, setTestEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const runTestEmail = async (type: 'flow_started' | 'submission' | 'indoctrination') => {
    if (!testEmailAddr.trim()) {
      setTestEmailMsg({ type: 'error', text: 'Please enter a target email address.' });
      return;
    }
    setTestEmailBusy(type);
    setTestEmailMsg(null);
    try {
      const token = await idToken();
      await testEmailDelivery({ idToken: token, targetEmail: testEmailAddr.trim(), templateType: type });
      setTestEmailMsg({ type: 'success', text: `Successfully queued ${type} email to ${testEmailAddr.trim()}! Please check your inbox (it may take 30-60 seconds to arrive).` });
    } catch (e) {
      setTestEmailMsg({ type: 'error', text: e instanceof Error ? e.message : 'Failed to queue email' });
    } finally {
      setTestEmailBusy(null);
    }
  };

  const runFind = async () => {
    if (!firestore) return;
    setFindLoading(true);
    setFindError(null);
    setPreview(null);
    setResetSummary(null);
    try {
      const email = emailInput.trim().toLowerCase();
      const candidateId = cidInput.trim().toUpperCase();
      if (!email || !candidateId) {
        setFindError('Enter email and Candidate ID.');
        return;
      }

      const uq = query(collection(firestore, 'users'), where('email', '==', email));
      const uSnap = await getDocs(uq);
      const userDoc = uSnap.docs[0];
      const uid = userDoc?.id ?? null;
      const userEmail = userDoc ? ((userDoc.data().email as string) ?? email) : null;

      const candRef = doc(firestore, 'candidateIds', candidateId);
      const candSnap = await getDoc(candRef);

      let pendingExists = false;
      if (uid) {
        const pSnap = await getDoc(doc(firestore, 'pendingVerifications', uid));
        pendingExists = pSnap.exists();
      }

      const legacySnap = await getDoc(doc(firestore, 'legacyData', candidateId));
      const legacyExists = legacySnap.exists();

      const token = await idToken();
      let authExists: boolean | null = null;
      try {
        const lookup = await devtoolsJson<Record<string, boolean>>(
          '/api/admin/devtools/auth-lookup',
          token,
          {
            method: 'POST',
            body: JSON.stringify({ emails: [email] }),
          }
        );
        authExists = lookup[email] === true;
      } catch {
        authExists = null;
      }

      let auditCount: number | null = null;
      try {
        const aq = query(collection(firestore, 'auditLog'), where('candidateId', '==', candidateId));
        const ac = await getCountFromServer(aq);
        auditCount = ac.data().count;
      } catch {
        auditCount = null;
      }

      let mailCount: number | null = null;
      try {
        const mq = query(collection(firestore, 'mail'), where('candidateId', '==', candidateId));
        const mc = await getCountFromServer(mq);
        mailCount = mc.data().count;
      } catch {
        mailCount = null;
      }

      setPreview({
        uid,
        userEmail,
        candidateId,
        candidateIdsExists: candSnap.exists(),
        legacyExists,
        pendingExists,
        authExists,
        auditCount,
        mailCount,
      });
    } catch (e) {
      setFindError(e instanceof Error ? e.message : 'Find failed');
    } finally {
      setFindLoading(false);
    }
  };

  const runSingleReset = async () => {
    if (!firestore || !preview?.uid || !preview.userEmail) return;
    if (confirmEmail.trim().toLowerCase() !== preview.userEmail.trim().toLowerCase()) return;
    setResetBusy(true);
    setResetSummary(null);
    const lines: string[] = [];
    try {
      const token = await idToken();
      const cid = preview.candidateId;
      const uid = preview.uid;

      await deleteDoc(doc(firestore, 'users', uid));
      lines.push('✅ User document deleted');

      try {
        await deleteDoc(doc(firestore, 'candidateIds', cid));
        lines.push('✅ candidateIds document deleted');
      } catch {
        lines.push('⚠ candidateIds skipped (none or already removed)');
      }

      try {
        await deleteDoc(doc(firestore, 'legacyData', cid));
        lines.push('✅ Legacy data deleted');
      } catch {
        lines.push('⚠ Legacy data skipped (none or already removed)');
      }

      try {
        await deleteDoc(doc(firestore, 'pendingVerifications', uid));
      } catch {
        /* ignore if not found */
      }

      await devtoolsJson('/api/admin/delete-auth-user', token, {
        method: 'DELETE',
        body: JSON.stringify({ uid }),
      });
      lines.push('✅ Auth account deleted');

      lines.push('✅ Ready for fresh test');
      setResetSummary(lines);
      setResetOpen(false);
      setConfirmEmail('');
      setPreview(null);
      router.refresh();
    } catch (e) {
      setResetSummary([`❌ Error: ${e instanceof Error ? e.message : 'failed'}`]);
    } finally {
      setResetBusy(false);
    }
  };

  useEffect(() => {
    if (!firestore) return;
    const unsub = onSnapshot(query(collection(firestore, 'candidateIds')), (snap) => {
      setCandidates(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        })) as CandidateRow[]
      );
    });
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    if (!firestore || !candidates.length) return;
    (async () => {
      const next: Record<string, boolean> = {};
      const chunk = candidates.slice(0, 300);
      await Promise.all(
        chunk.map(async (c) => {
          const s = await getDoc(doc(firestore, 'legacyData', c.id));
          next[c.id] = s.exists();
        })
      );
      setLegacyMap(next);
    })();
  }, [candidates, firestore]);

  useEffect(() => {
    if (!candidates.length) return;
    (async () => {
      try {
        const token = await idToken();
        const emails = candidates
          .map((c) => String(c.email || '').trim().toLowerCase())
          .filter(Boolean);
        const unique = [...new Set(emails)];
        const chunks: string[][] = [];
        for (let i = 0; i < unique.length; i += 40) chunks.push(unique.slice(i, i + 40));
        const map: Record<string, boolean> = {};
        for (const ch of chunks) {
          const res = await devtoolsJson<Record<string, boolean>>(
            '/api/admin/devtools/auth-lookup',
            token,
            {
              method: 'POST',
              body: JSON.stringify({ emails: ch }),
            }
          );
          Object.assign(map, res);
        }
        setAuthMap(map);
      } catch {
        setAuthMap({});
      }
    })();
  }, [candidates, idToken]);

  const allSelected = candidates.length > 0 && selected.size === candidates.length;
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const runBulkReset = async () => {
    if (!firestore) return;
    setBulkBusy(true);
    setBulkLog([]);
    const token = await idToken();
    const ids = [...selected];
    const lines: string[] = [];
    try {
      for (const id of ids) {
        const row = candidates.find((c) => c.id === id);
        const name = row?.name || id;
        try {
          const assignedUid = row?.assignedUid?.trim();
          if (assignedUid) {
            try {
              await deleteDoc(doc(firestore, 'users', assignedUid));
            } catch {
              /* ignore */
            }
            try {
              await deleteDoc(doc(firestore, 'pendingVerifications', assignedUid));
            } catch {
              /* ignore */
            }
            try {
              await devtoolsJson('/api/admin/delete-auth-user', token, {
                method: 'DELETE',
                body: JSON.stringify({ uid: assignedUid }),
              });
            } catch {
              /* ignore */
            }
          }
          try {
            await deleteDoc(doc(firestore, 'candidateIds', id));
          } catch {
            /* ignore */
          }
          try {
            await deleteDoc(doc(firestore, 'legacyData', id));
          } catch {
            /* ignore */
          }
          lines.push(`Deleting ${name}... ✅`);
        } catch (e) {
          lines.push(`Deleting ${name}... ❌ ${e instanceof Error ? e.message : 'failed'}`);
        }
        setBulkLog([...lines]);
      }
      router.refresh();
    } finally {
      setBulkBusy(false);
      setBulkOpen(false);
      setSelected(new Set());
    }
  };

  const onHtmlDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setHtmlDrag(false);
    const f = e.dataTransfer.files[0];
    if (!f?.name.endsWith('.html')) {
      setHtmlMsg('Please drop a single .html file.');
      return;
    }
    setHtmlFile(f);
    const cid = extractCandidateIdFromFilename(f.name);
    setHtmlCid(cid);
    const text = await f.text();
    try {
      setHtmlParsed(parseParadoxHTMLString(text));
      setHtmlMsg(null);
    } catch {
      setHtmlParsed(null);
      setHtmlMsg('Could not parse HTML.');
    }
  };

  const runHtmlImport = async () => {
    if (!firestore || !htmlParsed || !htmlCid) return;
    setHtmlBusy(true);
    setHtmlMsg(null);
    try {
      const cid = htmlCid.trim();
      const data = htmlParsed;
      await setDoc(
        doc(firestore, 'legacyData', cid),
        {
          candidateId: cid,
          name: data.name,
          email: data.email,
          importedAt: new Date().toISOString(),
          source: 'devtools-reimport',
          flightTime: data.flightTime,
          lastEmployer: data.lastEmployer,
          lastResidence: data.lastResidence,
          aeronautical: data.aeronautical,
        },
        { merge: true }
      );
      const cref = doc(firestore, 'candidateIds', cid);
      const ex = await getDoc(cref);
      if (!ex.exists()) {
        await setDoc(cref, {
          candidateId: cid,
          name: data.name || '',
          email: data.email || '',
          legacyApplicationId: cid,
          status: 'unassigned',
          assignedUid: '',
          masterKey: false,
          claimedAt: '',
          createdAt: serverTimestamp(),
          source: 'devtools',
          flowStatus: 'imported',
          flowStatusUpdatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(
          cref,
          {
            legacyApplicationId: cid,
            name: data.name || (ex.data()?.name as string) || '',
            email: data.email || (ex.data()?.email as string) || '',
            flowStatusUpdatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      setHtmlMsg('Import successful.');
    } catch (e) {
      setHtmlMsg(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setHtmlBusy(false);
    }
  };

  const runCreateTestUser = async () => {
    if (!firestore) return;
    const email = tuEmail.trim();
    const password = tuPass;
    const candidateId = tuCid.trim();
    if (!email || !password || !candidateId) {
      setTuMsg('Email, password, and Candidate ID are required.');
      return;
    }
    setTuBusy(true);
    setTuMsg(null);
    setTuCreds(null);
    try {
      const secondaryAuth = getDevToolsSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = cred.user.uid;
      await signOut(secondaryAuth);

      const emptySafety: { answer: 'yes' | 'no' | null; explanation: string | null } = {
        answer: null,
        explanation: null,
      };
      await setDoc(doc(firestore, 'users', newUid), {
        uid: newUid,
        email,
        firstName: 'Test',
        lastName: 'User',
        createdAt: serverTimestamp(),
        role: 'candidate',
        isAdmin: false,
        status: 'verified',
        verifiedAt: serverTimestamp(),
        candidateId,
        firstClassMedicalDate: null,
        atpNumber: null,
        flightTime: {
          total: 0,
          turbinePic: 0,
          military: 0,
          civilian: 0,
          multiEngine: 0,
          instructor: 0,
          evaluator: 0,
          sic: 0,
          other: 0,
          nightHours: 0,
          lastAircraftFlown: '',
          dateLastFlown: '',
        },
        typeRatings: '',
        employmentHistory: [],
        safetyQuestions: {
          terminations: emptySafety,
          askedToResign: emptySafety,
          accidents: emptySafety,
          incidents: emptySafety,
          flightViolations: emptySafety,
          certificateAction: emptySafety,
          pendingFaaAction: emptySafety,
          failedCheckRide: emptySafety,
          formalDiscipline: emptySafety,
          investigationBoard: emptySafety,
          previousInterview: emptySafety,
          trainingCommitmentConflict: emptySafety,
          otherInfo: emptySafety,
        },
        submittedAt: null,
        isCertified: false,
        printedName: null,
        consentGiven: true,
        consentTimestamp: serverTimestamp(),
        consentVersion: '1.0',
        privacyPolicyVersion: 'March 2026',
        candidateFlowStatus: 'registered',
      });

      await setDoc(
        doc(firestore, 'candidateIds', candidateId),
        {
          candidateId,
          name: 'Test User',
          email,
          legacyApplicationId: candidateId,
          status: 'claimed',
          assignedUid: newUid,
          masterKey: false,
          claimedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          source: 'devtools-test-user',
          flowStatus: 'verified',
          flowStatusUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setTuMsg(`Account created — login with ${email} / ${password}`);
      setTuCreds(`${email} / ${password}`);
    } catch (e) {
      setTuMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTuBusy(false);
    }
  };

  useEffect(() => {
    if (!firestore) return;
    const unsubs = [
      onSnapshot(collection(firestore, 'users'), (s) =>
        setSnapshotSizes((prev) => ({ ...prev, users: s.size }))
      ),
      onSnapshot(collection(firestore, 'legacyData'), (s) =>
        setSnapshotSizes((prev) => ({ ...prev, legacy: s.size }))
      ),
      onSnapshot(collection(firestore, 'auditLog'), (s) =>
        setSnapshotSizes((prev) => ({ ...prev, audit: s.size }))
      ),
      onSnapshot(collection(firestore, 'mail'), (s) =>
        setSnapshotSizes((prev) => ({ ...prev, mail: s.size }))
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [firestore]);

  const refreshAuthCount = useCallback(async () => {
    if (!user) return;
    setCountsLoading(true);
    try {
      const token = await idToken();
      const res = await fetch('/api/admin/devtools/auth-users-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { count?: number; error?: string };
      if (res.ok && typeof json.count === 'number') setAuthCount(json.count);
      else setAuthCount(null);
    } catch {
      setAuthCount(null);
    } finally {
      setCountsLoading(false);
    }
  }, [user, idToken]);

  useEffect(() => {
    void refreshAuthCount();
  }, [refreshAuthCount]);

  const displayCounts = useMemo(
    () => ({
      users: snapshotSizes.users,
      candidateIds: candidates.length,
      unassigned: candidates.filter((c) => c.status === 'unassigned').length,
      claimed: candidates.filter((c) => c.status === 'claimed').length,
      submitted: candidates.filter((c) => (c.flowStatus || '') === 'submitted').length,
      legacy: snapshotSizes.legacy,
      audit: snapshotSizes.audit,
      mail: snapshotSizes.mail,
      auth: authCount,
    }),
    [candidates, snapshotSizes, authCount]
  );

  const runNuke = async () => {
    if (nukePhrase !== 'DELETE ALL') return;
    setNukeBusy(true);
    try {
      const token = await idToken();
      await devtoolsJson('/api/admin/devtools/nuke', token, {
        method: 'POST',
        body: JSON.stringify({ confirmPhrase: 'DELETE ALL' }),
      });
      setNukeOpen(false);
      setNukePhrase('');
      await refreshAuthCount();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nuke failed');
    } finally {
      setNukeBusy(false);
    }
  };

  const isProdBuild = process.env.NODE_ENV === 'production';

  if (!user || !userData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#8E8E8E]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!access) {
    return null;
  }

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-[28px] font-bold text-[#333333]">Developer Tools</h1>
        <p className="mt-1 text-[14px] text-[#8E8E8E]">
          Pre-authorized admin list, test resets, and destructive utilities — for accounts with the Developer role
          only.
          {isProdBuild ? (
            <span className="ml-2 font-semibold text-[#565656]">(production: developer role required.)</span>
          ) : null}
        </p>
      </div>

      <AdminAccessManagement />

      <div
        className="text-sm font-medium text-[#333333]"
        style={{
          background: 'rgba(222,0,46,0.08)',
          border: '2px solid #DE002E',
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        ⚠ DEVELOPER USE ONLY — These actions permanently delete data and cannot be undone. Do not use in
        production.
      </div>

      {/* Section 1 */}
      <Card className="border-[#E3E3E3]">
        <CardHeader>
          <CardTitle>Delete Single Candidate</CardTitle>
          <CardDescription>
            Permanently remove their user doc, candidateIds doc, legacy data, pending verification, and Auth
            account for fresh testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="candidate@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Candidate ID</Label>
              <Input
                placeholder="e.g. 68803308"
                value={cidInput}
                onChange={(e) => setCidInput(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={runFind} disabled={findLoading}>
            {findLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Find Candidate
          </Button>
          {findError && <p className="text-sm font-semibold text-[#DE002E]">{findError}</p>}

          {preview && (
            <div
              className="space-y-1 rounded-lg border border-[#E3E3E3] bg-[#FAFAFA] p-4 text-sm"
              data-testid="find-preview"
            >
              <div>
                User document: {preview.uid ?? '—'} — {preview.userEmail ?? '—'}
              </div>
              <div>candidateIds record: {preview.candidateId}</div>
              <div>legacyData record: {preview.candidateId}</div>
              <div>pendingVerifications: {preview.pendingExists ? 'found' : 'not found'}</div>
              <div>
                Firebase Auth account:{' '}
                {preview.authExists === null ? 'unknown' : preview.authExists ? 'found' : 'not found'}
              </div>
              <div>auditLog entries: {preview.auditCount ?? '—'} entries</div>
              <div>mail entries: {preview.mailCount ?? '—'} emails</div>
            </div>
          )}

          {preview?.uid && (
            <Button
              type="button"
              style={{ background: '#DE002E', color: 'white' }}
              onClick={() => {
                setConfirmEmail('');
                setResetOpen(true);
              }}
            >
              Delete This Candidate
            </Button>
          )}

          {resetSummary && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#008A00]">
              {resetSummary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm permanent deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-[#333333]">
            <p>This will permanently delete:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>users/{'{uid}'} document</li>
              <li>candidateIds/{'{candidateId}'} document (deleted from Firestore)</li>
              <li>legacyData/{'{candidateId}'}</li>
              <li>pendingVerifications/{'{uid}'}</li>
              <li>Firebase Auth account</li>
            </ul>
            <p className="pt-2 font-semibold">Type the candidate email to confirm:</p>
            <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder="Email" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              style={{ background: '#DE002E', color: 'white' }}
              disabled={
                resetBusy ||
                !preview?.userEmail ||
                confirmEmail.trim().toLowerCase() !== preview.userEmail.trim().toLowerCase()
              }
              onClick={runSingleReset}
            >
              {resetBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section 2 */}
      <Card className="border-[#E3E3E3]">
        <CardHeader>
          <CardTitle>Bulk Delete Candidates</CardTitle>
          <CardDescription>Delete multiple test candidates from Firestore and Auth at once</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[420px] overflow-x-auto rounded-md border border-[#E3E3E3]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => {
                        if (v === true) setSelected(new Set(candidates.map((c) => c.id)));
                        else setSelected(new Set());
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Candidate ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Has Legacy Data</TableHead>
                  <TableHead>Has Auth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.id}</TableCell>
                    <TableCell>{c.name || '—'}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{c.email || '—'}</TableCell>
                    <TableCell>{c.status || '—'}</TableCell>
                    <TableCell>{legacyMap[c.id] ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      {c.email
                        ? authMap[String(c.email).trim().toLowerCase()] === true
                          ? 'Yes'
                          : authMap[String(c.email).trim().toLowerCase()] === false
                            ? 'No'
                            : '—'
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              style={{ background: '#DE002E', color: 'white' }}
              disabled={selected.size === 0 || bulkBusy}
              onClick={() => setBulkOpen(true)}
            >
              Delete {selected.size} candidate{selected.size === 1 ? '' : 's'}
            </Button>
            {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {bulkLog.length > 0 && (
            <pre className="whitespace-pre-wrap rounded border border-[#E3E3E3] bg-[#FAFAFA] p-3 text-xs">
              {bulkLog.join('\n')}
            </pre>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} candidates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete their user documents, candidateIds documents, legacyData documents, and Firebase
              Auth accounts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runBulkReset}>Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Section 3 */}
      <Card className="border-[#E3E3E3]">
        <CardHeader>
          <CardTitle>Re-Import HTML File</CardTitle>
          <CardDescription>Upload a single Paradox HTML file to recreate legacy data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setHtmlDrag(true);
            }}
            onDragLeave={() => setHtmlDrag(false)}
            onDrop={onHtmlDrop}
            className="flex items-center justify-center rounded-xl border-2 border-dashed text-sm text-[#565656]"
            style={{
              height: 120,
              borderColor: htmlDrag ? '#4D148C' : '#E3E3E3',
              background: htmlDrag ? 'rgba(77,20,140,0.06)' : '#FAFAFA',
            }}
          >
            Drop one .html file here
          </div>
          {htmlFile && (
            <p className="text-xs text-[#565656]">
              File: {htmlFile.name} — candidateId from filename: {htmlCid ?? '—'}
            </p>
          )}
          {htmlParsed && (
            <div className="space-y-1 rounded border border-[#E3E3E3] bg-white p-3 text-sm">
              <div>Name: {htmlParsed.name}</div>
              <div>ID: {htmlCid}</div>
              <div>Email: {htmlParsed.email}</div>
              <div>Total hours: {htmlParsed.flightTime.total}</div>
            </div>
          )}
          <Button type="button" onClick={runHtmlImport} disabled={htmlBusy || !htmlParsed || !htmlCid}>
            {htmlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Import This File
          </Button>
          {htmlMsg && <p className="text-sm font-medium text-[#008A00]">{htmlMsg}</p>}
        </CardContent>
      </Card>

      {/* Section 4 */}
      <Card className="border-[#E3E3E3]">
        <CardHeader>
          <CardTitle>Create Test Account</CardTitle>
          <CardDescription>
            Quickly create a Firebase Auth account for testing using the client SDK (secondary Firebase app keeps your
            admin session signed in).
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={tuEmail} onChange={(e) => setTuEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input value={tuPass} onChange={(e) => setTuPass(e.target.value)} type="password" />
          </div>
          <div className="space-y-2">
            <Label>Candidate ID to link</Label>
            <Input value={tuCid} onChange={(e) => setTuCid(e.target.value)} placeholder="e.g. 68803308" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runCreateTestUser} disabled={tuBusy}>
              {tuBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>
          </div>
          {tuMsg && <p className="text-sm text-[#333333]">{tuMsg}</p>}
          {tuCreds && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void navigator.clipboard.writeText(tuCreds)}
            >
              <Copy className="h-4 w-4" />
              Copy credentials
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section: Email Delivery Testing */}
      <Card className="border-[#E3E3E3]">
        <CardHeader>
          <CardTitle>Email Delivery Testing</CardTitle>
          <CardDescription>
            Send identical production-ready emails directly to your own inbox to verify deliverability and layout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label>Target Email Address</Label>
            <Input 
              type="email" 
              placeholder="you@example.com" 
              value={testEmailAddr} 
              onChange={(e) => setTestEmailAddr(e.target.value)} 
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row flex-wrap">
            <Button 
              type="button" 
              variant="outline"
              disabled={testEmailBusy !== null}
              onClick={() => runTestEmail('flow_started')}
              className="bg-white border-[#4D148C] text-[#4D148C] hover:bg-[#4D148C]/5"
            >
              {testEmailBusy === 'flow_started' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Flow Started Email
            </Button>
            <Button 
              type="button" 
              variant="outline"
              disabled={testEmailBusy !== null}
              onClick={() => runTestEmail('submission')}
              className="bg-white border-[#4D148C] text-[#4D148C] hover:bg-[#4D148C]/5"
            >
              {testEmailBusy === 'submission' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Application Submitted Email
            </Button>
            <Button 
              type="button" 
              variant="outline"
              disabled={testEmailBusy !== null}
              onClick={() => runTestEmail('indoctrination')}
              className="bg-white border-[#4D148C] text-[#4D148C] hover:bg-[#4D148C]/5"
            >
              {testEmailBusy === 'indoctrination' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Indoc Invite Email
            </Button>
          </div>
          {testEmailMsg && (
            <p className={`text-sm font-medium ${testEmailMsg.type === 'success' ? 'text-[#008A00]' : 'text-[#DE002E]'}`}>
              {testEmailMsg.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 5 */}
      <Card className="border-[#E3E3E3]">
        <CardHeader>
          <CardTitle>Current Test State</CardTitle>
          <CardDescription>Live count of all collections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-xs text-[#8E8E8E]">
            Firestore totals use real-time listeners; candidateIds breakdown follows the table snapshot. Firebase
            Auth total refreshes on demand.
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void refreshAuthCount()} disabled={countsLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${countsLoading ? 'animate-spin' : ''}`} />
            Refresh Auth user count
          </Button>
          <ul className="space-y-1 text-[#333333]">
            <li>users collection: {displayCounts.users} documents</li>
            <li>
              candidateIds: {displayCounts.candidateIds} total — unassigned: {displayCounts.unassigned}, claimed:{' '}
              {displayCounts.claimed}, submitted: {displayCounts.submitted}
            </li>
            <li>legacyData: {displayCounts.legacy} documents</li>
            <li>auditLog: {displayCounts.audit} entries</li>
            <li>mail: {displayCounts.mail} emails</li>
            <li>Firebase Auth users: {displayCounts.auth ?? '—'} (via API)</li>
          </ul>

          <div className="space-y-3 border-t border-[#E3E3E3] pt-8">
            <Label className="font-bold text-[#DE002E]">⚠ DELETE ALL TEST DATA</Label>
            <Input
              placeholder='Type "DELETE ALL" to enable'
              value={nukePhrase}
              onChange={(e) => setNukePhrase(e.target.value)}
            />
            <Button
              type="button"
              disabled={nukePhrase !== 'DELETE ALL' || nukeBusy}
              onClick={() => setNukeOpen(true)}
              className="font-bold"
              style={{
                background: 'black',
                color: '#DE002E',
                border: '2px solid #DE002E',
              }}
            >
              ⚠ DELETE ALL TEST DATA
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={nukeOpen} onOpenChange={setNukeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all test data?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes users (except your session user), legacyData, pendingVerifications, mail, the entire
              candidateIds collection, and deletes other Firebase Auth users. It does not delete auditLog or
              interview collections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runNuke} className="border-2 border-[#DE002E] bg-black text-[#DE002E]">
              {nukeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
