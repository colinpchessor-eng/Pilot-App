import type { ApplicantData, SafetyQuestion } from '@/lib/types';
import { decryptField, isEncrypted } from '@/lib/encryption';
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
import { Icons } from '../icons';
import { cn } from '@/lib/utils';

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

const SAFETY_INCIDENTS_QUESTIONS = [
    'terminations', 'askedToResign', 'accidents', 'incidents',
    'flightViolations', 'certificateAction', 'pendingFaaAction',
    'investigationBoard', 'formalDiscipline'
];

const TRAINING_QUESTIONS = [
    'failedCheckRide', 'trainingCommitmentConflict',
];

const OTHER_QUESTIONS = [
    'previousInterview', 'otherInfo'
];


function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2">
      <dt className="text-sm font-medium text-muted-foreground print-sans">{label}</dt>
      <dd className="col-span-2 text-sm print-mono">{value || 'N/A'}</dd>
    </div>
  );
}

function SafetyQuestionItem({ questionKey, questionData }: { questionKey: string, questionData: SafetyQuestion }) {
    const questionLabel = ACKNOWLEDGMENT_QUESTIONS_MAP[questionKey];
    if (!questionLabel) return null;

    return (
        <div className={cn(
            'space-y-2 rounded-md border p-4',
             questionData.answer === 'yes' && 'print-highlight-yes'
        )}>
            <p className="font-medium print-sans">{questionLabel}</p>
            <div className='flex items-center gap-2'>
                <p className="text-muted-foreground print-sans">Answer:</p>
                <Badge variant={questionData.answer === 'yes' ? 'destructive' : 'secondary'}>
                    {questionData.answer?.toUpperCase() ?? 'Not Answered'}
                </Badge>
            </div>
            {questionData.answer === 'yes' && (
                <div className='space-y-1'>
                    <p className="text-muted-foreground print-sans">Explanation:</p>
                    <p className="text-sm pl-4 border-l-2 ml-2 print-mono">{questionData.explanation || 'No explanation provided.'}</p>
                </div>
            )}
        </div>
    );
}

function SectionWrapper({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
    return (
        <Card className={cn("print:shadow-none print:border-none print:p-0", className)}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
}

export function ApplicationViewer({ applicantData }: { applicantData: ApplicantData }) {
  const fullName = [applicantData.firstName, applicantData.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-6 print:space-y-4 print-sans">
      <div className="hidden print:block text-center mb-8">
          <Icons.logo className="mx-auto" height={48} />
          <h1 className="text-xl font-bold mt-4 uppercase">
              PILOT APPLICATION SUMMARY - CANDIDATE ID: <span className="print-mono">{applicantData.uid}</span>
          </h1>
      </div>

      <Card className="print:shadow-none print:border-none print:p-0">
        <CardHeader>
          <CardTitle className="text-2xl">{fullName}</CardTitle>
          <CardDescription>{applicantData.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <DetailItem label="Submitted On" value={applicantData.submittedAt ? format(applicantData.submittedAt.toDate(), 'PPP p') : 'N/A'} />
            <DetailItem label="ATP Number" value={isEncrypted(String(applicantData.atpNumber || '')) ? decryptField(String(applicantData.atpNumber)) : applicantData.atpNumber} />
            <DetailItem label="First Class Medical Date" value={(() => {
              const raw = applicantData.firstClassMedicalDate;
              if (!raw) return 'N/A';
              if (typeof raw === 'string' && isEncrypted(raw)) {
                const d = decryptField(raw);
                try { return format(new Date(d), 'PPP'); } catch { return d; }
              }
              if (typeof raw === 'object' && 'toDate' in raw) return format((raw as any).toDate(), 'PPP');
              return 'N/A';
            })()} />
          </dl>
        </CardContent>
      </Card>

      <SectionWrapper title="Flight Time" className="print-page-break">
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b">
                    <th className="text-left py-2 px-2 print-sans">Category</th>
                    <th className="text-right py-2 px-2 print-sans">Hours</th>
                </tr>
            </thead>
            <tbody>
                {Object.entries(applicantData.flightTime).map(([key, value], index) => (
                    <tr key={key} className={cn("border-b", index % 2 === 0 ? "bg-muted/50" : "")}>
                        <td className="py-2 px-2 capitalize print-sans">
                            {key.replace(/([A-Z])/g, ' $1').replace('Pic', 'PIC')}
                        </td>
                        <td className="py-2 px-2 text-right print-mono">{value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </SectionWrapper>

      <SectionWrapper title="Aeronautical Ratings and Certificates" className="print-page-break">
        <p className="whitespace-pre-wrap print-mono">{applicantData.typeRatings || 'N/A'}</p>
      </SectionWrapper>

      <SectionWrapper title="Employment History" className="print-page-break">
         <div className="space-y-6">
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
                    <DetailItem label="Duties" value={<p className="whitespace-pre-wrap print-mono">{job.duties}</p>} />
                </dl>
                {index < applicantData.employmentHistory.length - 1 && <Separator />}
              </div>
            ))
          ) : (
            <p>No employment history provided.</p>
          )}
        </div>
      </SectionWrapper>

      <Card className="print:shadow-none print:border-none print:p-0 print-page-break">
        <CardHeader>
            <CardTitle>Applicant Acknowledgment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Safety & Incidents</h3>
                <div className="space-y-4">
                    {SAFETY_INCIDENTS_QUESTIONS.map(key => (
                         <SafetyQuestionItem key={key} questionKey={key} questionData={applicantData.safetyQuestions[key as keyof typeof applicantData.safetyQuestions]} />
                    ))}
                </div>
            </div>

             <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Training & Commitment</h3>
                <div className="space-y-4">
                     {TRAINING_QUESTIONS.map(key => (
                         <SafetyQuestionItem key={key} questionKey={key} questionData={applicantData.safetyQuestions[key as keyof typeof applicantData.safetyQuestions]} />
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Additional Information</h3>
                <div className="space-y-4">
                     {OTHER_QUESTIONS.map(key => (
                         <SafetyQuestionItem key={key} questionKey={key} questionData={applicantData.safetyQuestions[key as keyof typeof applicantData.safetyQuestions]} />
                    ))}
                </div>
            </div>
            
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
