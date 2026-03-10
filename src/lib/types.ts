export type ApplicantData = {
  id: string; // Document ID
  recordLocator: string;
  atpNumber: string;
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
  submittedAt: Date | null;
  trainingCommitment: boolean;
};
