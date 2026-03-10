import { Timestamp } from "firebase/firestore";

export type ApplicantData = {
  uid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Timestamp;
  flightTime: {
    total: number;
    multiCrew: number;
    pic: number;
  };
  typeRatings: { value: string }[];
  safetyQuestions: {
    incidents: 'yes' | 'no' | null;
    accidents: 'yes' | 'no' | null;
    faaAction: 'yes' | 'no' | null;
  };
  resumeFileName: string | null;
  submittedAt: Timestamp | null;
  trainingCommitment: boolean;
};
