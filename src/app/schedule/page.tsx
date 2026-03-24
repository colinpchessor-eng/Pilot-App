'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
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
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import type { ApplicantData, InterviewSlotDoc } from '@/lib/types';
import { buildInterviewIcs, downloadIcs, formatSlotTimeRange } from '@/lib/interview-utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';

type SlotRow = InterviewSlotDoc & { id: string };

type GhostSlot = SlotRow & { ghost?: boolean };

function ScheduleInterviewPageInner() {
  const searchParams = useSearchParams();
  const paramCid = (searchParams.get('candidateId') || '').trim().toUpperCase();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();

  const userRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const { data: applicant, loading: appLoading } = useDoc<ApplicantData>(userRef);

  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [ghostSlots, setGhostSlots] = useState<GhostSlot[]>([]);
  const prevSlotMapRef = useRef<Map<string, SlotRow>>(new Map());
  const selfBookedSlotIdsRef = useRef<Set<string>>(new Set());
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<SlotRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookError, setBookError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    slot: SlotRow;
    start: Date;
    end: Date;
  } | null>(null);

  const rangeEnd = useMemo(() => endOfDay(addDays(startOfDay(new Date()), 29)), []);

  useEffect(() => {
    const start = startOfDay(new Date());
    const q = query(
      collection(firestore, 'interviewSlots'),
      where('status', '==', 'available'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(rangeEnd)),
      orderBy('date')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, ...(d.data() as InterviewSlotDoc) }));
        const prev = prevSlotMapRef.current;
        const nextMap = new Map(next.map((s) => [s.id, s]));
        prev.forEach((oldSlot, id) => {
          if (selfBookedSlotIdsRef.current.has(id)) {
            selfBookedSlotIdsRef.current.delete(id);
            return;
          }
          if (!nextMap.has(id) && oldSlot.status === 'available') {
            setGhostSlots((gs) => {
              if (gs.some((g) => g.id === id)) return gs;
              return [...gs, { ...oldSlot, ghost: true }];
            });
            window.setTimeout(() => {
              setGhostSlots((gs) => gs.filter((g) => g.id !== id));
            }, 2200);
          }
        });
        prevSlotMapRef.current = nextMap;
        setSlots(next);
        setSlotsLoading(false);
      },
      (e) => {
        console.error(e);
        setSlotsLoading(false);
      }
    );
    return () => unsub();
  }, [firestore, rangeEnd]);

  const userCid = (applicant?.candidateId || '').trim().toUpperCase();
  const cidOk = !!paramCid && !!userCid && paramCid === userCid;
  const fullName = [applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ').trim();

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, SlotRow[]>();
    for (const s of slots) {
      const d = s.date?.toDate?.();
      if (!d) continue;
      const key = format(d, 'yyyy-MM-dd');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const ghostsByDate = useMemo(() => {
    const groups = new Map<string, GhostSlot[]>();
    for (const s of ghostSlots) {
      const d = s.date?.toDate?.();
      if (!d) continue;
      const key = format(d, 'yyyy-MM-dd');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return groups;
  }, [ghostSlots]);

  const confirmBook = useCallback(async () => {
    if (!user || !applicant || !bookingSlot || !cidOk) return;
    setBookError('');
    setBookingBusy(true);
    selfBookedSlotIdsRef.current.add(bookingSlot.id);
    const slotRef = doc(firestore, 'interviewSlots', bookingSlot.id);
    const candidateRef = doc(firestore, 'candidateIds', userCid);
    const name = fullName || user.displayName || user.email || 'Candidate';
    const email = user.email || applicant.email || '';

    try {
      const bookingRef = doc(collection(firestore, 'interviewBookings'));
      await runTransaction(firestore, async (tx) => {
        const slotSnap = await tx.get(slotRef);
        if (!slotSnap.exists()) throw new Error('SLOT_TAKEN');
        const data = slotSnap.data() as InterviewSlotDoc;
        if (data.status !== 'available') throw new Error('SLOT_TAKEN');
        tx.update(slotRef, {
          status: 'booked',
          bookedBy: user.uid,
          bookedByName: name,
          bookedByEmail: email,
          bookedAt: serverTimestamp(),
        });
        tx.set(bookingRef, {
          slotId: bookingSlot.id,
          candidateUid: user.uid,
          candidateId: userCid,
          candidateName: name,
          candidateEmail: email,
          adminUid: data.createdBy || '',
          scheduledFor: data.date,
          status: 'confirmed',
          createdAt: serverTimestamp(),
        });
      });

      await updateDoc(candidateRef, {
        flowStatus: 'scheduled',
        interviewDate: bookingSlot.date,
        interviewScheduledAt: serverTimestamp(),
        flowStatusUpdatedAt: serverTimestamp(),
      });

      const start = bookingSlot.date?.toDate?.() ?? new Date();
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (bookingSlot.duration || 60));

      setSuccessInfo({ slot: bookingSlot, start, end });
      setConfirmOpen(false);
      setBookingSlot(null);
    } catch (e: any) {
      selfBookedSlotIdsRef.current.delete(bookingSlot.id);
      const msg = e?.message === 'SLOT_TAKEN' ? 'That time was just taken. Please choose another slot.' : e?.message || 'Booking failed';
      setBookError(msg);
    } finally {
      setBookingBusy(false);
    }
  }, [user, applicant, bookingSlot, cidOk, firestore, userCid, fullName]);

  const downloadCalendar = useCallback(() => {
    if (!successInfo) return;
    const { slot, start, end } = successInfo;
    const loc = slot.format === 'Video' ? (slot.videoLink || 'Video interview') : slot.location;
    const ics = buildInterviewIcs({
      title: 'FedEx Pilot Interview',
      description: `Interview format: ${slot.format}. ${slot.format === 'Video' ? `Link: ${slot.videoLink}` : ''}`,
      location: loc,
      start,
      end,
    });
    downloadIcs('fedex-interview.ics', ics);
  }, [successInfo]);

  if (authLoading || (user && appLoading)) {
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
          <p className="text-[#333333] font-semibold">Sign in to schedule your interview.</p>
          <Link href="/login" className="mt-4 inline-block text-[#4D148C] font-semibold hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (!paramCid) {
    return (
      <div className="light-theme min-h-screen interior-bg">
        <InteriorNavbar />
        <div className="container max-w-lg mx-auto py-16 px-4 text-center text-[#565656]">
          <p>Invalid scheduling link. Please use the link from your interview email.</p>
        </div>
      </div>
    );
  }

  if (!appLoading && !applicant) {
    return (
      <div className="light-theme min-h-screen interior-bg">
        <InteriorNavbar />
        <div className="container max-w-lg mx-auto py-16 px-4 text-center text-[#565656]">
          <p>We could not load your profile. Please try again or contact support.</p>
        </div>
      </div>
    );
  }

  if (applicant && !cidOk) {
    return (
      <div className="light-theme min-h-screen interior-bg">
        <InteriorNavbar />
        <div className="container max-w-lg mx-auto py-16 px-4 text-center">
          <p className="text-[#DE002E] font-semibold">This link does not match your account Candidate ID.</p>
          <p className="text-[14px] text-[#565656] mt-2">Signed in as {user.email}</p>
        </div>
      </div>
    );
  }

  if (successInfo) {
    const { slot, start, end } = successInfo;
    return (
      <div className="light-theme min-h-screen interior-bg pb-12">
        <InteriorNavbar />
        <div className="container max-w-lg mx-auto py-12 px-4 text-center space-y-6">
          <CheckCircle2 className="h-20 w-20 text-[#008A00] mx-auto" strokeWidth={1.5} />
          <h1 className="text-[26px] font-bold text-[#333333]">Interview Confirmed!</h1>
          <p className="text-[15px] text-[#565656]">
            {format(start, 'EEEE, MMMM d, yyyy')}
            <br />
            {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
          </p>
          <div className="text-left bg-white rounded-xl border border-[#E3E3E3] p-4 text-[14px] text-[#333333]">
            {slot.format === 'Video' ? (
              <>
                <p className="font-semibold">Video interview</p>
                {slot.videoLink ? (
                  <a href={slot.videoLink} className="text-[#007AB7] break-all underline mt-1 block" target="_blank" rel="noreferrer">
                    {slot.videoLink}
                  </a>
                ) : null}
              </>
            ) : (
              <>
                <p className="font-semibold">In person</p>
                <p className="mt-1">{slot.location}</p>
              </>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              onClick={downloadCalendar}
              className="w-full bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] text-white font-bold h-11"
            >
              Add to Calendar
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline" className="w-full border-[#E3E3E3] h-11">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="light-theme min-h-screen interior-bg pb-16">
      <InteriorNavbar />
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="text-3xl font-bold italic">
              <span className="text-[#4D148C]">Fed</span>
              <span className="text-[#FF6200]">Ex</span>
            </div>
          </div>
          <h1 className="text-[28px] font-bold text-[#333333]">Schedule Your Interview</h1>
          <p className="text-[15px] text-[#8E8E8E] mt-2">Select a time that works for you</p>
          {fullName && <p className="text-[14px] text-[#565656] mt-3 font-medium">{fullName}</p>}
        </div>

        {slotsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#4D148C]" />
          </div>
        ) : slotsByDate.length === 0 && ghostSlots.length === 0 ? (
          <p className="text-center text-[#8E8E8E] py-12">No open interview times in the next 30 days. Please check back later.</p>
        ) : (
          <div className="space-y-10">
            {slotsByDate.map(([dateKey, daySlots]) => {
              const first = daySlots[0]?.date?.toDate?.();
              const ghosts = ghostsByDate.get(dateKey) || [];
              return (
                <div key={dateKey}>
                  <h2 className="text-[18px] font-bold text-[#333333] mb-4 border-b border-[#E3E3E3] pb-2">
                    {first ? format(first, 'EEEE MMMM d') : dateKey}
                  </h2>
                  <div className="space-y-3">
                    {ghosts.map((g) => (
                      <div
                        key={`ghost-${g.id}`}
                        className="relative rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-4 overflow-hidden animate-pulse opacity-70"
                      >
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-white font-bold text-[14px]">
                          Just booked
                        </div>
                        <p className="text-[15px] font-semibold text-[#333333]">{formatSlotTimeRange(g.startTime, g.endTime)}</p>
                      </div>
                    ))}
                    {daySlots.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl border border-[#E3E3E3] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                      >
                        <div className="text-[16px] font-bold text-[#333333]">{formatSlotTimeRange(s.startTime, s.endTime)}</div>
                        <span className="inline-block mt-2 rounded-full bg-[#F2F2F2] px-2.5 py-0.5 text-[11px] font-bold text-[#565656]">
                          {s.duration} min
                        </span>
                        <p className="text-[14px] text-[#565656] mt-2">
                          {s.format === 'Video' ? (
                            <>Video interview{s.videoLink ? ` — link provided after booking` : ''}</>
                          ) : (
                            <>In person at {s.location}</>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingSlot(s);
                            setConfirmOpen(true);
                            setBookError('');
                          }}
                          className="mt-4 w-full rounded-lg py-3 text-[14px] font-bold text-white transition-all hover:brightness-110"
                          style={{
                            background: 'linear-gradient(135deg, #4D148C 0%, #7D22C3 33%, #FF6200 100%)',
                          }}
                        >
                          Select This Time
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your interview time</DialogTitle>
          </DialogHeader>
          {bookingSlot && (
            <div className="space-y-2 text-[14px] text-[#333333]">
              <p>
                {bookingSlot.date?.toDate ? format(bookingSlot.date.toDate(), 'EEEE, MMMM d, yyyy') : ''}
              </p>
              <p className="font-semibold">{formatSlotTimeRange(bookingSlot.startTime, bookingSlot.endTime)}</p>
              <p>{bookingSlot.format === 'Video' ? `Video — ${bookingSlot.videoLink || 'Link TBD'}` : bookingSlot.location}</p>
              {bookError && <p className="text-[#DE002E] text-[13px] pt-2">{bookError}</p>}
            </div>
          )}
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="border-[#E3E3E3]" onClick={() => setConfirmOpen(false)} disabled={bookingBusy}>
              Go Back
            </Button>
            <Button
              className="bg-[#4D148C] text-white"
              disabled={bookingBusy}
              onClick={() => void confirmBook()}
            >
              {bookingBusy ? 'Confirming…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ScheduleInterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="light-theme min-h-screen flex items-center justify-center interior-bg">
          <Loader2 className="h-10 w-10 animate-spin text-[#4D148C]" />
        </div>
      }
    >
      <ScheduleInterviewPageInner />
    </Suspense>
  );
}
