import { Timestamp } from 'firebase/firestore';

export type EmploymentHistory = {
  employerName: string;
  jobTitle: string;
  startDate: Timestamp;
  endDate: Timestamp | null;
  aircraftTypes: string;
  totalHours: number;
  duties: string;
};

export type SafetyQuestion = {
  answer: 'yes' | 'no' | null;
  explanation: string | null;
};

export type ApplicantData = {
  uid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Timestamp;
  firstClassMedicalDate: Timestamp | null;
  atpNumber: string | null;
  flightTime: {
    total: number;
    turbinePic: number;
    military: number;
    civilian: number;
    multiEngine: number;
    instructor: number;
    evaluator: number;
    sic: number;
    other: number;
  };
  typeRatings: string;
  employmentHistory: EmploymentHistory[];
  safetyQuestions: {
    terminations: SafetyQuestion;
    askedToResign: SafetyQuestion;
    accidents: SafetyQuestion;
    incidents: SafetyQuestion;
    flightViolations: SafetyQuestion;
    certificateAction: SafetyQuestion;
    pendingFaaAction: SafetyQuestion;
    failedCheckRide: SafetyQuestion;
    formalDiscipline: SafetyQuestion;
    investigationBoard: SafetyQuestion;
    previousInterview: SafetyQuestion;
    trainingCommitmentConflict: SafetyQuestion;
    otherInfo: SafetyQuestion;
  };
  submittedAt: Timestamp | null;
  isCertified: boolean;
  printedName: string | null;
};
