'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Eye,
  FileText,
  Mail,
  Play,
  ShieldCheck,
  UserPlus,
  Activity,
} from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { formatDistanceToNow } from 'date-fns';

type AuditDoc = {
  id?: string;
  action?: string;
  timestamp?: { toDate?: () => Date };
  candidateName?: string;
  candidateEmail?: string;
  candidateId?: string;
  adminEmail?: string;
  uid?: string;
};

function displayName(entry: AuditDoc): string {
  const n = (entry.candidateName || '').trim();
  if (n) return n;
  const em = (entry.candidateEmail || '').trim();
  if (em) return em.split('@')[0] || 'Candidate';
  return 'Candidate';
}

function secondaryLine(entry: AuditDoc): string {
  const name = (entry.candidateName || '').trim();
  const email = (entry.candidateEmail || '').trim();
  if (name && email) return `${name} · ${email}`;
  if (email) return email;
  if (name) return name;
  if (entry.candidateId) return entry.candidateId;
  return '';
}

type Visual = {
  Icon: typeof UserPlus;
  color: string;
  primary: string;
  primaryBold?: boolean;
};

function entryVisual(entry: AuditDoc): Visual {
  const name = displayName(entry);
  const action = entry.action || '';

  switch (action) {
    case 'candidate_registered':
      return {
        Icon: UserPlus,
        color: '#4D148C',
        primary: `${name} created an account`,
      };
    case 'candidate_verified':
      return {
        Icon: ShieldCheck,
        color: '#008A00',
        primary: `${name} verified their Candidate ID`,
      };
    case 'application_started':
      return {
        Icon: FileText,
        color: '#007AB7',
        primary: `${name} opened their application`,
      };
    case 'application_submitted':
      return {
        Icon: CheckCircle,
        color: '#FF6200',
        primary: `${name} submitted their application`,
        primaryBold: true,
      };
    case 'flow_started':
      return {
        Icon: Play,
        color: '#4D148C',
        primary: `Flow started for ${name}`,
      };
    case 'interview_invited':
      return {
        Icon: Mail,
        color: '#007AB7',
        primary: `Interview invitation marked for ${name}`,
      };
    case 'viewed_candidate': {
      const admin = (entry.adminEmail || '').trim() || 'Admin';
      return {
        Icon: Eye,
        color: '#8E8E8E',
        primary: `${admin} viewed ${name}`,
      };
    }
    default:
      return {
        Icon: Activity,
        color: '#8E8E8E',
        primary: action ? `${action.replace(/_/g, ' ')}` : 'Activity',
      };
  }
}

export function ActivityFeed() {
  const firestore = useFirestore();
  const [entries, setEntries] = useState<AuditDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((t) => t + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const q = query(
      collection(firestore, 'auditLog'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as AuditDoc)
        );
        setLoading(false);
      },
      (err) => {
        console.error('Activity feed snapshot:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [firestore]);

  return (
    <div
      className="bg-white overflow-hidden flex flex-col"
      style={{
        borderRadius: 12,
        border: '1px solid #E3E3E3',
        padding: 0,
        maxHeight: 400,
      }}
    >
      <div
        className="flex justify-between items-center shrink-0"
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F2F2F2',
        }}
      >
        <h3 className="text-[16px] font-bold text-[#333333]">Live Activity</h3>
        <div className="flex items-center gap-2">
          <span
            className="activity-feed-live-dot rounded-full shrink-0"
            style={{ width: 8, height: 8, background: '#008A00' }}
            aria-hidden
          />
          <span className="text-[12px] text-[#008A00] font-medium">Live</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0">
        {loading ? (
          <div className="py-10 text-center text-[13px] text-[#8E8E8E]">Loading activity…</div>
        ) : entries.length === 0 ? (
          <div className="py-10 px-5 text-center text-[13px] text-[#8E8E8E]">No activity yet.</div>
        ) : (
          entries.map((entry) => {
            const v = entryVisual(entry);
            const IconEl = v.Icon;
            const sec = secondaryLine(entry);
            const ts = entry.timestamp?.toDate?.();
            const timeLabel = ts
              ? formatDistanceToNow(ts, { addSuffix: true })
              : '—';

            return (
              <div
                key={entry.id ?? `${entry.action}-${entry.timestamp?.toDate?.()?.getTime()}-${entry.candidateId}`}
                className="flex items-start"
                style={{
                  gap: 12,
                  padding: '12px 20px',
                  borderBottom: '1px solid #F2F2F2',
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0 rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    background: v.color,
                  }}
                >
                  <IconEl className="h-4 w-4 text-white" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[14px] text-[#333333] leading-snug ${v.primaryBold ? 'font-bold' : ''}`}
                  >
                    {v.primary}
                  </p>
                  {sec ? (
                    <p className="text-[12px] text-[#8E8E8E] mt-0.5 truncate">{sec}</p>
                  ) : null}
                </div>
                <span className="text-[11px] text-[#8E8E8E] shrink-0 pt-0.5 whitespace-nowrap">
                  {timeLabel}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
