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
    incidents: 'yes' | 'no' | undefined;
    accidents: 'yes' | 'no' | undefined;
    faaAction: 'yes' | 'no' | undefined;
  };
  resumeFileName: string | null;
  submittedAt: FieldValue | null;
  trainingCommitment: boolean;
};
