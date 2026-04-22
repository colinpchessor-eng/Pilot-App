'use server';

import { getAdminFirestore, verifyIdToken } from '@/lib/firebase-admin';
import { buildSubmissionEmail } from '@/lib/email';
import {
  FieldValue,
  type DocumentData,
  type Timestamp,
  type UpdateData,
} from 'firebase-admin/firestore';

export type VerificationActionResult = { ok: true } | { ok: false; error: string };

function masterKeyExpired(expiry: Timestamp | undefined): boolean {
  if (!expiry || typeof expiry.toDate !== 'function') return false;
  return expiry.toDate() < new Date();
}

/** Email token path: claim /applicants/{tokenId} and set user verified (Admin SDK; not client-writable). */
export async function completeApplicantTokenVerification(input: {
  idToken: string;
  tokenId: string;
}): Promise<VerificationActionResult> {
  try {
    const decoded = await verifyIdToken(input.idToken);
    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();
    const tokenId = input.tokenId.trim().toUpperCase();
    if (!tokenId) return { ok: false, error: 'Invalid token.' };

    const db = getAdminFirestore();
    const applicantRef = db.collection('applicants').doc(tokenId);
    const applicantSnap = await applicantRef.get();
    if (!applicantSnap.exists) {
      return { ok: false, error: 'Token not found or does not match your account' };
    }

    const applicant = applicantSnap.data()!;
    const applicantEmail = String(applicant.email || '').toLowerCase();
    if (!applicantEmail || applicantEmail !== email) {
      return { ok: false, error: 'Token not found or does not match your account' };
    }

    const assignedUid = applicant.assignedUid as string | null | undefined;
    const status = applicant.status as string | undefined;

    if (status === 'claimed' && assignedUid && assignedUid !== uid) {
      return { ok: false, error: 'Token not found or does not match your account' };
    }

    const batch = db.batch();
    if (!(status === 'claimed' && assignedUid === uid)) {
      batch.update(applicantRef, {
        assignedUid: uid,
        status: 'claimed',
      });
    }
    batch.update(db.collection('users').doc(uid), {
      status: 'verified',
      verifiedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to verify token.';
    return { ok: false, error: msg };
  }
}

/** Candidate ID claim: validate row then update candidateIds + user (Admin SDK). */
export async function completeCandidateIdVerification(input: {
  idToken: string;
  candidateId: string;
}): Promise<VerificationActionResult> {
  try {
    const decoded = await verifyIdToken(input.idToken);
    const uid = decoded.uid;
    const authEmail = (decoded.email || '').toLowerCase();
    const inputId = input.candidateId.trim().toUpperCase();
    if (!inputId) return { ok: false, error: 'Invalid Legacy ID.' };

    const db = getAdminFirestore();
    const candidateRef = db.collection('candidateIds').doc(inputId);
    const candidateSnap = await candidateRef.get();
    if (!candidateSnap.exists) {
      return {
        ok: false,
        error: 'Invalid Legacy ID. Please check your email and try again.',
      };
    }

    const candidateData = candidateSnap.data()!;

    if (candidateData.status === 'claimed' && candidateData.assignedUid !== uid) {
      return { ok: false, error: 'This Legacy ID has already been used.' };
    }

    const isMasterKey = candidateData.masterKey === true;

    if (isMasterKey) {
      if (masterKeyExpired(candidateData.masterKeyExpiry as Timestamp | undefined)) {
        return {
          ok: false,
          error: 'This Legacy ID has expired. Please contact HR for assistance.',
        };
      }
      const authorizedEmails = (candidateData.masterKeyEmails as string[] | undefined) || [];
      if (authorizedEmails.length > 0) {
        const lowered = authorizedEmails.map((e) => e.toLowerCase());
        if (!lowered.includes(authEmail)) {
          return {
            ok: false,
            error: 'This Legacy ID is not authorized for your account.',
          };
        }
      }
    }

    const userRef = db.collection('users').doc(uid);
    const legacyApplicationId =
      ((candidateData.legacyApplicationId as string) || '').trim() || inputId;

    const batch = db.batch();
    batch.update(candidateRef, {
      status: 'claimed',
      assignedUid: uid,
      claimedAt: FieldValue.serverTimestamp(),
      flowStatus: 'verified',
      verifiedAt: FieldValue.serverTimestamp(),
      flowStatusUpdatedAt: FieldValue.serverTimestamp(),
    });
    const legacyRef = db.collection('legacyData').doc(inputId);
    const legacySnap = await legacyRef.get();

    const userPatch: UpdateData<DocumentData> = {
      uid,
      email: decoded.email ?? null,
      createdAt: FieldValue.serverTimestamp(),
      isAdmin: false,
      status: 'verified',
      verifiedAt: FieldValue.serverTimestamp(),
      legacyApplicationId,
      candidateId: inputId,
      candidateFlowStatus: 'verified',
    };
    if (legacySnap.exists) {
      userPatch.legacyData = legacySnap.data() as DocumentData;
    }
    // merge: signup may not have written users/{uid} yet; update would fail on missing doc
    batch.set(userRef, userPatch, { merge: true });

    await batch.commit();

    const userAfter = await userRef.get();
    const u = userAfter.data() || {};
    const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    await db.collection('auditLog').add({
      action: 'candidate_verified',
      uid,
      candidateName: displayName,
      candidateEmail: decoded.email || '',
      candidateId: inputId,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Verification failed.';
    return { ok: false, error: msg };
  }
}

/** Copy legacyData/{candidateId} → users/{uid} when verified and missing mirror (server-only). */
export async function syncLegacyDataForUser(input: { idToken: string }): Promise<VerificationActionResult> {
  try {
    const decoded = await verifyIdToken(input.idToken);
    const uid = decoded.uid;
    const db = getAdminFirestore();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return { ok: false, error: 'User not found.' };
    const u = userSnap.data()!;
    if (u.status !== 'verified' || !u.candidateId) return { ok: true };
    if (u.legacyData != null) return { ok: true };

    const cid = String(u.candidateId).trim().toUpperCase();
    const legacySnap = await db.collection('legacyData').doc(cid).get();
    if (!legacySnap.exists) return { ok: true };

    await userRef.update({ legacyData: legacySnap.data() });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to sync legacy data.';
    return { ok: false, error: msg };
  }
}

/** First application open: pipeline timestamps on candidateIds + user candidateFlowStatus (server-only). */
export async function markApplicationFlowOpened(input: { idToken: string }): Promise<VerificationActionResult> {
  try {
    const decoded = await verifyIdToken(input.idToken);
    const uid = decoded.uid;
    const db = getAdminFirestore();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return { ok: false, error: 'User not found.' };
    const u = userSnap.data()!;
    const candidateId = u.candidateId as string | null | undefined;
    if (!candidateId || u.status !== 'verified') return { ok: true };

    const cid = String(candidateId).trim().toUpperCase();
    const candRef = db.collection('candidateIds').doc(cid);
    const candSnap = await candRef.get();
    if (!candSnap.exists) return { ok: false, error: 'Candidate record not found.' };
    const c = candSnap.data()!;
    if (c.assignedUid !== uid) return { ok: false, error: 'Not authorized.' };
    if (c.applicationStartedAt) return { ok: true };

    const batch = db.batch();
    batch.update(candRef, {
      flowStatus: 'in_progress',
      applicationStartedAt: FieldValue.serverTimestamp(),
      flowStatusUpdatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(userRef, {
      candidateFlowStatus: 'in_progress',
    });
    await batch.commit();

    const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    await db.collection('auditLog').add({
      action: 'application_started',
      uid,
      candidateName: displayName,
      candidateEmail: decoded.email || '',
      candidateId: cid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to update application status.';
    return { ok: false, error: msg };
  }
}

/** Send submission confirmation email via Admin SDK (bypasses Firestore rules; handles contactEmail override). */
export async function sendSubmissionEmailAction(input: {
  idToken: string;
  uid: string;
}): Promise<void> {
  const decoded = await verifyIdToken(input.idToken);
  if (decoded.uid !== input.uid) throw new Error('Token mismatch');

  const db = getAdminFirestore();
  const userSnap = await db.collection('users').doc(decoded.uid).get();
  const userData = userSnap.data();
  if (!userData) throw new Error('User not found');

  const nm = [userData.firstName as string | undefined, userData.lastName as string | undefined]
    .filter(Boolean).join(' ').trim();
  const cid = (userData.candidateId as string | undefined)?.trim() || '';

  // Prefer admin-set contactEmail override, fall back to auth email
  let toEmail = decoded.email || '';
  if (cid) {
    const candSnap = await db.collection('candidateIds').doc(cid).get();
    if (candSnap.exists) {
      const d = candSnap.data()!;
      const override = d.contactEmail as string | undefined;
      if (override && override.trim()) toEmail = override.trim();
    }
  }
  if (!toEmail) throw new Error('No email address on file');

  const submittedAt = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.NEXT_PUBLIC_EMAIL_FROM?.trim() ||
    'FedEx Pilot Portal <noreply@localhost>';
  const replyTo =
    process.env.EMAIL_REPLY_TO?.trim() ||
    process.env.NEXT_PUBLIC_EMAIL_REPLY_TO?.trim() ||
    'support@localhost';

  await db.collection('mail').add({
    to: toEmail,
    from,
    replyTo,
    message: {
      subject: 'FedEx Pilot History Update Received — Thank You',
      html: buildSubmissionEmail(nm, toEmail, submittedAt),
    },
    type: 'application_submitted',
    candidateId: cid,
    candidateName: nm,
    sentBy: 'system',
    sentByEmail: 'system',
    portalOrigin: process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000',
    createdAt: FieldValue.serverTimestamp(),
    status: 'pending',
  });
}
