'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Download, FileText } from 'lucide-react';
import { unparse } from 'papaparse';

type AuditEntry = {
  timestamp?: any;
  adminEmail?: string;
  action: string;
  candidateId?: string;
  candidateName?: string;
  details?: string;
};

const ACTION_STYLES: Record<string, { label: string; color: string }> = {
  viewed_candidate: { label: 'Viewed', color: '#007AB7' },
  approved_verification: { label: 'Approved', color: '#008A00' },
  rejected_verification: { label: 'Rejected', color: '#DE002E' },
  reset_candidate_id: { label: 'Reset', color: '#F7B118' },
  marked_deletion_complete: { label: 'Deleted', color: '#4D148C' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'viewed_candidate', label: 'Viewed' },
  { value: 'approved_verification', label: 'Approved' },
  { value: 'rejected_verification', label: 'Rejected' },
  { value: 'reset_candidate_id', label: 'Reset' },
  { value: 'marked_deletion_complete', label: 'Deleted' },
];

export default function AdminAuditPage() {
  const firestore = useFirestore();
  const [actionFilter, setActionFilter] = useState('all');

  const auditQuery = useMemo(
    () => query(collection(firestore, 'auditLog'), orderBy('timestamp', 'desc'), limit(100)),
    [firestore]
  );
  const { data, loading } = useCollection<AuditEntry>(auditQuery);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (actionFilter === 'all') return data;
    return data.filter((e) => e.action === actionFilter);
  }, [data, actionFilter]);

  const handleExport = () => {
    const rows = filtered.map((e) => ({
      Timestamp: e.timestamp?.toDate ? format(e.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
      Admin: e.adminEmail || '', Action: e.action || '',
      CandidateID: e.candidateId || '', CandidateName: e.candidateName || '', Details: e.details || '',
    }));
    const csv = unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'audit-log.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#333333]">Audit Log</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">Record of all admin actions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border-[1.5px] border-[#E3E3E3] px-3 py-2 text-[13px] bg-white text-[#333333]"
        >
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="inline-flex items-center bg-white border-[1.5px] border-[#E3E3E3] rounded-lg px-4 py-2 text-[13px] font-semibold text-[#565656] transition-all hover:border-[#4D148C] hover:text-[#4D148C] disabled:opacity-40"
        >
          <Download className="mr-2 h-4 w-4" /> Export Audit Log
        </button>
      </div>

      {loading ? (
        <div className="text-[#8E8E8E] text-sm py-12 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-[#E3E3E3] mb-4" />
          <h3 className="text-[15px] font-semibold text-[#333333]">No audit entries found</h3>
          <p className="text-[13px] text-[#8E8E8E] mt-1">Admin actions will appear here as they occur.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-[20px] font-bold text-[#333333] mb-4">Recent Actions ({filtered.length})</h2>
          <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F2F2F2] border-b-2 border-[#E3E3E3]">
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Timestamp</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Admin</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Action</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em]">Candidate</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#8E8E8E] uppercase tracking-[0.06em] hidden md:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, idx) => {
                    const style = ACTION_STYLES[entry.action] || { label: entry.action, color: '#8E8E8E' };
                    return (
                      <tr key={idx} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-4 py-3.5 text-[14px] text-[#333333] whitespace-nowrap">
                          {entry.timestamp?.toDate ? format(entry.timestamp.toDate(), "MMM d, yyyy 'at' h:mm a") : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-[14px] text-[#333333]">{entry.adminEmail || '—'}</td>
                        <td className="px-4 py-3.5">
                          <Badge style={{ background: style.color }} className="text-white">{style.label}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-[14px] text-[#333333]">{entry.candidateName || entry.candidateId || '—'}</td>
                        <td className="px-4 py-3.5 text-[14px] text-[#8E8E8E] hidden md:table-cell">{entry.details || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
