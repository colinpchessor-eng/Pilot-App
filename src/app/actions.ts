'use server';

import { sendWelcomeEmail } from '@/ai/flows/send-welcome-email';

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
