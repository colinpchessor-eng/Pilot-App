import { Timestamp } from 'firebase/firestore';

/** Legacy data imported from previous application (Paradox) */
export type LegacyData = {
  candidateId?: string;
  legacyApplicationId?: string;
  flightTime?: {
    total?: number;
    turbinePIC?: number;
    military?: number;
    civilian?: number;
    multiEngine?: number;
    instructor?: number;
    evaluator?: number;
    sic?: number;
    other?: number;
    dateLastFlown?: string;
    lastAircraftFlown?: string;
  };
  lastEmployer?: {
    from?: string;
    to?: string;
    company?: string;
    title?: string;
    city?: string;
    state?: string;
  };
  lastResidence?: {
    from?: string;
    to?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
};

export type VerificationStatus = 'pending' | 'token_sent' | 'verified';
export type UserRole = 'admin';

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
  displayName?: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Timestamp;
  isAdmin?: boolean;
  role?: UserRole;
  status?: VerificationStatus;
  requestedAt?: Timestamp | null;
  verifiedAt?: Timestamp | null;
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
  candidateId?: string | null;
  legacyData?: LegacyData | null;
};
