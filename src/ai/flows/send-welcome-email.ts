'use server';
/**
 * @fileOverview A flow for sending a welcome email to new users.
 *
 * - sendWelcomeEmail - A function that handles sending the welcome email.
 * - SendWelcomeEmailInput - The input type for the sendWelcomeEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Resend } from 'resend';

const SendWelcomeEmailInputSchema = z.object({
  email: z.string().describe('The email address of the new user.'),
  name: z.string().nullable().describe('The name of the new user.'),
});
export type SendWelcomeEmailInput = z.infer<typeof SendWelcomeEmailInputSchema>;

export async function sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<void> {
  await sendWelcomeEmailFlow(input);
}

const sendWelcomeEmailFlow = ai.defineFlow(
  {
    name: 'sendWelcomeEmailFlow',
    inputSchema: SendWelcomeEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const fromAddress = process.env.EMAIL_FROM;

    if (!process.env.RESEND_API_KEY || !fromAddress) {
      console.warn(
        'Email sending is not configured. RESEND_API_KEY or EMAIL_FROM is missing. Skipping email.'
      );
      console.log(`
      --- SKIPPED Welcome Email ---
      To: ${input.email}
      Subject: Welcome to FedexFlow!
      
      Hi ${input.name || 'there'},

      Thank you for creating an account on FedexFlow. We're excited to have you on board.
      You can now log in and start your application.

      Best,
      The FedEx Pilot Recruitment Team
      ---------------------------
    `);
      return;
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: fromAddress,
        to: input.email,
        subject: 'Welcome to FedexFlow!',
        text: `Hi ${input.name || 'there'},\n\nThank you for creating an account on FedexFlow. We're excited to have you on board.\nYou can now log in and start your application.\n\nBest,\nThe FedEx Pilot Recruitment Team`,
      });
      console.log(`Welcome email sent to ${input.email} via Resend.`);
    } catch (error) {
      console.error('Failed to send welcome email via Resend:', error);
      // Re-throwing the error to let the caller know something went wrong.
      throw new Error('Failed to send email.');
    }
  }
);
