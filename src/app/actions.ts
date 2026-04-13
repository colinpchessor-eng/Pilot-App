'use server';

import { sendWelcomeEmail } from '@/ai/flows/send-welcome-email';
import { Resend } from 'resend';

export async function triggerWelcomeEmail(email: string, name: string | null) {
  console.log(`Triggering welcome email for ${email}`);
  try {
    // This will call the Genkit flow to "send" the email.
    await sendWelcomeEmail({ email, name });
    return { success: true, message: 'Welcome email process triggered.' };
  } catch (error) {
    console.error('Failed to trigger welcome email flow:', error);
    return { success: false, message: 'Failed to trigger welcome email.' };
  }
}

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

export async function triggerApplicantTokenEmail(input: {
  email: string;
  displayName: string | null;
  token: string;
}) {
  const client = getResendClient();
  if (!client) return { success: false, message: 'Email not configured.' };

  await client.resend.emails.send({
    from: client.from,
    to: input.email,
    subject: 'Your FedEx Pilot Application Access Token',
    text:
      `Hi ${input.displayName ?? 'there'},\n\n` +
      `Your access token is: ${input.token}\n\n` +
      `Return to the portal and enter it on the token screen to unlock your application.\n`,
  });

  return { success: true, message: 'Token email sent.' };
}

export async function triggerApplicantRejectionEmail(input: {
  email: string;
  displayName: string | null;
}) {
  const client = getResendClient();
  if (!client) return { success: false, message: 'Email not configured.' };

  await client.resend.emails.send({
    from: client.from,
    to: input.email,
    subject: 'FedEx Pilot Portal: Access update',
    text:
      `Hi ${input.displayName ?? 'there'},\n\n` +
      `We could not complete your portal access request.\n` +
      `If you believe this is a mistake, please contact support.\n`,
  });

  return { success: true, message: 'Rejection email sent.' };
}
