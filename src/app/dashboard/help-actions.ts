'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore, verifyIdToken } from '@/lib/firebase-admin';
import {
  triggerAdminLegacyDeletionRequestEmail,
  triggerAdminUnlockApplicationRequestEmail,
} from '@/app/actions';

export type ActionResult = { success: true; message: string } | { success: false; message: string };

export async function submitLegacyDeletionRequest(input: {
  idToken: string;
  notes: string;
  californiaRightsAcknowledged: boolean;
}): Promise<ActionResult> {
  if (!input.californiaRightsAcknowledged) {
    return { success: false, message: 'Confirm you have reviewed your California privacy rights.' };
  }
  const notes = input.notes.trim();
  if (notes.length < 10) {
    return { success: false, message: 'Please add a short description of your request (at least 10 characters).' };
  }

  try {
    const decoded = await verifyIdToken(input.idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? '';
    const db = getAdminFirestore();

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data();
    const name =
      userData?.firstName || userData?.lastName
        ? [userData.firstName, userData.lastName].filter(Boolean).join(' ').trim()
        : userData?.displayName ?? decoded.name ?? null;
    const candidateId =
      typeof userData?.candidateId === 'string' && userData.candidateId ? userData.candidateId : null;

    const ref = db.collection('deletionRequests').doc(uid);
    const existing = await ref.get();
    if (existing.exists && existing.data()?.status === 'pending') {
      return {
        success: false,
        message: 'You already have a pending deletion request. An administrator will process it as soon as possible.',
      };
    }

    await ref.set({
      uid,
      email: email || '',
      name: name ?? '',
      candidateId,
      requestedAt: FieldValue.serverTimestamp(),
      status: 'pending',
      notes,
    });

    await triggerAdminLegacyDeletionRequestEmail({
      uid,
      email: email || '',
      name,
      candidateId,
      notes,
    });

    return {
      success: true,
      message: 'Your request was submitted. An administrator will review it and may follow up by email.',
    };
  } catch (e) {
    console.error('submitLegacyDeletionRequest', e);
    return { success: false, message: 'Could not submit your request. Please try again or contact support.' };
  }
}

export async function submitUnlockApplicationRequest(input: {
  idToken: string;
  reason: string;
}): Promise<ActionResult> {
  const reason = input.reason.trim();
  if (reason.length < 15) {
    return {
      success: false,
      message: 'Please explain what you need to change (at least 15 characters) so an administrator can help.',
    };
  }

  try {
    const decoded = await verifyIdToken(input.idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? '';
    const db = getAdminFirestore();

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data();
    const name =
      userData?.firstName || userData?.lastName
        ? [userData.firstName, userData.lastName].filter(Boolean).join(' ').trim()
        : userData?.displayName ?? decoded.name ?? null;
    const candidateId =
      typeof userData?.candidateId === 'string' && userData.candidateId ? userData.candidateId : null;

    const pendingSnap = await db
      .collection('applicationUnlockRequests')
      .where('uid', '==', uid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!pendingSnap.empty) {
      return {
        success: false,
        message: 'You already have a pending unlock request. An administrator will respond when it is processed.',
      };
    }

    await db.collection('applicationUnlockRequests').add({
      uid,
      email: email || '',
      name: name ?? '',
      candidateId,
      reason,
      requestedAt: FieldValue.serverTimestamp(),
      status: 'pending',
    });

    await triggerAdminUnlockApplicationRequestEmail({
      uid,
      email: email || '',
      name,
      candidateId,
      reason,
    });

    return {
      success: true,
      message: 'Your request was sent. An administrator may unlock your application after review.',
    };
  } catch (e) {
    console.error('submitUnlockApplicationRequest', e);
    return { success: false, message: 'Could not submit your request. Please try again or contact support.' };
  }
}

export async function submitSupportTicket(input: {
  idToken: string;
  subject: string;
  message: string;
}): Promise<ActionResult> {
  const subject = input.subject.trim();
  const message = input.message.trim();

  if (subject.length < 5 || subject.length > 150) {
    return { success: false, message: 'Subject must be between 5 and 150 characters.' };
  }
  if (message.length < 10 || message.length > 3000) {
    return { success: false, message: 'Message must be between 10 and 3000 characters.' };
  }

  try {
    const decoded = await verifyIdToken(input.idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? '';
    const db = getAdminFirestore();

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data();
    const name =
      userData?.firstName || userData?.lastName
        ? [userData.firstName, userData.lastName].filter(Boolean).join(' ').trim()
        : userData?.displayName ?? decoded.name ?? null;
    const candidateId =
      typeof userData?.candidateId === 'string' && userData.candidateId ? userData.candidateId : null;

    const pendingSnap = await db
      .collection('supportTickets')
      .where('uid', '==', uid)
      .where('status', 'in', ['open', 'in_progress'])
      .get();
      
    if (pendingSnap.size >= 3) {
      return { success: false, message: 'You have too many open tickets. Please wait for an administrator to respond.' };
    }

    await db.collection('supportTickets').add({
      uid,
      email: email || '',
      name: name ?? '',
      candidateId: candidateId || '',
      subject,
      message,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Your support ticket has been submitted successfully.' };
  } catch (e) {
    console.error('submitSupportTicket', e);
    return { success: false, message: 'Could not submit your ticket. Please try again later.' };
  }
}
