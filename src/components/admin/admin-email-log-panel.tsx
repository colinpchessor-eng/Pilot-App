'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfDay, startOfWeek } from 'date-fns';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

type MailDoc = {
  id: string;
  to?: string | string[];
  from?: string;
  message?: { subject?: string; html?: string };
  type?: string;
  status?: string;
  candidateId?: string;
  candidateName?: string;
  sentByEmail?: string;
  createdAt?: Timestamp | null;
  delivery?: { state?: string; error?: string; info?: { message?: string } };
};

function formatTo(to: string | string[] | undefined): string {
  if (to == null) return '—';
  return Array.isArray(to) ? to.join(', ') : String(to);
}

function displayStatus(m: MailDoc): string {
  const s = (m.status || m.delivery?.state || '').toLowerCase();
  if (s.includes('error') || s.includes('fail')) return 'error';
  if (s === 'pending' || !s) return 'pending';
  if (s.includes('deliver') || s === 'success' || s === 'sent') return 'delivered';
  return s || 'pending';
}

function typeBadge(type: string | undefined): { label: string; bg: string } {
  switch (type) {
    case 'flow_started':
      return { label: 'Invitation', bg: '#4D148C' };
    case 'application_submitted':
      return { label: 'Submission Confirm', bg: '#FF6200' };
    case 'interview_invite':
      return { label: 'Interview Invite', bg: '#007AB7' };
    default:
      return { label: type || 'Other', bg: '#8E8E8E' };
  }
}

function statusBadge(status: string): { label: string; bg: string } {
  switch (status) {
    case 'delivered':
    case 'sent':
      return { label: status === 'delivered' ? 'Delivered' : 'Sent', bg: '#008A00' };
    case 'pending':
      return { label: 'Pending', bg: '#F7B118' };
    case 'error':
      return { label: 'Failed', bg: '#DE002E' };
    default:
      return { label: status || 'Pending', bg: '#F7B118' };
  }
}

