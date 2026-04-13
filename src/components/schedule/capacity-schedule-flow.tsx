'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format, startOfDay } from 'date-fns';
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
} from 'firebase/firestore';
import { Brain, CheckCircle2, Loader2, Video } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import type {
  ApplicantData,
  CandidateFlowStatus,
  IndoctrinationSessionDoc,
  TestingSessionDoc,
  TestingSessionKind,
} from '@/lib/types';
import {
  canBookIndoctrinationSession,
  canBookTestingSession,
  hasIndoctrinationBooking,
  hasTestingBooking,
} from '@/lib/scheduling-eligibility';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';

type Variant = 'testing' | 'indoctrination';

type TestingRow = TestingSessionDoc & { id: string };
type IndoctrinationRow = IndoctrinationSessionDoc & { id: string };

type CandidateIdsRow = {
  flowStatus?: string | null;
  testingSessionId?: string | null;
  indoctrinationSessionId?: string | null;
  testingBookedAt?: unknown;
  indoctrinationBookedAt?: unknown;
};

function KindIcon({ kind }: { kind: TestingSessionKind }) {
  return kind === 'cognitive' ? (
    <Brain className="h-5 w-5 text-[#4D148C] shrink-0" aria-hidden />
  ) : (
    <Video className="h-5 w-5 text-[#007AB7] shrink-0" aria-hidden />
  );
}

