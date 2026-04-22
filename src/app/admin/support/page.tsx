'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { SupportTicketDoc } from '@/lib/types';
import { SupportTicketsTable } from '@/components/admin/support-tickets-table';
import { LifeBuoy } from 'lucide-react';

export default function AdminSupportPage() {
  const db = useFirestore();
  const [tickets, setTickets] = useState<(SupportTicketDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'supportTickets'));
    const unsub = onSnapshot(q, (snap) => {
      const results: (SupportTicketDoc & { id: string })[] = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...(doc.data() as SupportTicketDoc) });
      });
      setTickets(results);
      setLoading(false);
    });
    return () => unsub();
  }, [db]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-[#E3E3E3]">
            <LifeBuoy className="h-6 w-6 text-[#4D148C]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#333333]">Support Inbox</h1>
            <p className="text-[#8E8E8E]">Manage incoming candidate help requests and account issues.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[#E3E3E3] bg-white/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4D148C] border-t-transparent" />
        </div>
      ) : (
        <SupportTicketsTable tickets={tickets} />
      )}
    </div>
  );
}
