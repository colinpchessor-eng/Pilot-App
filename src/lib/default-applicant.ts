import { serverTimestamp } from 'firebase/firestore';
import type { ApplicantData, CandidateFlowStatus } from '@/lib/types';

export function buildDefaultApplicantData(input: {
  uid: string;
  email: string | null;
  displayName?: string | null;
}): ApplicantData {
  return {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName ?? null,
    firstName: null,
    lastName: null,
    createdAt: serverTimestamp() as any,
    status: 'pending',
    candidateFlowStatus: 'registered' as CandidateFlowStatus,
    requestedAt: null,
    verifiedAt: null,
    firstClassMedicalDate: null,
    atpNumber: null,
    flightTime: {
      total: 0,
      turbinePic: 0,
      military: 0,
      civilian: 0,
      multiEngine: 0,
      instructor: 0,
      evaluator: 0,
      sic: 0,
      other: 0,
      nightHours: 0,
      lastAircraftFlown: '',
      dateLastFlown: '',
    },
    typeRatings: '',
    employmentHistory: [],
    safetyQuestions: {
      terminations: { answer: null, explanation: null },
      askedToResign: { answer: null, explanation: null },
      accidents: { answer: null, explanation: null },
      incidents: { answer: null, explanation: null },
      flightViolations: { answer: null, explanation: null },
      certificateAction: { answer: null, explanation: null },
      pendingFaaAction: { answer: null, explanation: null },
      failedCheckRide: { answer: null, explanation: null },
      formalDiscipline: { answer: null, explanation: null },
      investigationBoard: { answer: null, explanation: null },
      previousInterview: { answer: null, explanation: null },
      trainingCommitmentConflict: { answer: null, explanation: null },
      otherInfo: { answer: null, explanation: null },
    },
    submittedAt: null,
    isCertified: false,
    printedName: null,
  };
}

