'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SupportTicketDoc } from '@/lib/types';
import { format } from 'date-fns';
import { LifeBuoy, CheckCircle2 } from 'lucide-react';

export function CandidateSupportTickets({ uid }: { uid: string }) {
  const db = useFirestore();
  const [tickets, setTickets] = useState<(SupportTicketDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'supportTickets'), where('uid', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      const results: (SupportTicketDoc & { id: string })[] = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...(doc.data() as SupportTicketDoc) });
      });
      // Sort in JS to avoid requiring a composite index in Firestore
      results.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setTickets(results);
      setLoading(false);
    });
    return () => unsub();
  }, [db, uid]);

  if (loading) return <div className="text-sm text-gray-500 mt-8">Loading support tickets...</div>;
  if (tickets.length === 0) return null; // Don't render anything if there are no tickets

  return (
    <div className="mt-8 space-y-4 print:hidden">
      <h3 className="text-[18px] font-bold text-[#333333] flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-[#4D148C]" />
        Support Tickets
      </h3>
      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className={`p-4 rounded-xl border ${t.status === 'open' ? 'bg-orange-50/50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-[15px]">{t.subject}</div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${t.status === 'open' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                {t.status.toUpperCase()}
              </span>
            </div>
            <div className="text-[13px] text-gray-600 mb-3 whitespace-pre-wrap leading-relaxed">{t.message}</div>
            
            {t.status === 'resolved' && (
              <div className="mt-3 pt-3 border-t border-gray-200/60 text-[13px]">
                <div className="flex items-center gap-1.5 font-semibold text-green-800 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolved by {t.resolvedBy}
                </div>
                <div className="text-gray-600"><span className="font-medium text-gray-700">Notes:</span> {t.adminNotes || 'None'}</div>
              </div>
            )}
            
            <div className="text-[11px] text-gray-400 mt-2 text-right">
              Submitted {t.createdAt ? format(t.createdAt.toDate(), 'MMM d, yyyy h:mm a') : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
