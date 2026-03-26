'use server';

import { getAdminFirestore, verifyIdToken } from '@/lib/firebase-admin';
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
    if (!inputId) return { ok: false, error: 'Invalid Candidate ID.' };

    const db = getAdminFirestore();
    const candidateRef = db.collection('candidateIds').doc(inputId);
    const candidateSnap = await candidateRef.get();
    if (!candidateSnap.exists) {
      return {
        ok: false,
        error: 'Invalid Candidate ID. Please check your email and try again.',
      };
    }

    const candidateData = candidateSnap.data()!;

    if (candidateData.status === 'claimed' && candidateData.assignedUid !== uid) {
      return { ok: false, error: 'This Candidate ID has already been used.' };
    }

    const isMasterKey = candidateData.masterKey === true;

    if (isMasterKey) {
      if (masterKeyExpired(candidateData.masterKeyExpiry as Timestamp | undefined)) {
        return {
          ok: false,
          error: 'This Candidate ID has expired. Please contact HR for assistance.',
        };
      }
      const authorizedEmails = (candidateData.masterKeyEmails as string[] | undefined) || [];
      if (authorizedEmails.length > 0) {
        const lowered = authorizedEmails.map((e) => e.toLowerCase());
        if (!lowered.includes(authEmail)) {
          return {
            ok: false,
            error: 'This Candidate ID is not authorized for your account.',
          };
        }
      }
    } else {
      const docEmail = candidateData.email as string | undefined;
      if (docEmail && docEmail.toLowerCase() !== authEmail) {
        return {
          ok: false,
          error:
            'This Candidate ID is not associated with your account. Please use the email address your Candidate ID was sent to.',
        };
      }
    }

    const userRef = db.collection('users').doc(uid);
    const legacyApplicationId = (candidateData.legacyApplicationId as string) || '';

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
      status: 'verified',
      verifiedAt: FieldValue.serverTimestamp(),
      legacyApplicationId,
      candidateId: inputId,
      candidateFlowStatus: 'verified',
    };
    if (legacySnap.exists) {
      userPatch.legacyData = legacySnap.data() as DocumentData;
    }
    batch.update(userRef, userPatch);

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
