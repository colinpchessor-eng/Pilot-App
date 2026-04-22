'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { SupportTicketDoc } from '@/lib/types';
import { useUser } from '@/firebase';
import { resolveSupportTicket } from '@/app/admin/support-actions';
import { LifeBuoy, Search, Mail, User, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function SupportTicketsTable({ tickets }: { tickets: (SupportTicketDoc & { id: string })[] }) {
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [selectedTicket, setSelectedTicket] = useState<(SupportTicketDoc & { id: string }) | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (filter === 'open' && t.status !== 'open') return false;
      if (filter === 'resolved' && t.status !== 'resolved') return false;
      const q = search.toLowerCase();
      if (q && !t.subject.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) && !t.candidateId.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [tickets, search, filter]);

  const handleResolve = async () => {
    if (!user || !selectedTicket) return;
    setResolving(true);
    try {
      const token = await user.getIdToken();
      await resolveSupportTicket({ idToken: token, ticketId: selectedTicket.id, notes: resolveNotes });
      setSelectedTicket(null);
      setResolveNotes('');
    } catch (e) {
      console.error(e);
      alert('Failed to resolve ticket.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button variant={filter === 'open' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('open')} className={filter === 'open' ? 'bg-[#4D148C] text-white hover:bg-[#4D148C]/90' : ''}>
            Open Tickets
          </Button>
          <Button variant={filter === 'resolved' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('resolved')} className={filter === 'resolved' ? 'bg-[#4D148C] text-white hover:bg-[#4D148C]/90' : ''}>
            Resolved
          </Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')} className={filter === 'all' ? 'bg-[#4D148C] text-white hover:bg-[#4D148C]/90' : ''}>
            All
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4D148C] w-full sm:w-64"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Subject</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Candidate</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Legacy ID</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTickets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[200px]">{t.subject}</td>
                <td className="px-4 py-3 text-gray-600">{t.name || 'Unknown'}</td>
                <td className="px-4 py-3 text-gray-600">{t.candidateId || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{t.createdAt ? format(t.createdAt.toDate(), 'MMM d, yyyy') : ''}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.status === 'open' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                    {t.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(t)} className="text-[#4D148C]">
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No tickets found matching the criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <LifeBuoy className="h-5 w-5 text-[#4D148C]" />
                {selectedTicket.subject}
              </DialogTitle>
              <DialogDescription>
                Ticket ID: <span className="font-mono text-xs">{selectedTicket.id}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border text-sm">
                <div>
                  <div className="text-gray-500 font-semibold mb-1 flex items-center gap-1.5"><User className="h-4 w-4"/> Candidate</div>
                  <div className="font-medium text-gray-900">{selectedTicket.name || 'Unknown'}</div>
                  <div className="text-gray-500">Legacy ID: {selectedTicket.candidateId || 'None'}</div>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold mb-1 flex items-center gap-1.5"><Mail className="h-4 w-4"/> Contact</div>
                  <div className="text-gray-900">{selectedTicket.email}</div>
                  <div className="text-gray-500 flex items-center gap-1 mt-1"><Clock className="h-3 w-3"/> {selectedTicket.createdAt ? format(selectedTicket.createdAt.toDate(), 'MMM d, yyyy h:mm a') : ''}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2">Message</h4>
                <div className="bg-white border rounded-lg p-4 whitespace-pre-wrap text-gray-700 text-sm leading-relaxed max-h-[300px] overflow-y-auto">
                  {selectedTicket.message}
                </div>
              </div>

              {selectedTicket.status === 'open' && (
                <div className="pt-2">
                  <h4 className="font-bold text-gray-800 mb-2">Resolve Ticket</h4>
                  <Textarea
                    placeholder="Add internal admin notes about how this was resolved..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {selectedTicket.status === 'resolved' && (
                <div className="bg-green-50 text-green-900 border border-green-200 p-4 rounded-lg text-sm">
                  <div className="font-bold flex items-center gap-1.5 mb-2"><CheckCircle2 className="h-4 w-4"/> Resolved by {selectedTicket.resolvedBy}</div>
                  <div className="text-green-800">
                    <span className="font-semibold">Notes:</span> {selectedTicket.adminNotes || 'None'}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>Close</Button>
              {selectedTicket.status === 'open' && (
                <Button onClick={handleResolve} disabled={resolving} className="bg-[#4D148C] text-white hover:bg-[#4D148C]/90">
                  {resolving ? 'Resolving...' : 'Mark as Resolved'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
