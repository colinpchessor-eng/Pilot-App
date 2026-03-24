import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';

export type CandidateSelfAuditAction =
  | 'candidate_registered'
  | 'candidate_verified'
  | 'application_started'
  | 'application_submitted';

/** Candidate-facing audit events (Firestore rules restrict keys and uid). */
export async function writeCandidateAuditLog(
  firestore: Firestore,
  params: {
    uid: string;
    action: CandidateSelfAuditAction;
    candidateName?: string;
    candidateEmail?: string | null;
    candidateId?: string;
  }
): Promise<void> {
  await addDoc(collection(firestore, 'auditLog'), {
    action: params.action,
    uid: params.uid,
    candidateName: params.candidateName ?? '',
    candidateEmail: params.candidateEmail ?? '',
    candidateId: params.candidateId ?? '',
    timestamp: serverTimestamp(),
  });
}
