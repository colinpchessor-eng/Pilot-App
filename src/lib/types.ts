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
    terminations: 'yes' | 'no' | null;
    askedToResign: 'yes' | 'no' | null;
    accidents: 'yes' | 'no' | null;
    incidents: 'yes' | 'no' | null;
    flightViolations: 'yes' | 'no' | null;
    certificateAction: 'yes' | 'no' | null;
    pendingFaaAction: 'yes' | 'no' | null;
    failedCheckRide: 'yes' | 'no' | null;
    formalDiscipline: 'yes' | 'no' | null;
    investigationBoard: 'yes' | 'no' | null;
    previousInterview: 'yes' | 'no' | null;
    trainingCommitmentConflict: 'yes' | 'no' | null;
    otherInfo: 'yes' | 'no' | null;
  };
  safetyExplanation: string | null;
  resumeFileName: string | null;
  submittedAt: Timestamp | null;
  isCertified: boolean;
  printedName: string | null;
};
