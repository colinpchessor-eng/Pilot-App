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
import { Inbox } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

type InboundDoc = {
  id: string;
  resendEmailId?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  html?: string | null;
  text?: string | null;
  messageId?: string;
  attachments?: Array<{ filename?: string; content_type?: string }>;
  rawDownloadUrl?: string;
  rawExpiresAt?: string;
  createdAt?: Timestamp | null;
};

function formatToList(to: string[] | undefined): string {
  if (to == null || to.length === 0) return '—';
  return to.join(', ');
}

export function AdminInboundMailPanel({ embedded = false }: { embedded?: boolean }) {
  const firestore = useFirestore();
  const [rows, setRows] = useState<InboundDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<'today' | 'week' | 'all'>('all');
  const [preview, setPreview] = useState<InboundDoc | null>(null);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    const q = query(
      collection(firestore, 'supportInboundMail'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: InboundDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as InboundDoc[];
        setRows(next);
        setLoading(false);
        setFadeKey((k) => k + 1);
      },
      (err) => {
        console.error('supportInboundMail snapshot:', err);
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
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (m) =>
          (m.from || '').toLowerCase().includes(s) ||
          formatToList(m.to).toLowerCase().includes(s) ||
          (m.subject || '').toLowerCase().includes(s) ||
          (m.messageId || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [rows, range, search]);

  const openPreview = useCallback((m: InboundDoc) => setPreview(m), []);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-[28px] font-bold text-[#333333] flex items-center gap-2">
            <Inbox className="h-8 w-8 text-[#007AB7]" />
            Inbound support mail
          </h1>
          <p className="text-[14px] text-[#8E8E8E] mt-1">
            Messages received at support (Resend receiving → Firestore)
          </p>
        </div>
      )}

      <div
        className="rounded-xl border border-[#E3E3E3] bg-white p-5 shadow-sm"
        style={{ borderTop: '3px solid #007AB7' }}
      >
        <div className="text-[32px] font-bold text-[#333333]">{filtered.length}</div>
        <div className="text-[13px] text-[#8E8E8E]">Messages (filtered, max 100 loaded)</div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search from, to, subject, Message-ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#E3E3E3] px-3 py-2 text-[13px] min-w-[200px] flex-1 max-w-md"
        />
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
        <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading inbound mail…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E3E3E3] py-16 text-center text-[#8E8E8E]">
          No inbound messages match your filters.
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
                <th className="px-4 py-3 font-semibold text-[#333333]">Received</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">From</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">To</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">Subject</th>
                <th className="px-4 py-3 font-semibold text-[#333333]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const receivedAt = m.createdAt?.toDate?.()
                  ? format(m.createdAt.toDate(), "MMM d, yyyy 'at' h:mm a")
                  : '—';
                return (
                  <tr key={m.id} className="border-b border-[#F0F0F0] hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 text-[#565656] whitespace-nowrap">{receivedAt}</td>
                    <td className="px-4 py-3 text-[#333333] max-w-[160px] truncate" title={m.from}>
                      {m.from || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#565656] max-w-[160px] truncate" title={formatToList(m.to)}>
                      {formatToList(m.to)}
                    </td>
                    <td className="px-4 py-3 text-[#333333] max-w-[220px] truncate" title={m.subject}>
                      {m.subject || '—'}
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
            <DialogTitle>{preview?.subject || 'Inbound message'}</DialogTitle>
          </DialogHeader>
          {preview && (
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-4">
                {preview.html ? (
                  <iframe
                    title="Inbound HTML"
                    sandbox="allow-same-origin"
                    srcDoc={preview.html}
                    className="w-full h-[500px] border border-[#E3E3E3] rounded-lg bg-white"
                  />
                ) : preview.text ? (
                  <pre className="whitespace-pre-wrap text-[13px] border border-[#E3E3E3] rounded-lg p-4 bg-[#FAFAFA] max-h-[500px] overflow-y-auto">
                    {preview.text}
                  </pre>
                ) : (
                  <p className="text-[#8E8E8E] text-sm">No HTML or plain text body stored.</p>
                )}
              </TabsContent>
              <TabsContent value="details" className="mt-4 space-y-2 text-[13px]">
                <p>
                  <span className="text-[#8E8E8E]">From:</span>{' '}
                  <span className="text-[#333333]">{preview.from || '—'}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">To:</span>{' '}
                  <span className="text-[#333333]">{formatToList(preview.to)}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Cc:</span>{' '}
                  <span className="text-[#333333]">{formatToList(preview.cc)}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Message-ID:</span>{' '}
                  <span className="text-[#333333]">{preview.messageId || '—'}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Resend id:</span>{' '}
                  <span className="text-[#333333]">{preview.resendEmailId || preview.id}</span>
                </p>
                <p>
                  <span className="text-[#8E8E8E]">Received at:</span>{' '}
                  <span className="text-[#333333]">
                    {preview.createdAt?.toDate?.() ? format(preview.createdAt.toDate(), 'PPpp') : '—'}
                  </span>
                </p>
                {preview.attachments && preview.attachments.length > 0 && (
                  <div>
                    <span className="text-[#8E8E8E]">Attachments:</span>
                    <ul className="list-disc pl-5 mt-1 text-[#333333]">
                      {preview.attachments.map((a, i) => (
                        <li key={i}>
                          {a.filename || 'file'}
                          {a.content_type ? ` (${a.content_type})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {preview.rawDownloadUrl && (
                  <p>
                    <span className="text-[#8E8E8E]">Raw .eml:</span>{' '}
                    <a
                      href={preview.rawDownloadUrl}
                      className="text-[#007AB7] underline break-all"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download (expires {preview.rawExpiresAt || 'see Resend'})
                    </a>
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
