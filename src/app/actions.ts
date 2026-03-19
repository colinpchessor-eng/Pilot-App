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

export async function triggerAdminVerificationRequestEmail(input: {
  uid: string;
  email: string;
  displayName: string | null;
}) {
  const adminEmail = process.env.VERIFICATION_ADMIN_EMAIL;
  const client = getResendClient();
  if (!client || !adminEmail) return { success: false, message: 'Email not configured.' };

  await client.resend.emails.send({
    from: client.from,
    to: adminEmail,
    subject: 'Pilot Portal: Verification request',
    text:
      `A user requested identity verification.\n\n` +
      `Name: ${input.displayName ?? 'N/A'}\n` +
      `Email: ${input.email}\n` +
      `UID: ${input.uid}\n\n` +
      `Open the admin panel to approve/reject: /admin/verifications`,
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
    subject: 'FedEx Pilot Portal: Verification update',
    text:
      `Hi ${input.displayName ?? 'there'},\n\n` +
      `We could not verify your identity for this portal request.\n` +
      `If you believe this is a mistake, please contact support.\n`,
  });

  return { success: true, message: 'Rejection email sent.' };
}