export function AdminEmailLogPanel({ embedded = false }: { embedded?: boolean }) {
  const firestore = useFirestore();
  const [rows, setRows] = useState<MailDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [range, setRange] = useState<'today' | 'week' | 'all'>('all');
  const [preview, setPreview] = useState<MailDoc | null>(null);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    const q = query(collection(firestore, 'mail'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: MailDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MailDoc[];
        setRows(next);
        setLoading(false);
        setFadeKey((k) => k + 1);
      },
      (err) => {
        console.error('mail snapshot:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [firestore]);

  const filtered = useMemo(() => {
    let list = rows;
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    if (range === 'today') {
      list = list.filter((m) => {
        const t = m.createdAt?.toDate?.();
        return t != null && t >= dayStart;
      });
    } else if (range === 'week') {
      list = list.filter((m) => {
        const t = m.createdAt?.toDate?.();
        return t != null && t >= weekStart;
      });
    }
    if (typeFilter !== 'all') {
      list = list.filter((m) => m.type === typeFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (m) =>
          formatTo(m.to).toLowerCase().includes(s) ||
          (m.candidateName || '').toLowerCase().includes(s) ||
          (m.candidateId || '').toLowerCase().includes(s) ||
          (m.message?.subject || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [rows, range, typeFilter, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    let delivered = 0;
    let pending = 0;
    for (const m of filtered) {
      const st = displayStatus(m);
      if (st === 'delivered' || st === 'sent') delivered += 1;
      else if (st === 'pending') pending += 1;
    }
    return { total, delivered, pending };
  }, [filtered]);

  const openPreview = useCallback((m: MailDoc) => setPreview(m), []);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-[28px] font-bold text-[#333333] flex items-center gap-2">
            <Mail className="h-8 w-8 text-[#4D148C]" />
            Email Log
          </h1>
          <p className="text-[14px] text-[#8E8E8E] mt-1">All outbound email traffic (Firestore mail queue)</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-xl border border-[#E3E3E3] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #4D148C' }}
        >
          <div className="text-[32px] font-bold text-[#333333]">{stats.total}</div>
          <div className="text-[13px] text-[#8E8E8E]">Total (filtered)</div>
        </div>
        <div
          className="rounded-xl border border-[#E3E3E3] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #008A00' }}
        >
          <div className="text-[32px] font-bold text-[#333333]">{stats.delivered}</div>
          <div className="text-[13px] text-[#8E8E8E]">Delivered / Sent</div>
        </div>
        <div
          className="rounded-xl border border-[#E3E3E3] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #F7B118' }}
        >
          <div className="text-[32px] font-bold text-[#333333]">{stats.pending}</div>
          <div className="text-[13px] text-[#8E8E8E]">Pending</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search name, email, Candidate ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#E3E3E3] px-3 py-2 text-[13px] min-w-[200px] flex-1 max-w-md"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[#E3E3E3] px-3 py-2 text-[13px] bg-white"
        >
          <option value="all">All Types</option>
          <option value="flow_started">Flow Started (Candidate Invitation)</option>
          <option value="application_submitted">Application Submitted</option>
          <option value="interview_invite">Interview Invite</option>
        </select>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as typeof range)}
          className="rounded-lg border border-[#E3E3E3] px-3 py-2 text-[13px] bg-white"
        >
          <option value="all">All Time</option>
          <option value="week">This Week</option>
          <option value="today">Today</option>
        </select>
      </div>

      {loading ? (
        <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading mail queue…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E3E3E3] py-16 text-center text-[#8E8E8E]">
          No messages match your filters.
        </div>
      ) : (
        <div
          key={fadeKey}
          className="bg-white rounded-xl border border-[#E3E3E3] shadow-sm overflow-x-auto transition-opacity duration-300"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E3E3E3] bg-[#FAFAFA]">
                <th className="px-4 py-3 font-semibold text-[#333333]">Sent At</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">Type</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">To</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">Candidate</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">Status</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const t = typeBadge(m.type);
                const st = displayStatus(m);
                const sb = statusBadge(st);
                const sentAt = m.createdAt?.toDate?.()
                  ? format(m.createdAt.toDate(), "MMM d, yyyy 'at' h:mm a")
                  : '—';
                return (
                  <tr key={m.id} className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 text-[#565656] whitespace-nowrap">{sentAt}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ background: t.bg }}
                      >
                        {t.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#333333] max-w-[180px] truncate" title={formatTo(m.to)}>
                      {formatTo(m.to)}
                    </td>
                    <td className="px-4 py-3 text-[#565656]">
                      <div className="font-medium text-[#333333]">{m.candidateName || '—'}</div>
                      <div className="text-[11px] text-[#8E8E8E]">{m.candidateId || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ background: sb.bg }}
                      >
                        {sb.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => openPreview(m)}>
                        Preview
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.message?.subject || 'Email preview'}</DialogTitle>
          </DialogHeader>
          {preview && (
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-4">
                <iframe
                  title="Email preview"
                  sandbox="allow-same-origin"
                  srcDoc={preview.message?.html || '<p>No HTML body</p>'}
                  className="w-full h-[500px] border border-[#E3E3E3] rounded-lg bg-white"
                />
              </TabsContent>
              <TabsContent value="details" className="mt-4 space-y-2 text-[13px]">
                <p>
                  <span className="text-[#8E8E8E]">To:</span>{' '}
                  <span className="text-[#333333]">{formatTo(preview.to)}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">From:</span>{' '}
                  <span className="text-[#333333]">{preview.from || '—'}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Type:</span>{' '}
                  <span className="text-[#333333]">{preview.type || '—'}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Candidate:</span>{' '}
                  <span className="text-[#333333]">
                    {preview.candidateName || '—'} {preview.candidateId ? `(${preview.candidateId})` : ''}
                  </span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Sent by:</span>{' '}
                  <span className="text-[#333333]">{preview.sentByEmail || '—'}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Sent at:</span>{' '}
                  <span className="text-[#333333]">
                    {preview.createdAt?.toDate?.() ? format(preview.createdAt.toDate(), 'PPpp') : '—'}
                  </span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Status:</span>{' '}
                  <span className="text-[#333333]">{displayStatus(preview)}</span>
                </p>
                {preview.delivery?.error && (
                  <p className="text-[#DE002E]">
                    <span className="font-semibold">Delivery error:</span> {preview.delivery.error}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
