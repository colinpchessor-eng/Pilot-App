'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Calendar as CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import type { InterviewBookingDoc, InterviewSlotDoc } from '@/lib/types';
import {
  INTERVIEW_DURATION_OPTIONS,
  INTERVIEW_START_OPTIONS,
  computeEndTime,
  combineLocalDateAndTime,
  formatSlotCardRange,
} from '@/lib/interview-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type SlotRow = InterviewSlotDoc & { id: string };
type BookingRow = InterviewBookingDoc & { id: string };

export default function AdminInterviewsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [tab, setTab] = useState<'slots' | 'scheduled'>('slots');
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [slotDate, setSlotDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState<number>(60);
  const [location, setLocation] = useState('FedEx World HQ - Memphis, TN');
  const [slotFormat, setSlotFormat] = useState<'In Person' | 'Video'>('In Person');
  const [videoLink, setVideoLink] = useState('');
  const [slotNotes, setSlotNotes] = useState('');
  const [savingSlot, setSavingSlot] = useState(false);

  const [viewBooking, setViewBooking] = useState<BookingRow | null>(null);
  const [viewSlot, setViewSlot] = useState<SlotRow | null>(null);

  useEffect(() => {
    const q = query(collection(firestore, 'interviewSlots'), orderBy('date', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSlots(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as InterviewSlotDoc) }))
        );
        setLoadingSlots(false);
      },
      (e) => {
        console.error(e);
        setLoadingSlots(false);
      }
    );
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    const q = query(collection(firestore, 'interviewBookings'), orderBy('scheduledFor', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBookings(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as InterviewBookingDoc) }))
        );
        setLoadingBookings(false);
      },
      (e) => {
        console.error(e);
        setLoadingBookings(false);
      }
    );
    return () => unsub();
  }, [firestore]);

  const bookingBySlotId = useMemo(() => {
    const m = new Map<string, BookingRow>();
    bookings.forEach((b) => {
      if (b.status === 'confirmed') m.set(b.slotId, b);
    });
    return m;
  }, [bookings]);

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, SlotRow[]>();
    for (const s of slots) {
      if (s.status === 'cancelled') continue;
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

  const handleAddSlot = async () => {
    if (!user?.uid || !slotDate) return;
    const endTime = computeEndTime(startTime, duration);
    const startDt = combineLocalDateAndTime(slotDate, startTime);
    setSavingSlot(true);
    try {
      await addDoc(collection(firestore, 'interviewSlots'), {
        date: startDt,
        startTime,
        endTime,
        duration,
        location: location.trim() || 'TBD',
        format: slotFormat,
        videoLink: slotFormat === 'Video' ? videoLink.trim() : '',
        status: 'available',
        bookedBy: '',
        bookedByName: '',
        bookedByEmail: '',
        bookedAt: null,
        createdBy: user.uid,
        notes: slotNotes.trim(),
      });
      toast({ title: 'Slot added' });
      setAddOpen(false);
      setSlotNotes('');
      setVideoLink('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not add slot', description: e?.message });
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (s: SlotRow) => {
    if (s.status !== 'available') return;
    if (!confirm('Delete this open slot?')) return;
    try {
      await deleteDoc(doc(firestore, 'interviewSlots', s.id));
      toast({ title: 'Slot removed' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e?.message });
    }
  };

  const handleCancelBooking = async (b: BookingRow) => {
    if (!confirm('Cancel this interview? The slot will reopen and the candidate should check email for updates.')) return;
    try {
      await updateDoc(doc(firestore, 'interviewBookings', b.id), {
        status: 'cancelled',
      });
      await updateDoc(doc(firestore, 'interviewSlots', b.slotId), {
        status: 'available',
        bookedBy: deleteField(),
        bookedByName: deleteField(),
        bookedByEmail: deleteField(),
        bookedAt: deleteField(),
      });
      toast({
        title: 'Booking cancelled',
        description: 'Slot is available again. Notify the candidate outside the app if needed.',
      });
      setViewBooking(null);
      setViewSlot(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Cancel failed', description: e?.message });
    }
  };

  const handleMarkComplete = async (b: BookingRow) => {
    try {
      await updateDoc(doc(firestore, 'interviewBookings', b.id), {
        status: 'completed',
      });
      toast({ title: 'Marked complete' });
      setViewBooking(null);
      setViewSlot(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: e?.message });
    }
  };

  const openViewBooking = useCallback(
    (s: SlotRow) => {
      const b = bookingBySlotId.get(s.id);
      if (b) {
        setViewSlot(s);
        setViewBooking(b);
      }
    },
    [bookingBySlotId]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#333333]">Interview Management</h1>
          <p className="text-[14px] text-[#8E8E8E] mt-1">Create slots and manage scheduled interviews</p>
        </div>
        {tab === 'slots' && (
          <Button onClick={() => setAddOpen(true)} className="shrink-0 font-semibold">
            Add Slot
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-[#E3E3E3]">
        <button
          type="button"
          onClick={() => setTab('slots')}
          className={cn(
            'px-4 py-2 text-[14px] font-semibold border-b-2 -mb-px transition-colors',
            tab === 'slots' ? 'border-[#4D148C] text-[#4D148C]' : 'border-transparent text-[#8E8E8E]'
          )}
        >
          Available Slots
        </button>
        <button
          type="button"
          onClick={() => setTab('scheduled')}
          className={cn(
            'px-4 py-2 text-[14px] font-semibold border-b-2 -mb-px transition-colors',
            tab === 'scheduled' ? 'border-[#4D148C] text-[#4D148C]' : 'border-transparent text-[#8E8E8E]'
          )}
        >
          Scheduled Interviews
        </button>
      </div>

      {tab === 'slots' && (
        <div className="space-y-8">
          {loadingSlots ? (
            <div className="flex justify-center py-16 text-[#8E8E8E]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : slotsByDate.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E3E3E3] p-12 text-center text-[#8E8E8E]">
              No interview slots yet. Click Add Slot to create availability.
            </div>
          ) : (
            slotsByDate.map(([dateKey, daySlots]) => {
              const first = daySlots[0]?.date?.toDate?.();
              return (
                <div key={dateKey}>
                  <h2 className="text-[18px] font-bold text-[#333333] mb-4">
                    {first ? format(first, 'EEEE MMMM d, yyyy') : dateKey}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {daySlots.map((s) => {
                      const booked = s.status === 'booked';
                      const b = bookingBySlotId.get(s.id);
                      return (
                        <div
                          key={s.id}
                          className="bg-white rounded-xl border border-[#E3E3E3] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                        >
                          <div className="text-[16px] font-bold text-[#333333]">
                            {formatSlotCardRange(s.startTime, s.endTime)}
                          </div>
                          <div className="text-[12px] text-[#8E8E8E] mt-1">{s.duration} min</div>
                          <span
                            className="inline-block mt-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                            style={{
                              background: s.format === 'Video' ? '#007AB7' : '#4D148C',
                            }}
                          >
                            {s.format}
                          </span>
                          <p className="text-[13px] text-[#565656] mt-2 line-clamp-2">{s.location}</p>
                          <div className="mt-2">
                            {booked ? (
                              <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#FFF3E0] text-[#E65100]">
                                Booked{b?.candidateName ? `: ${b.candidateName}` : ''}
                              </span>
                            ) : (
                              <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
                                Available
                              </span>
                            )}
                          </div>
                          <div className="mt-4 flex gap-2">
                            {!booked ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[#DE002E] border-[#E3E3E3] hover:bg-[#FFF5F5]"
                                onClick={() => void handleDeleteSlot(s)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => openViewBooking(s)}>
                                View Booking
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="bg-white rounded-xl border border-[#E3E3E3] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {loadingBookings ? (
            <div className="flex justify-center py-16 text-[#8E8E8E]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F2F2F2] border-b border-[#E3E3E3]">
                    <th className="text-left px-4 py-3 font-bold text-[#8E8E8E] uppercase text-[11px]">Date/Time</th>
                    <th className="text-left px-4 py-3 font-bold text-[#8E8E8E] uppercase text-[11px]">Candidate</th>
                    <th className="text-left px-4 py-3 font-bold text-[#8E8E8E] uppercase text-[11px] hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-bold text-[#8E8E8E] uppercase text-[11px]">Format</th>
                    <th className="text-left px-4 py-3 font-bold text-[#8E8E8E] uppercase text-[11px]">Status</th>
                    <th className="text-right px-4 py-3 font-bold text-[#8E8E8E] uppercase text-[11px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const slot = slots.find((x) => x.id === b.slotId);
                    const when = b.scheduledFor?.toDate?.()
                      ? format(b.scheduledFor.toDate(), 'PPp')
                      : '—';
                    const fmt = slot?.format ?? '—';
                    const statusStyle =
                      b.status === 'confirmed'
                        ? 'bg-[#E8F5E9] text-[#2E7D32]'
                        : b.status === 'cancelled'
                          ? 'bg-[#FFEBEE] text-[#C62828]'
                          : 'bg-[#F2F2F2] text-[#565656]';
                    return (
                      <tr key={b.id} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                        <td className="px-4 py-3 text-[#333333] whitespace-nowrap">{when}</td>
                        <td className="px-4 py-3 text-[#333333]">{b.candidateName}</td>
                        <td className="px-4 py-3 text-[#565656] hidden md:table-cell">{b.candidateEmail}</td>
                        <td className="px-4 py-3">{fmt}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusStyle}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          {b.status === 'confirmed' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[12px] h-8 border-[#E3E3E3]"
                                onClick={() => void handleCancelBooking(b)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="text-[12px] h-8 bg-[#4D148C] text-white"
                                onClick={() => void handleMarkComplete(b)}
                              >
                                Mark Complete
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <p className="text-center text-[#8E8E8E] py-12">No bookings yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add interview slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start border-[#E3E3E3] mt-1 font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {slotDate ? format(slotDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={slotDate} onSelect={setSlotDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Start time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="mt-1 border-[#E3E3E3]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_START_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="mt-1 border-[#E3E3E3]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 border-[#E3E3E3]" />
            </div>
            <div>
              <Label>Format</Label>
              <Select value={slotFormat} onValueChange={(v) => setSlotFormat(v as 'In Person' | 'Video')}>
                <SelectTrigger className="mt-1 border-[#E3E3E3]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Person">In Person</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {slotFormat === 'Video' && (
              <div>
                <Label>Video link</Label>
                <Input
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  className="mt-1 border-[#E3E3E3]"
                  placeholder="https://..."
                />
              </div>
            )}
            <div>
              <Label>Notes (HR)</Label>
              <Textarea value={slotNotes} onChange={(e) => setSlotNotes(e.target.value)} className="mt-1 border-[#E3E3E3]" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="border-[#E3E3E3]">
              Close
            </Button>
            <Button disabled={savingSlot || !slotDate} onClick={() => void handleAddSlot()}>
              {savingSlot ? 'Saving…' : 'Save slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewBooking && !!viewSlot}
        onOpenChange={(o) => {
          if (!o) {
            setViewBooking(null);
            setViewSlot(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
          </DialogHeader>
          {viewBooking && viewSlot && (
            <div className="space-y-2 text-[14px] text-[#333333]">
              <p>
                <span className="text-[#8E8E8E]">Candidate:</span> {viewBooking.candidateName}
              </p>
              <p>
                <span className="text-[#8E8E8E]">Email:</span> {viewBooking.candidateEmail}
              </p>
              <p>
                <span className="text-[#8E8E8E]">When:</span>{' '}
                {viewBooking.scheduledFor?.toDate ? format(viewBooking.scheduledFor.toDate(), 'PPpp') : '—'}
              </p>
              <p>
                <span className="text-[#8E8E8E]">Format:</span> {viewSlot.format}
              </p>
              <p>
                <span className="text-[#8E8E8E]">Location:</span> {viewSlot.location}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            {viewBooking?.status === 'confirmed' && (
              <>
                <Button variant="outline" onClick={() => viewBooking && void handleCancelBooking(viewBooking)}>
                  Cancel interview
                </Button>
                <Button className="bg-[#4D148C] text-white" onClick={() => viewBooking && void handleMarkComplete(viewBooking)}>
                  Mark complete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
