'use server';
/**
 * @fileOverview A flow for sending a welcome email to new users.
 *
 * - sendWelcomeEmail - A function that handles sending the welcome email.
 * - SendWelcomeEmailInput - The input type for the sendWelcomeEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const SendWelcomeEmailInputSchema = z.object({
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
    // In a real application, you would integrate with an email sending service
    // like SendGrid, Resend, or AWS SES.
    // For now, we will just log to the console to simulate sending an email.
    console.log(`
      --- Sending Welcome Email ---
      To: ${input.email}
      Subject: Welcome to the FedEx Pilot Application Portal!
      
      Hi ${input.name || 'there'},

      Thank you for creating an account. We're excited to have you on board.
      You can now log in and start your application.

      Best,
      The FedEx Pilot Recruitment Team
      ---------------------------
    `);
  }
);
