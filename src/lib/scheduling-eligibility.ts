import type { CandidateFlowStatus } from '@/lib/types';

/**
 * Eligibility for self-serve scheduling (no invitation email required in phase 1).
 *
 * Deploy checklist after changing collections or queries:
 * - `firebase deploy --only firestore:rules`
 * - `firebase deploy --only firestore:indexes` when composite indexes are added
 *
 * Manual QA: open two browsers, book the last seat on a session; the second confirm
 * should show “full” and `bookedCount` must not exceed `capacity`.
 */

/**
 * Who may book capacity-based testing sessions (cognitive / remote).
 * Tune these when adding invitation emails so links and eligibility stay aligned.
 */
const TESTING_BOOKING_FLOW_STATUSES: ReadonlySet<CandidateFlowStatus | string> = new Set([
  'under_review',
  'interview_sent',
  'scheduled',
  'testing_invited',
]);

/**
 * Who may book indoctrination class sessions (after interview is on the calendar).
 */
const INDOCTRINATION_BOOKING_FLOW_STATUSES: ReadonlySet<CandidateFlowStatus | string> = new Set([
  'scheduled',
  'indoctrination_invited',
  'hired',
]);

export function canBookTestingSession(flowStatus: string | null | undefined): boolean {
  if (!flowStatus) return false;
  return TESTING_BOOKING_FLOW_STATUSES.has(flowStatus);
}

export function canBookIndoctrinationSession(flowStatus: string | null | undefined): boolean {
  if (!flowStatus) return false;
  return INDOCTRINATION_BOOKING_FLOW_STATUSES.has(flowStatus);
}

/** True if this candidate already holds a confirmed testing seat (via candidateIds denorm). */
export function hasTestingBooking(
  data: { testingSessionId?: string | null; testingBookedAt?: unknown } | null | undefined
): boolean {
  if (!data) return false;
  return !!(data.testingSessionId && String(data.testingSessionId).trim());
}

/** True if this candidate already holds a confirmed indoctrination seat. */
export function hasIndoctrinationBooking(
  data: { indoctrinationSessionId?: string | null; indoctrinationBookedAt?: unknown } | null | undefined
): boolean {
  if (!data) return false;
  return !!(data.indoctrinationSessionId && String(data.indoctrinationSessionId).trim());
}
