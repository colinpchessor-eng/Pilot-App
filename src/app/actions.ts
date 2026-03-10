'use server';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { initializeFirebase } from '@/firebase';

export async function saveApplication(userId: string, data: any) {
  const { firestore } = initializeFirebase();
  console.log(`Saving application progress for ${userId}:`, data);

  const docRef = doc(firestore, 'users', userId);

  setDoc(docRef, data, { merge: true }).catch((serverError) => {
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
  });

  return { success: true, message: 'Progress saved successfully.' };
}

export async function uploadResume(userId: string, formData: FormData) {
  const file = formData.get('resume') as File;
  if (!file || file.size === 0) {
    return { success: false, message: 'No file selected.' };
  }

  console.log(`Uploading resume for ${userId}: ${file.name}`);
  // In a real app, this would upload to Firebase Storage and return the URL
  // const storageRef = ref(storage, `${userId}/${file.name}`);
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

export async function submitApplication(userId: string, data: any) {
  console.log(`Submitting application for ${userId}:`, data);
  const { firestore } = initializeFirebase();
  const docRef = doc(firestore, 'users', userId);

  const submissionData = {
    ...data,
    submittedAt: serverTimestamp(),
    status: 'Submitted',
  };

  setDoc(docRef, submissionData, { merge: true }).catch((serverError) => {
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
  });

  return { success: true, message: 'Application submitted successfully!' };
}
