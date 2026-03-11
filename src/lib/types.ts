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
  typeRatings: { value: string }[];
  employmentHistory: EmploymentHistory[];
  safetyQuestions: {
    incidents: 'yes' | 'no' | null;
    accidents: 'yes' | 'no' | null;
    faaAction: 'yes' | 'no' | null;
  };
  resumeFileName: string | null;
  submittedAt: Timestamp | null;
  trainingCommitment: boolean;
};
