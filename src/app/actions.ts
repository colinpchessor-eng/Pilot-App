'use server';

import { Resend } from 'resend';

function getResendClient() {
  const fromAddress = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !fromAddress) return null;
  return {
    resend: new Resend(process.env.RESEND_API_KEY),
    from: fromAddress,
  };
}

function getPortalAdminInbox(): string | null {
  return process.env.PORTAL_REQUESTS_ADMIN_EMAIL || process.env.VERIFICATION_ADMIN_EMAIL || null;
}

export async function triggerAdminLegacyDeletionRequestEmail(input: {
  uid: string;
  email: string;
  name: string | null;
  candidateId: string | null;
  notes: string;
}) {
  const adminEmail = getPortalAdminInbox();
  const client = getResendClient();
  if (!client || !adminEmail) return { success: false, message: 'Email not configured.' };

  await client.resend.emails.send({
    from: client.from,
    to: adminEmail,
    subject: 'Pilot Portal: Legacy records deletion request',
    text:
      `A user requested deletion of legacy records (admin queue: Deletion Requests).\n\n` +
      `Name: ${input.name ?? 'N/A'}\n` +
      `Email: ${input.email}\n` +
      `UID: ${input.uid}\n` +
      `Candidate ID: ${input.candidateId ?? 'N/A'}\n\n` +
      `Notes / request details:\n${input.notes || '(none)'}\n\n` +
      `Review: /admin#deletion-requests`,
  });

  return { success: true, message: 'Admin notified.' };
}

export async function triggerAdminUnlockApplicationRequestEmail(input: {
  uid: string;
  email: string;
  name: string | null;
  candidateId: string | null;
  reason: string;
}) {
  const adminEmail = getPortalAdminInbox();
  const client = getResendClient();
  if (!client || !adminEmail) return { success: false, message: 'Email not configured.' };

  await client.resend.emails.send({
    from: client.from,
    to: adminEmail,
    subject: 'Pilot Portal: Unlock submitted application request',
    text:
      `A user asked to have their submitted application unlocked for edits.\n\n` +
      `Name: ${input.name ?? 'N/A'}\n` +
      `Email: ${input.email}\n` +
      `UID: ${input.uid}\n` +
      `Candidate ID: ${input.candidateId ?? 'N/A'}\n\n` +
      `Reason:\n${input.reason || '(none)'}\n\n` +
      `Review: /admin#unlock-requests`,
  });

  return { success: true, message: 'Admin notified.' };
}
