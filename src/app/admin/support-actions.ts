'use server';

import { getAdminFirestore, verifyIsAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { SupportTicketStatus } from '@/lib/types';

export async function resolveSupportTicket(input: {
  idToken: string;
  ticketId: string;
  notes: string;
}) {
  const admin = await verifyIsAdmin(input.idToken);
  const db = getAdminFirestore();

  await db.collection('supportTickets').doc(input.ticketId).update({
    status: 'resolved' as SupportTicketStatus,
    adminNotes: input.notes,
    resolvedAt: FieldValue.serverTimestamp(),
    resolvedBy: admin.email,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}
