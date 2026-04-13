'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { useFirestore, useUser, useDoc } from '@/firebase';
import type { ApplicantData } from '@/lib/types';
import type { AuthorizedAdminRole } from '@/lib/authorized-admins';
import { isDev } from '@/lib/roles';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

type AuthorizedAdminRow = {
  id: string;
  email: string;
  name?: string;
  role: AuthorizedAdminRole;
  addedBy: string;
  addedAt: Timestamp | null;
  active: boolean;
};

function formatAddedAt(ts: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  try {
    return ts.toDate().toLocaleString();
  } catch {
    return '—';
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminAccessManagement() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const userDocRef = user ? doc(firestore, 'users', user.uid) : undefined;
  const { data: viewer } = useDoc<ApplicantData>(userDocRef);

  const [rows, setRows] = useState<AuthorizedAdminRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleSelect, setRoleSelect] = useState<AuthorizedAdminRole>('admin');
  const [addBusy, setAddBusy] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const [toggleKey, setToggleKey] = useState<string | null>(null);

  const refreshFallback = useCallback(async () => {
    if (!firestore) return;
    const snap = await getDocs(collection(firestore, 'authorizedAdmins'));
    const list: AuthorizedAdminRow[] = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        email: (x.email as string) ?? d.id,
        name: x.name as string | undefined,
        role: x.role === 'dev' ? 'dev' : 'admin',
        addedBy: (x.addedBy as string) ?? '',
        addedAt: (x.addedAt as Timestamp) ?? null,
        active: x.active === true,
      };
    });
    list.sort((a, b) => {
      const ta = a.addedAt?.toMillis?.() ?? 0;
      const tb = b.addedAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    setRows(list);
  }, [firestore]);

  useEffect(() => {
    if (!firestore || !isDev(viewer)) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    const q = query(collection(firestore, 'authorizedAdmins'), orderBy('addedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AuthorizedAdminRow[] = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            email: (x.email as string) ?? d.id,
            name: x.name as string | undefined,
            role: x.role === 'dev' ? 'dev' : 'admin',
            addedBy: (x.addedBy as string) ?? '',
            addedAt: (x.addedAt as Timestamp) ?? null,
            active: x.active === true,
          };
        });
        setRows(list);
        setListLoading(false);
      },
      () => {
        void refreshFallback().finally(() => setListLoading(false));
      }
    );
    return () => unsub();
  }, [firestore, viewer, refreshFallback]);

  const isEmpty = rows.length === 0 && !listLoading;

  const seedDefaults = async () => {
    if (!firestore) return;
    setSeedBusy(true);
    try {
      await setDoc(doc(firestore, 'authorizedAdmins', 'colinpchessor@gmail.com'), {
        email: 'colinpchessor@gmail.com',
        role: 'dev',
        addedBy: 'system',
        name: 'Colin Chessor',
        active: true,
        addedAt: serverTimestamp(),
      });
      toast({
        title: 'Default admin initialized',
        description: 'Add other staff emails in this table before they can self-sign up as admin.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Failed to seed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setSeedBusy(false);
    }
  };

  const toggleActive = async (row: AuthorizedAdminRow) => {
    if (!firestore) return;
    setToggleKey(row.id);
    try {
      await updateDoc(doc(firestore, 'authorizedAdmins', row.id), {
        active: !row.active,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setToggleKey(null);
    }
  };

  const removeRow = async (row: AuthorizedAdminRow) => {
    if (!firestore) return;
    if (!confirm(`Remove ${row.email} from admin list?`)) return;
    try {
      await deleteDoc(doc(firestore, 'authorizedAdmins', row.id));
      toast({ title: 'Removed', description: `${row.email} was removed from the pre-authorized list.` });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  };

  const addAdmin = async () => {
    if (!firestore || !user?.email) return;
    const name = nameInput.trim();
    const email = emailInput.trim().toLowerCase();
    if (!name) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a full name.' });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      toast({ variant: 'destructive', title: 'Invalid email', description: 'Enter a valid email address.' });
      return;
    }
    setAddBusy(true);
    try {
      const ref = doc(firestore, 'authorizedAdmins', email);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        toast({
          variant: 'destructive',
          title: 'Already listed',
          description: `${email} is already in the admin list`,
        });
        return;
      }
      await setDoc(ref, {
        email,
        name,
        role: roleSelect,
        addedBy: user.email,
        addedAt: serverTimestamp(),
        active: true,
      });
      const roleLabel = roleSelect === 'dev' ? 'Developer' : 'HR Admin';
      toast({
        title: 'Admin added',
        description: `${name} added as ${roleLabel}. They will receive admin access when they register.`,
      });
      setNameInput('');
      setEmailInput('');
      setRoleSelect('admin');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Add failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setAddBusy(false);
    }
  };

  const roleBadgeStyle = useMemo(
    () => ({
      admin: {
        background: 'rgba(0,122,183,0.1)',
        color: '#007AB7',
        text: 'HR Admin',
      },
      dev: {
        background: 'rgba(77,20,140,0.1)',
        color: '#4D148C',
        text: 'Developer',
      },
    }),
    []
  );

  if (!viewer || !isDev(viewer)) return null;

  return (
    <Card className="border-[#E3E3E3]">
      <CardHeader>
        <CardTitle>Admin Access Management</CardTitle>
        <CardDescription>Add or remove HR admin and developer access</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEmpty && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-[#565656]">No pre-authorized admins yet.</p>
            <Button
              type="button"
              variant="secondary"
              disabled={seedBusy}
              onClick={() => void seedDefaults()}
            >
              {seedBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Initialize Default Admins
            </Button>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Added At</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-[#8E8E8E]">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-[#8E8E8E]">
                    No entries yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rb = roleBadgeStyle[row.role];
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name?.trim() || '—'}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>
                        <span
                          className="inline-block rounded px-2 py-0.5 text-xs font-bold"
                          style={{ background: rb.background, color: rb.color }}
                        >
                          {rb.text}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-[#565656]">{row.addedBy || '—'}</TableCell>
                      <TableCell className="text-sm text-[#565656]">{formatAddedAt(row.addedAt)}</TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => void toggleActive(row)}
                          disabled={toggleKey === row.id}
                          className="mx-auto block rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{
                            background: row.active ? 'rgba(34,197,94,0.15)' : 'rgba(142,142,142,0.2)',
                            color: row.active ? '#15803d' : '#737373',
                          }}
                        >
                          {toggleKey === row.id ? '…' : row.active ? 'Active' : 'Inactive'}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-[#DE002E] hover:bg-red-50 hover:text-[#DE002E]"
                          onClick={() => void removeRow(row)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-4 rounded-lg border border-[#E3E3E3] bg-[#FAFAFA] p-5">
          <h3 className="text-base font-bold text-[#333333]">Add New Admin</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="aa-name">Full Name</Label>
              <Input
                id="aa-name"
                placeholder="Kim Daniels"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aa-email">Email Address</Label>
              <Input
                id="aa-email"
                type="email"
                placeholder="Kim.Daniels@fedex.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={roleSelect}
                onValueChange={(v) => setRoleSelect(v as AuthorizedAdminRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">HR Admin</SelectItem>
                  <SelectItem value="dev">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="button" className="h-11 px-6 text-base" disabled={addBusy} onClick={() => void addAdmin()}>
            {addBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Add Admin
          </Button>
        </div>

        <div
          className="text-[12px] leading-relaxed text-[#565656]"
          style={{
            background: 'rgba(247,177,24,0.08)',
            borderLeft: '3px solid #F7B118',
            borderRadius: 4,
            padding: '12px 16px',
          }}
        >
          ⚠ Adding an email here grants admin access when that person registers for the first time. Existing
          accounts are not affected — update their role directly in Firestore if needed.
        </div>
      </CardContent>
    </Card>
  );
}