function CapacityScheduleFlowInner({ variant }: { variant: Variant }) {
  const searchParams = useSearchParams();
  const paramCid = (searchParams.get('candidateId') || '').trim().toUpperCase();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();

  const userRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const { data: applicant, loading: appLoading } = useDoc<ApplicantData>(userRef);

  const userCid = (applicant?.candidateId || '').trim().toUpperCase();
  const cidOk = !!paramCid && !!userCid && paramCid === userCid;

  const candidateRef =
    userCid ? doc(firestore, 'candidateIds', userCid) : undefined;
  const { data: candidateRow, loading: candidateLoading } = useDoc<CandidateIdsRow>(candidateRef);
  const candidateLoadingEffective = userCid ? candidateLoading : false;

  const flowStatus = candidateRow?.flowStatus ?? applicant?.candidateFlowStatus ?? null;

  const eligible =
    variant === 'testing'
      ? canBookTestingSession(flowStatus) && !hasTestingBooking(candidateRow)
      : canBookIndoctrinationSession(flowStatus) && !hasIndoctrinationBooking(candidateRow);

  const [sessions, setSessions] = useState<(TestingRow | IndoctrinationRow)[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [pickSession, setPickSession] = useState<TestingRow | IndoctrinationRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookError, setBookError] = useState('');
  const [successDate, setSuccessDate] = useState<Date | null>(null);

  const collectionName =
    variant === 'testing' ? 'testingSessions' : 'indoctrinationSessions';
  const bookingCollection =
    variant === 'testing' ? 'testingBookings' : 'indoctrinationBookings';
  const nextFlow: CandidateFlowStatus =
    variant === 'testing' ? 'testing_scheduled' : 'indoctrination_scheduled';

  const start = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    const q = query(
      collection(firestore, collectionName),
      where('active', '==', true),
      where('date', '>=', Timestamp.fromDate(start)),
      orderBy('date')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as (TestingRow | IndoctrinationRow)[];
        setSessions(rows);
        setSessionsLoading(false);
      },
      (e) => {
        console.error(e);
        setSessionsLoading(false);
      }
    );
    return () => unsub();
  }, [firestore, collectionName, start]);

  const fullName = [applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ').trim();
  const title =
    variant === 'testing' ? 'Schedule your testing' : 'Schedule indoctrination class';
  const subtitle =
    variant === 'testing'
      ? 'Choose a cognitive or remote testing date with open seats.'
      : 'Choose a class date with open seats.';

  const confirmBook = useCallback(async () => {
    if (!user || !applicant || !pickSession || !cidOk || !candidateRef) return;
    setBookError('');
    setBookingBusy(true);
    const name = fullName || user.displayName || user.email || 'Candidate';
    const email = user.email || applicant.email || '';
    const bookingId = `${pickSession.id}_${user.uid}`;
    const sessionRef = doc(firestore, collectionName, pickSession.id);
    const bookingRef = doc(firestore, bookingCollection, bookingId);

    try {
      await runTransaction(firestore, async (tx) => {
        const sSnap = await tx.get(sessionRef);
        const bSnap = await tx.get(bookingRef);
        if (bSnap.exists()) throw new Error('ALREADY_BOOKED');
        if (!sSnap.exists()) throw new Error('SESSION_GONE');
        const data = sSnap.data() as TestingSessionDoc | IndoctrinationSessionDoc;
        if (!data.active) throw new Error('SESSION_INACTIVE');
        const booked = typeof data.bookedCount === 'number' ? data.bookedCount : 0;
        const cap = typeof data.capacity === 'number' ? data.capacity : 0;
        if (booked >= cap) throw new Error('SESSION_FULL');
        tx.update(sessionRef, {
          bookedCount: booked + 1,
          updatedAt: serverTimestamp(),
        });
        tx.set(bookingRef, {
          sessionId: pickSession.id,
          candidateUid: user.uid,
          candidateId: userCid,
          candidateName: name,
          candidateEmail: email,
          scheduledFor: data.date,
          status: 'confirmed',
          createdAt: serverTimestamp(),
        });
      });

      const sessionDate = (pickSession as TestingSessionDoc).date;
      if (variant === 'testing') {
        await updateDoc(candidateRef, {
          testingSessionId: pickSession.id,
          testingBookedAt: serverTimestamp(),
          testingSessionDate: sessionDate,
          flowStatus: nextFlow,
          flowStatusUpdatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(candidateRef, {
          indoctrinationSessionId: pickSession.id,
          indoctrinationBookedAt: serverTimestamp(),
          indoctrinationSessionDate: sessionDate,
          flowStatus: nextFlow,
          flowStatusUpdatedAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(firestore, 'users', user.uid), {
        candidateFlowStatus: nextFlow,
      });

      const d = sessionDate?.toDate?.() ?? new Date();
      setSuccessDate(d);
      setConfirmOpen(false);
      setPickSession(null);
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : '';
      const msg =
        code === 'SESSION_FULL'
          ? 'That session is full. Please pick another date.'
          : code === 'ALREADY_BOOKED'
            ? 'You already have a booking.'
            : code === 'SESSION_INACTIVE' || code === 'SESSION_GONE'
              ? 'That session is no longer available.'
              : e instanceof Error
                ? e.message
                : 'Booking failed';
      setBookError(msg);
    } finally {
      setBookingBusy(false);
    }
  }, [
    user,
    applicant,
    pickSession,
    cidOk,
    candidateRef,
    firestore,
    collectionName,
    bookingCollection,
    fullName,
    userCid,
    variant,
    nextFlow,
  ]);

  if (authLoading || (user && (appLoading || candidateLoadingEffective))) {
    return (
      <div className="light-theme min-h-screen flex items-center justify-center interior-bg">
        <Loader2 className="h-10 w-10 animate-spin text-[#4D148C]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="light-theme min-h-screen interior-bg">
        <InteriorNavbar />
        <div className="container max-w-lg mx-auto py-16 px-4 text-center">
          <p className="text-[#333333] font-semibold">Sign in to continue.</p>
          <Link href="/login" className="mt-4 inline-block text-[#4D148C] font-semibold hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (successDate) {
    return (
      <div className="light-theme min-h-screen interior-bg">
        <InteriorNavbar />
        <div className="container max-w-lg mx-auto py-16 px-4 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-[#008A00] mx-auto" />
          <h1 className="text-[26px] font-bold text-[#333333]">You&apos;re booked</h1>
          <p className="text-[#565656]">
            {format(successDate, 'EEEE, MMMM d, yyyy')}
          </p>
          <Button asChild className="fedex-btn-primary mt-4">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!cidOk) {
    return (
      <div className="light-theme min-h-screen interior-bg">
        <InteriorNavbar />
        <div className="container max-w-lg mx-auto py-16 px-4 text-center">
          <p className="text-[#333333]">Invalid scheduling link. Open this page from your dashboard.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-[#4D148C] font-semibold hover:underline">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="light-theme min-h-screen interior-bg">
        <InteriorNavbar />
        <div className="container max-w-lg mx-auto py-16 px-4 text-center space-y-3">
          <h1 className="text-[22px] font-bold text-[#333333]">{title}</h1>
          <p className="text-[#565656]">
            {variant === 'testing'
              ? 'You are not eligible to book a testing session yet, or you already have one scheduled.'
              : 'Indoctrination scheduling opens after your interview is scheduled (or when HR marks you eligible).'}
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="light-theme min-h-screen interior-bg">
      <InteriorNavbar />
      <div className="container max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-[28px] font-bold text-[#333333]">{title}</h1>
        <p className="text-[#8E8E8E] mt-1 mb-8">{subtitle}</p>

        {sessionsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-[#4D148C]" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-[#8E8E8E] py-12">
            No upcoming sessions with open seats. Check back later.
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => {
              const cap = s.capacity ?? 0;
              const booked = s.bookedCount ?? 0;
              const left = Math.max(0, cap - booked);
              const d = s.date?.toDate?.();
              const isTesting = variant === 'testing';
              const kind = isTesting ? (s as TestingRow).kind : null;
              return (
                <li
                  key={s.id}
                  className="rounded-xl border border-[#E3E3E3] bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {kind ? <KindIcon kind={kind} /> : null}
                    <div>
                      <p className="text-[16px] font-bold text-[#333333]">
                        {d ? format(d, 'EEEE, MMMM d, yyyy') : '—'}
                      </p>
                      {kind ? (
                        <p className="text-[13px] text-[#565656] capitalize mt-0.5">
                          {kind === 'cognitive' ? 'Cognitive' : 'Remote'} testing
                        </p>
                      ) : (
                        <p className="text-[13px] text-[#565656] mt-0.5">Indoctrination class</p>
                      )}
                      {s.notes ? (
                        <p className="text-[12px] text-[#8E8E8E] mt-1 line-clamp-2">{s.notes}</p>
                      ) : null}
                      <p className="text-[13px] font-semibold text-[#007AB7] mt-2">
                        {left} seat{left === 1 ? '' : 's'} left
                      </p>
                    </div>
                  </div>
                  <Button
                    className="fedex-btn-primary shrink-0"
                    disabled={left < 1}
                    onClick={() => {
                      setPickSession(s);
                      setConfirmOpen(true);
                      setBookError('');
                    }}
                  >
                    Select
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm your date</DialogTitle>
          </DialogHeader>
          {pickSession && (
            <div className="space-y-2 text-[#333333]">
              <p>
                {pickSession.date?.toDate
                  ? format(pickSession.date.toDate(), 'EEEE, MMMM d, yyyy')
                  : ''}
              </p>
              {variant === 'testing' && (
                <p className="text-[14px] text-[#565656] capitalize">
                  {(pickSession as TestingRow).kind === 'cognitive'
                    ? 'Cognitive testing'
                    : 'Remote testing'}
                </p>
              )}
              {bookError ? (
                <p className="text-sm font-semibold text-[#DE002E]">{bookError}</p>
              ) : null}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={bookingBusy}>
              Cancel
            </Button>
            <Button className="fedex-btn-primary" disabled={bookingBusy} onClick={() => void confirmBook()}>
              {bookingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CapacityScheduleFlow({ variant }: { variant: Variant }) {
  return (
    <Suspense
      fallback={
        <div className="light-theme min-h-screen flex items-center justify-center interior-bg">
          <Loader2 className="h-10 w-10 animate-spin text-[#4D148C]" />
        </div>
      }
    >
      <CapacityScheduleFlowInner variant={variant} />
    </Suspense>
  );
}
