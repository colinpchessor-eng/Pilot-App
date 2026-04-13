import { Timestamp } from 'firebase/firestore';

/** Single aircraft line from legacy import HTML / Firestore. */
export type LegacyAircraftRow = {
  aircraft?: string;
  type?: string;
  pic?: number;
  PIC?: number;
  sic?: number;
  SIC?: number;
  instructor?: number;
  Instructor?: number;
  night?: number;
  nightHours?: number;
  multiEngine?: number;
  lastFlown?: string;
  lastFlownDate?: string;
  turbinePIC?: number;
  turbinePic?: number;
};

/** Legacy data imported from previous application (Paradox) */
export type LegacyData = {
  candidateId?: string;
  legacyApplicationId?: string;
  /** Per-aircraft rows when import stores a breakdown (enables review-page recalculation). */
  flightTime?: {
    total?: number;
    turbinePIC?: number;
    /** Alternate casing from some imports / Firestore mirrors. */
    turbinePic?: number;
    /** Corrected rollup from import script (preferred over legacy totals). */
    totalPIC?: number;
    totalSIC?: number;
    totalInstructor?: number;
    nightHours?: number;
    military?: number;
    civilian?: number;
    multiEngine?: number;
    instructor?: number;
    evaluator?: number;
    sic?: number;
    other?: number;
    dateLastFlown?: string;
    lastAircraftFlown?: string;
    aircraft?: LegacyAircraftRow[];
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
export type UserRole = 'admin' | 'dev' | 'candidate';

/** Hiring pipeline position; mirrors candidateIds.flowStatus on the user doc when linked. */
export type CandidateFlowStatus =
  | 'imported'
  | 'invited'
  | 'registered'
  | 'verified'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'testing_invited'
  | 'testing_scheduled'
  | 'interview_sent'
  | 'scheduled'
  | 'indoctrination_invited'
  | 'indoctrination_scheduled'
  | 'hired'
  | 'not_selected';

/** Cognitive vs remote capacity-based testing session (see `testingSessions`). */
export type TestingSessionKind = 'cognitive' | 'remote';

export type CapacitySessionBookingStatus = 'confirmed' | 'cancelled';

export type TestingSessionDoc = {
  date: Timestamp;
  kind: TestingSessionKind;
  capacity: number;
  bookedCount: number;
  active: boolean;
  notes: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
};

export type TestingBookingDoc = {
  sessionId: string;
  candidateUid: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  scheduledFor: Timestamp;
  status: CapacitySessionBookingStatus;
  createdAt: Timestamp;
};

export type IndoctrinationSessionDoc = {
  date: Timestamp;
  capacity: number;
  bookedCount: number;
  active: boolean;
  notes: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
};

export type IndoctrinationBookingDoc = {
  sessionId: string;
  candidateUid: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  scheduledFor: Timestamp;
  status: CapacitySessionBookingStatus;
  createdAt: Timestamp;
};

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
  /** When true with role admin, allows Developer Tools in production builds. */
  devToolsEnabled?: boolean;
  role?: UserRole;
  status?: VerificationStatus;
  requestedAt?: Timestamp | null;
  verifiedAt?: Timestamp | null;
  /** Plain dates use Timestamp; encrypted-at-rest values are AES strings (see encryption-server). */
  firstClassMedicalDate: Timestamp | string | null;
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
    nightHours?: number;
    lastAircraftFlown?: string;
    dateLastFlown?: string;
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
  /** Mirrors linked candidateIds.flowStatus for this applicant. */
  candidateFlowStatus?: CandidateFlowStatus | string | null;
  /** Pre-authorized HR/dev accounts: skip Candidate ID gate on dashboard. */
  skipCandidateVerification?: boolean;
  consentGiven?: boolean;
  consentTimestamp?: Timestamp | null;
  consentVersion?: string;
  privacyPolicyVersion?: string;
};

export type InterviewSlotStatus = 'available' | 'booked' | 'cancelled';
export type InterviewSlotFormat = 'In Person' | 'Video';

export type InterviewSlotDoc = {
  date: Timestamp;
  startTime: string;
  endTime: string;
  duration: number;
  location: string;
  format: InterviewSlotFormat;
  videoLink: string;
  status: InterviewSlotStatus;
  bookedBy: string;
  bookedByName: string;
  bookedByEmail: string;
  bookedAt: Timestamp | null;
  createdBy: string;
  notes: string;
};

export type InterviewBookingStatus = 'confirmed' | 'cancelled' | 'completed';

export type InterviewBookingDoc = {
  slotId: string;
  candidateUid: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  adminUid: string;
  scheduledFor: Timestamp;
  status: InterviewBookingStatus;
  createdAt: Timestamp;
};
