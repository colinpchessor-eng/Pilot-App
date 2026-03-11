import type { ApplicantData, SafetyQuestion } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';

const ACKNOWLEDGMENT_QUESTIONS_MAP: Record<string, string> = {
    terminations: 'Terminations or resignations in lieu of from any FAA covered positions?',
    askedToResign: 'Asked to resign from any FAA covered position?',
    accidents: 'Aircraft accidents?',
    incidents: 'Aircraft Incidents?',
    flightViolations: 'Flight violations?',
    certificateAction: 'Certificate suspension/revocation?',
    pendingFaaAction: 'Pending FAA Action/Letters of investigation?',
    failedCheckRide: 'Have you ever failed a flight check ride, proficiency check, flight eval, or upgrade attempt aircraft or while compensated as a professional pilot (in the last three years)?',
    formalDiscipline: 'Have you ever received formal discipline from your?',
    investigationBoard: 'Have you ever been called before a field board of investigation for any reason?',
    previousInterview: 'Have you previously interviewed for the following positions at Fedex (not counting the one that you were hired under)?',
    trainingCommitmentConflict: 'Do you have any commitment that will not allow you to enter and complete uninterrupted a training syllabus of approximately 10 weeks once commenced?',
    otherInfo: 'Is there anything else you feel warrants and that you would like to bring up at this time?',
};


function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value || 'N/A'}</dd>
    </div>
  );
}

function SafetyQuestionItem({ questionKey, questionData }: { questionKey: string, questionData: SafetyQuestion }) {
    const questionLabel = ACKNOWLEDGMENT_QUESTIONS_MAP[questionKey];
    if (!questionLabel) return null;

    return (
        <div className="space-y-2 rounded-md border p-4">
            <p className="font-medium">{questionLabel}</p>
            <div className='flex items-center gap-2'>
                <p className="text-muted-foreground">Answer:</p>
                <Badge variant={questionData.answer === 'yes' ? 'destructive' : 'secondary'}>
                    {questionData.answer?.toUpperCase() ?? 'Not Answered'}
                </Badge>
            </div>
            {questionData.answer === 'yes' && (
                <div className='space-y-1'>
                    <p className="text-muted-foreground">Explanation:</p>
                    <p className="text-sm pl-4 border-l-2 ml-2">{questionData.explanation || 'No explanation provided.'}</p>
                </div>
            )}
        </div>
    );
}

export function ApplicationViewer({ applicantData }: { applicantData: ApplicantData }) {
  const fullName = [applicantData.firstName, applicantData.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-6 print:space-y-4">
      <Card className="print:shadow-none print:border-none print:p-0">
        <CardHeader>
          <CardTitle className="text-2xl">{fullName}</CardTitle>
          <CardDescription>{applicantData.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <DetailItem label="Submitted On" value={applicantData.submittedAt ? format(applicantData.submittedAt.toDate(), 'PPP p') : 'N/A'} />
            <DetailItem label="ATP Number" value={applicantData.atpNumber} />
            <DetailItem label="First Class Medical Date" value={applicantData.firstClassMedicalDate ? format(applicantData.firstClassMedicalDate.toDate(), 'PPP') : 'N/A'} />
          </dl>
        </CardContent>
      </Card>

      <Card className="print:shadow-none print:border-none print:p-0">
        <CardHeader>
          <CardTitle>Flight Time</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <DetailItem label="Total Hours" value={applicantData.flightTime.total} />
            <DetailItem label="Turbine PIC" value={applicantData.flightTime.turbinePic} />
            <DetailItem label="Multi-Engine" value={applicantData.flightTime.multiEngine} />
            <DetailItem label="Military" value={applicantData.flightTime.military} />
            <DetailItem label="Civilian" value={applicantData.flightTime.civilian} />
            <DetailItem label="Instructor" value={applicantData.flightTime.instructor} />
            <DetailItem label="Evaluator" value={applicantData.flightTime.evaluator} />
            <DetailItem label="SIC" value={applicantData.flightTime.sic} />
            <DetailItem label="Other" value={applicantData.flightTime.other} />
          </dl>
        </CardContent>
      </Card>

      <Card className="print:shadow-none print:border-none print:p-0">
        <CardHeader>
            <CardTitle>Aeronautical Ratings and Certificates</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="whitespace-pre-wrap">{applicantData.typeRatings || 'N/A'}</p>
        </CardContent>
      </Card>

      <Card className="print:shadow-none print:border-none print:p-0">
        <CardHeader>
          <CardTitle>Employment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {applicantData.employmentHistory && applicantData.employmentHistory.length > 0 ? (
            applicantData.employmentHistory.map((job, index) => (
              <div key={index} className="space-y-4">
                <div className="space-y-2">
                    <h3 className="font-semibold">{job.employerName}</h3>
                    <p className="text-sm text-muted-foreground">{job.jobTitle}</p>
                    <p className="text-sm text-muted-foreground">
                        {format(job.startDate.toDate(), 'MMM yyyy')} - {job.endDate ? format(job.endDate.toDate(), 'MMM yyyy') : 'Present'}
                    </p>
                </div>
                <dl className="space-y-2">
                    <DetailItem label="Aircraft Flown" value={job.aircraftTypes} />
                    <DetailItem label="Total Hours" value={job.totalHours} />
                    <DetailItem label="Duties" value={<p className="whitespace-pre-wrap">{job.duties}</p>} />
                </dl>
                {index < applicantData.employmentHistory.length - 1 && <Separator />}
              </div>
            ))
          ) : (
            <p>No employment history provided.</p>
          )}
        </CardContent>
      </Card>

      <Card className="print:shadow-none print:border-none print:p-0">
        <CardHeader>
            <CardTitle>Applicant Acknowledgment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {Object.entries(applicantData.safetyQuestions).map(([key, value]) => (
                <SafetyQuestionItem key={key} questionKey={key} questionData={value} />
            ))}
             <Separator className="my-6" />
             <div className='space-y-4'>
                <h3 className='font-semibold'>Certification</h3>
                <DetailItem label="Certified Accurate" value={applicantData.isCertified ? 'Yes' : 'No'} />
                <DetailItem label="Printed Name (Signature)" value={applicantData.printedName} />
             </div>
        </CardContent>
      </Card>

    </div>
  );
}
