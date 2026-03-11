'use server';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { initializeFirebase } from '@/firebase';
import { sendWelcomeEmail } from '@/ai/flows/send-welcome-email';

export async function saveApplication(userId: string, data: any) {
  const { firestore } = initializeFirebase();
  console.log(`Saving application progress for ${userId}:`, data);

  const docRef = doc(firestore, 'users', userId);

  try {
    await setDoc(docRef, data, { merge: true });
    return { success: true, message: 'Progress saved successfully.' };
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    return {
      success: false,
      message: 'Failed to save progress due to permissions.',
    };
  }
}

export async function submitApplication(userId: string, data: any) {
  console.log(`Submitting application for ${userId}:`, data);
  const { firestore } = initializeFirebase();
  const docRef = doc(firestore, 'users', userId);

  const submissionData = {
    ...data,
    submittedAt: serverTimestamp(),
    status: 'Completed',
  };

  try {
    await setDoc(docRef, submissionData, { merge: true });
    return { success: true, message: 'Application submitted successfully!' };
  } catch (serverError) {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: submissionData,
    });
    errorEmitter.emit('permission-error', permissionError);
    return {
      success: false,
      message: 'Failed to submit application due to permissions.',
    };
  }
}

export async function triggerWelcomeEmail(email: string, name: string | null) {
  console.log(`Triggering welcome email for ${email}`);
  try {
    // This will call the Genkit flow to "send" the email.
    // In a real app, this would integrate with an email service.
    await sendWelcomeEmail({ email, name });
    return { success: true, message: 'Welcome email process triggered.' };
  } catch (error) {
    console.error('Failed to trigger welcome email flow:', error);
    return { success: false, message: 'Failed to trigger welcome email.' };
  }
}
