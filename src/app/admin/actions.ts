'use server';

import { getAdminFirestore, verifyIsAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { triggerApplicantTokenEmail, triggerApplicantRejectionEmail } from '@/app/actions';

type ActionResult = { success: boolean; message: string };

// ── Approve a verification request ────────────────────────────────────
export async function adminApproveVerification(input: {
  idToken: string;
  uid: string;
  email: string;
  displayName: string | null;
  tokenId: string;
}): Promise<ActionResult> {
  try {
    const admin = await verifyIsAdmin(input.idToken);
    const db = getAdminFirestore();

    const applicantRef = db.collection('applicants').doc(input.tokenId);
    const applicantSnap = await applicantRef.get();
    if (!applicantSnap.exists) {
      return { success: false, message: 'Applicant token not found in /applicants.' };
    }

    const applicant = applicantSnap.data()!;
    if (applicant.email?.toLowerCase() !== input.email.toLowerCase()) {
      return { success: false, message: 'Token email does not match the pending verification email.' };
    }

    const batch = db.batch();

    batch.update(db.collection('pendingVerifications').doc(input.uid), {
      status: 'approved',
      approvedAt: FieldValue.serverTimestamp(),
    });

    batch.update(applicantRef, {
      status: 'token_sent',
      assignedUid: input.uid,
    });

    batch.update(db.collection('users').doc(input.uid), {
      status: 'token_sent',
    });

    batch.create(db.collection('auditLog').doc(), {
      action: 'approved_verification',
      adminUid: admin.uid,
      adminEmail: admin.email,
      candidateId: input.tokenId,
      candidateName: input.displayName || input.email,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    await triggerApplicantTokenEmail({
      email: input.email,
      displayName: input.displayName,
      token: input.tokenId,
    });

    return { success: true, message: 'Verification approved and token sent.' };
  } catch (err: any) {
    console.error('adminApproveVerification error:', err);
    return { success: false, message: err.message || 'Failed to approve.' };
  }
}

// ── Reject a verification request ─────────────────────────────────────
export async function adminRejectVerification(input: {
  idToken: string;
  uid: string;
  email: string;
  displayName: string | null;
}): Promise<ActionResult> {
  try {
    const admin = await verifyIsAdmin(input.idToken);
    const db = getAdminFirestore();

    const batch = db.batch();

    batch.update(db.collection('pendingVerifications').doc(input.uid), {
      status: 'rejected',
      rejectedAt: FieldValue.serverTimestamp(),
    });

    batch.update(db.collection('users').doc(input.uid), {
      status: 'pending',
    });

    batch.create(db.collection('auditLog').doc(), {
      action: 'rejected_verification',
      adminUid: admin.uid,
      adminEmail: admin.email,
      candidateId: '',
      candidateName: input.displayName || input.email,
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    await triggerApplicantRejectionEmail({
      email: input.email,
      displayName: input.displayName,
    });

    return { success: true, message: 'Verification rejected.' };
  } catch (err: any) {
    console.error('adminRejectVerification error:', err);
    return { success: false, message: err.message || 'Failed to reject.' };
  }
}

// ── Toggle admin status for a user ────────────────────────────────────
export async function adminSetUserAdmin(input: {
  idToken: string;
  targetUid: string;
  isAdmin: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await verifyIsAdmin(input.idToken);
    const db = getAdminFirestore();

    if (admin.uid === input.targetUid) {
      return { success: false, message: 'You cannot change your own admin status.' };
    }

    await db.collection('users').doc(input.targetUid).update({
      isAdmin: input.isAdmin,
    });

    return {
      success: true,
      message: `User is ${input.isAdmin ? 'now an admin' : 'no longer an admin'}.`,
    };
  } catch (err: any) {
    console.error('adminSetUserAdmin error:', err);
    return { success: false, message: err.message || 'Failed to update admin status.' };
  }
}

// ── Complete a deletion request ───────────────────────────────────────
export async function adminCompleteDeletion(input: {
  idToken: string;
  requestUid: string;
}): Promise<ActionResult> {
  try {
    const admin = await verifyIsAdmin(input.idToken);
    const db = getAdminFirestore();

    await db.collection('deletionRequests').doc(input.requestUid).update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      completedBy: admin.email,
    });

    return { success: true, message: 'Deletion marked as complete.' };
  } catch (err: any) {
    console.error('adminCompleteDeletion error:', err);
    return { success: false, message: err.message || 'Failed to complete deletion.' };
  }
}

// ── Reset a candidate ID ──────────────────────────────────────────────
export async function adminResetCandidateId(input: {
  idToken: string;
  candidateId: string;
}): Promise<ActionResult> {
  try {
    await verifyIsAdmin(input.idToken);
    const db = getAdminFirestore();

    await db.collection('candidateIds').doc(input.candidateId).delete();

    return { success: true, message: `Candidate ID ${input.candidateId} has been reset.` };
  } catch (err: any) {
    console.error('adminResetCandidateId error:', err);
    return { success: false, message: err.message || 'Failed to reset candidate ID.' };
  }
}
