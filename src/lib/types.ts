import { FieldValue } from "firebase/firestore";

export type ApplicantData = {
  uid: string;
  email: string | null;
  name: string | null;
  createdAt: FieldValue;
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
  submittedAt: FieldValue | null;
  trainingCommitment: boolean;
};
