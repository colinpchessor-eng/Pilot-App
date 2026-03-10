import { ApplicationForm } from '@/components/application-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ApplicantData } from '@/lib/types';

// Mock data fetching function
async function getApplicantData(
  recordLocator: string
): Promise<ApplicantData | null> {
  // In a real app, this would fetch from Firestore
  if (['ABCDEF', 'GHIJKL'].includes(recordLocator.toUpperCase())) {
    return {
      id: 'doc123',
      recordLocator: recordLocator.toUpperCase(),
      atpNumber: recordLocator.toUpperCase() === 'ABCDEF' ? '12345' : '67890',
      flightTime: { total: 0, multiCrew: 0, pic: 0 },
      typeRatings: [],
      safetyQuestions: {
        incidents: undefined,
        accidents: undefined,
        faaAction: undefined,
      },
      resumeFileName: null,
      submittedAt: null,
      trainingCommitment: false,
    };
  }
  return null;
}

export default async function DashboardPage({
  params,
}: {
  params: { recordLocator: string };
}) {
  const applicantData = await getApplicantData(params.recordLocator);

  if (!applicantData) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Applicant with Record Locator "{params.recordLocator}" not found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <ApplicationForm applicantData={applicantData} />
    </div>
  );
}
