'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { loginSchema } from '@/lib/schemas';

// Mock database of applicants
const MOCK_APPLICANTS = [
  { recordLocator: 'ABCDEF', atpNumber: '12345' },
  { recordLocator: 'GHIJKL', atpNumber: '67890' },
];

export type LoginFormState = {
  message: string;
};

export async function login(
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  try {
    const validatedFields = loginSchema.parse({
      recordLocator: formData.get('recordLocator'),
      atpNumber: formData.get('atpNumber'),
    });

    const applicant = MOCK_APPLICANTS.find(
      (a) =>
        a.recordLocator.toLowerCase() ===
          validatedFields.recordLocator.toLowerCase() &&
        a.atpNumber === validatedFields.atpNumber
    );

    if (!applicant) {
      return { message: 'Invalid Record Locator or ATP Number.' };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { message: error.errors.map((e) => e.message).join(' ') };
    }
    return { message: 'An unexpected error occurred. Please try again.' };
  }

  redirect(`/dashboard/${formData.get('recordLocator')}`);
}

export async function saveApplication(recordLocator: string, data: any) {
  console.log(`Saving application progress for ${recordLocator}:`, data);
  // In a real app, this would update the document in Firestore:
  // const db = getFirestore();
  // await db.collection('applicants').doc(applicantId).update(data);
  return { success: true, message: 'Progress saved successfully.' };
}

export async function uploadResume(recordLocator: string, formData: FormData) {
  const file = formData.get('resume') as File;
  if (!file || file.size === 0) {
    return { success: false, message: 'No file selected.' };
  }

  console.log(`Uploading resume for ${recordLocator}: ${file.name}`);
  // In a real app, this would upload to Firebase Storage and return the URL
  // const storageRef = ref(storage, `${recordLocator}/${file.name}`);
  // await uploadBytes(storageRef, file);
  // const downloadURL = await getDownloadURL(storageRef);
  // return { success: true, fileName: file.name, url: downloadURL };

  // Simulate a successful upload
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    success: true,
    message: `Resume "${file.name}" uploaded.`,
    fileName: file.name,
  };
}

export async function submitApplication(recordLocator: string, data: any) {
  console.log(`Submitting application for ${recordLocator}:`, data);
  // In a real app, this would set the submission timestamp and status
  // const db = getFirestore();
  // await db.collection('applicants').doc(applicantId).update({
  //   ...data,
  //   submittedAt: new Date(),
  //   status: 'Submitted'
  // });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  return { success: true, message: 'Application submitted successfully!' };
}
