'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfDay } from 'date-fns';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
  Video,
  Brain,
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import type {
  IndoctrinationSessionDoc,
  TestingSessionDoc,
  TestingSessionKind,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TestingRow = TestingSessionDoc & { id: string };
type IndoctrinationRow = IndoctrinationSessionDoc & { id: string };

function KindIcon({ kind }: { kind: TestingSessionKind }) {
  return kind === 'cognitive' ? (
    <Brain className="h-4 w-4 text-[#4D148C]" aria-hidden />
  ) : (
    <Video className="h-4 w-4 text-[#007AB7]" aria-hidden />
  );
}

export default function AdminSchedulingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [tab, setTab] = useState<'testing' | 'indoctrination'>('testing');

  const [testingSessions, setTestingSessions] = useState<TestingRow[]>([]);
  const [indoctrinationSessions, setIndoctrinationSessions] = useState<IndoctrinationRow[]>([]);
  const [loadingTesting, setLoadingTesting] = useState(true);
  const [loadingIndoctrination, setLoadingIndoctrination] = useState(true);

  const [testDate, setTestDate] = useState<Date | undefined>(new Date());
  const [testKind, setTestKind] = useState<TestingSessionKind>('cognitive');
  const [testCapacity, setTestCapacity] = useState<string>('15');
  const [testNotes, setTestNotes] = useState('');
  const [savingTest, setSavingTest] = useState(false);

  const [indoDate, setIndoDate] = useState<Date | undefined>(new Date());
  const [indoCapacity, setIndoCapacity] = useState<string>('20');
  const [indoNotes, setIndoNotes] = useState('');
  const [savingIndo, setSavingIndo] = useState(false);

  useEffect(() => {
    const q = query(collection(firestore, 'testingSessions'), orderBy('date', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTestingSessions(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as TestingSessionDoc) }))
        );
        setLoadingTesting(false);
      },
      (e) => {
        console.error(e);
        setLoadingTesting(false);
      }
    );
    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    const q = query(collection(firestore, 'indoctrinationSessions'), orderBy('date', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setIndoctrinationSessions(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as IndoctrinationSessionDoc) }))
        );
        setLoadingIndoctrination(false);
      },
      (e) => {
        console.error(e);
        setLoadingIndoctrination(false);
      }
    );
    return () => unsub();
  }, [firestore]);

  const sortedTesting = useMemo(() => {
    return [...testingSessions].sort((a, b) => {
      const ta = a.date?.toMillis?.() ?? 0;
      const tb = b.date?.toMillis?.() ?? 0;
      return ta - tb;
    });
  }, [testingSessions]);

  const sortedIndoctrination = useMemo(() => {
    return [...indoctrinationSessions].sort((a, b) => {
      const ta = a.date?.toMillis?.() ?? 0;
      const tb = b.date?.toMillis?.() ?? 0;
      return ta - tb;
    });
  }, [indoctrinationSessions]);

  const addTestingSession = async () => {
    if (!user?.uid || !testDate) return;
    const cap = Math.max(1, parseInt(testCapacity, 10) || 0);
    if (!Number.isFinite(cap) || cap < 1) {
      toast({ variant: 'destructive', title: 'Invalid capacity', description: 'Enter at least 1 seat.' });
      return;
    }
    setSavingTest(true);
    try {
      await addDoc(collection(firestore, 'testingSessions'), {
        date: Timestamp.fromDate(startOfDay(testDate)),
        kind: testKind,
        capacity: cap,
        bookedCount: 0,
        active: true,
        notes: testNotes.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Testing session added' });
      setTestNotes('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ variant: 'destructive', title: 'Could not add session', description: msg });
    } finally {
      setSavingTest(false);
    }
  };

  const addIndoctrinationSession = async () => {
    if (!user?.uid || !indoDate) return;
    const cap = Math.max(1, parseInt(indoCapacity, 10) || 0);
    if (!Number.isFinite(cap) || cap < 1) {
      toast({ variant: 'destructive', title: 'Invalid capacity', description: 'Enter at least 1 seat.' });
      return;
    }
    setSavingIndo(true);
    try {
      await addDoc(collection(firestore, 'indoctrinationSessions'), {
        date: Timestamp.fromDate(startOfDay(indoDate)),
        capacity: cap,
        bookedCount: 0,
        active: true,
        notes: indoNotes.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Indoctrination session added' });
      setIndoNotes('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ variant: 'destructive', title: 'Could not add session', description: msg });
    } finally {
      setSavingIndo(false);
    }
  };

  const toggleTestingActive = useCallback(
    async (row: TestingRow, active: boolean) => {
      try {
        await updateDoc(doc(firestore, 'testingSessions', row.id), {
          active,
          updatedAt: serverTimestamp(),
        });
        toast({ title: active ? 'Session activated' : 'Session deactivated' });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        toast({ variant: 'destructive', title: 'Update failed', description: msg });
      }
    },
    [firestore, toast]
  );

  const toggleIndoctrinationActive = useCallback(
    async (row: IndoctrinationRow, active: boolean) => {
      try {
        await updateDoc(doc(firestore, 'indoctrinationSessions', row.id), {
          active,
          updatedAt: serverTimestamp(),
        });
        toast({ title: active ? 'Session activated' : 'Session deactivated' });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        toast({ variant: 'destructive', title: 'Update failed', description: msg });
      }
    },
    [firestore, toast]
  );

  const deleteTesting = async (row: TestingRow) => {
    if (row.bookedCount > 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete',
        description: 'Deactivate instead, or wait until there are no bookings.',
      });
      return;
    }
    if (!confirm('Delete this testing session permanently?')) return;
    try {
      await deleteDoc(doc(firestore, 'testingSessions', row.id));
      toast({ title: 'Session removed' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ variant: 'destructive', title: 'Delete failed', description: msg });
    }
  };

  const deleteIndoctrination = async (row: IndoctrinationRow) => {
    if (row.bookedCount > 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete',
        description: 'Deactivate instead, or wait until there are no bookings.',
      });
      return;
    }
    if (!confirm('Delete this indoctrination session permanently?')) return;
    try {
      await deleteDoc(doc(firestore, 'indoctrinationSessions', row.id));
      toast({ title: 'Session removed' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ variant: 'destructive', title: 'Delete failed', description: msg });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-[28px] font-bold text-[#333333]">Scheduling</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">
          Capacity-based testing and indoctrination dates.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'testing' | 'indoctrination')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="indoctrination">Indoctrination</TabsTrigger>
        </TabsList>

        <TabsContent value="testing" className="mt-6 space-y-6">
          <div
            className="rounded-xl border border-[#E3E3E3] bg-white p-6"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <h2 className="text-lg font-bold text-[#333333] mb-4">Add testing session</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal border-[#E3E3E3]',
                        !testDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {testDate ? format(testDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={testDate} onSelect={setTestDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={testKind} onValueChange={(v) => setTestKind(v as TestingSessionKind)}>
                  <SelectTrigger className="border-[#E3E3E3]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cognitive">Cognitive testing</SelectItem>
                    <SelectItem value="remote">Remote testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-cap">Seats (capacity)</Label>
                <Input
                  id="test-cap"
                  type="number"
                  min={1}
                  className="border-[#E3E3E3]"
                  value={testCapacity}
                  onChange={(e) => setTestCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="test-notes">Notes (optional)</Label>
                <Textarea
                  id="test-notes"
                  className="border-[#E3E3E3] min-h-[72px]"
                  value={testNotes}
                  onChange={(e) => setTestNotes(e.target.value)}
                  placeholder="Internal notes for staff"
                />
              </div>
            </div>
            <Button
              className="mt-4 fedex-btn-primary"
              disabled={savingTest || !testDate}
              onClick={() => void addTestingSession()}
            >
              {savingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add session'}
            </Button>
          </div>

          <div
            className="rounded-xl border border-[#E3E3E3] bg-white p-6"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <h2 className="text-lg font-bold text-[#333333] mb-4">Testing sessions</h2>
            {loadingTesting ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#4D148C]" />
              </div>
            ) : sortedTesting.length === 0 ? (
              <p className="text-center text-[#8E8E8E] py-8">No sessions yet.</p>
            ) : (
              <ul className="space-y-3">
                {sortedTesting.map((row) => {
                  const d = row.date?.toDate?.();
                  const booked = row.bookedCount ?? 0;
                  const cap = row.capacity ?? 0;
                  const pct = cap > 0 ? Math.min(100, Math.round((booked / cap) * 100)) : 0;
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-lg border border-[#F2F2F2] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <KindIcon kind={row.kind} />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#333333]">
                            {d ? format(d, 'EEEE, MMM d, yyyy') : '—'}
                          </p>
                          <p className="text-[13px] text-[#565656] capitalize">
                            {row.kind === 'cognitive' ? 'Cognitive' : 'Remote'} testing
                          </p>
                          {row.notes ? (
                            <p className="text-[12px] text-[#8E8E8E] mt-1 line-clamp-2">{row.notes}</p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-2 max-w-xs">
                            <div className="h-2 flex-1 rounded-full bg-[#E3E3E3] overflow-hidden">
                              <div
                                className="h-full bg-[#4D148C] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[12px] font-semibold text-[#565656] tabular-nums shrink-0">
                              {booked}/{cap}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'text-[11px] font-bold uppercase px-2 py-1 rounded',
                            row.active ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'
                          )}
                        >
                          {row.active ? 'Active' : 'Inactive'}
                        </span>
                        {row.active ? (
                          <Button size="sm" variant="outline" onClick={() => void toggleTestingActive(row, false)}>
                            Deactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => void toggleTestingActive(row, true)}>
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#DE002E]"
                          disabled={booked > 0}
                          onClick={() => void deleteTesting(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="indoctrination" className="mt-6 space-y-6">
          <div
            className="rounded-xl border border-[#E3E3E3] bg-white p-6"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <h2 className="text-lg font-bold text-[#333333] mb-4">Add indoctrination class</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal border-[#E3E3E3]',
                        !indoDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {indoDate ? format(indoDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={indoDate} onSelect={setIndoDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="indo-cap">Seats (capacity)</Label>
                <Input
                  id="indo-cap"
                  type="number"
                  min={1}
                  className="border-[#E3E3E3]"
                  value={indoCapacity}
                  onChange={(e) => setIndoCapacity(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="indo-notes">Notes (optional)</Label>
                <Textarea
                  id="indo-notes"
                  className="border-[#E3E3E3] min-h-[72px]"
                  value={indoNotes}
                  onChange={(e) => setIndoNotes(e.target.value)}
                  placeholder="Location, reporting time, etc."
                />
              </div>
            </div>
            <Button
              className="mt-4 fedex-btn-primary"
              disabled={savingIndo || !indoDate}
              onClick={() => void addIndoctrinationSession()}
            >
              {savingIndo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add class date'}
            </Button>
          </div>

          <div
            className="rounded-xl border border-[#E3E3E3] bg-white p-6"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <h2 className="text-lg font-bold text-[#333333] mb-4">Indoctrination classes</h2>
            {loadingIndoctrination ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#4D148C]" />
              </div>
            ) : sortedIndoctrination.length === 0 ? (
              <p className="text-center text-[#8E8E8E] py-8">No class dates yet.</p>
            ) : (
              <ul className="space-y-3">
                {sortedIndoctrination.map((row) => {
                  const d = row.date?.toDate?.();
                  const booked = row.bookedCount ?? 0;
                  const cap = row.capacity ?? 0;
                  const pct = cap > 0 ? Math.min(100, Math.round((booked / cap) * 100)) : 0;
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-lg border border-[#F2F2F2] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#333333]">
                          {d ? format(d, 'EEEE, MMM d, yyyy') : '—'}
                        </p>
                        <p className="text-[13px] text-[#565656]">Indoctrination class</p>
                        {row.notes ? (
                          <p className="text-[12px] text-[#8E8E8E] mt-1 line-clamp-2">{row.notes}</p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2 max-w-xs">
                          <div className="h-2 flex-1 rounded-full bg-[#E3E3E3] overflow-hidden">
                            <div
                              className="h-full bg-[#FF6200] rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-[#565656] tabular-nums shrink-0">
                            {booked}/{cap}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            'text-[11px] font-bold uppercase px-2 py-1 rounded',
                            row.active ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'
                          )}
                        >
                          {row.active ? 'Active' : 'Inactive'}
                        </span>
                        {row.active ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleIndoctrinationActive(row, false)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleIndoctrinationActive(row, true)}
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#DE002E]"
                          disabled={booked > 0}
                          onClick={() => void deleteIndoctrination(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
