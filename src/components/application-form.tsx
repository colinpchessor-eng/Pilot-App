'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import {
  applicationFormSchema,
  type ApplicationFormValues,
} from '@/lib/schemas';
import type { ApplicantData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Loader2,
  Plus,
  Send,
  Trash2,
  Info,
  XCircle,
  PlaneTakeoff,
  BadgeCheck,
  Briefcase,
  CheckCircle,
  Gauge,
  Zap,
  Shield,
  User,
  Layers,
  GraduationCap,
  ClipboardCheck,
  Users,
  MoreHorizontal,
  Plane,
  Moon,
  Home,
  type LucideIcon,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { writeCandidateAuditLog } from '@/lib/candidate-audit';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Textarea } from './ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { LegacyRecordsContent } from './legacy-records-content';
import { useRouter } from 'next/navigation';
import { isEncrypted } from '@/lib/encryption';
import {
  encryptApplicantSensitiveFields,
  loadApplicantSensitiveFieldsDecrypted,
} from '@/app/applicant/sensitive-field-actions';
import { sendEmail, buildSubmissionEmail } from '@/lib/email';

const APPLICATION_TABS: {
  value: string;
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
  heroTitle: string;
  heroDescription: string;
}[] = [
  {
    value: 'flight-time',
    label: 'Flight Time',
    shortLabel: 'Flight',
    Icon: PlaneTakeoff,
    heroTitle: 'Flight time certification',
    heroDescription:
      'Provide an accurate record of your logged flight hours. These details are essential for validating your experience and rank requirements.',
  },
  {
    value: 'type-ratings',
    label: 'Aeronautical Ratings and Certificates',
    shortLabel: 'Ratings',
    Icon: BadgeCheck,
    heroTitle: 'Aeronautical ratings and certificates',
    heroDescription:
      'Enter your ATP number, first class medical date, and type ratings. Ensure information matches your FAA records.',
  },
  {
    value: 'residential-history',
    label: 'Residential History',
    shortLabel: 'Residence',
    Icon: Home,
    heroTitle: 'Residential history (last 3 years)',
    heroDescription:
      'Confirm your address history for the last 3 years. If you have moved, add each address with the dates you lived there.',
  },
  {
    value: 'employment-history',
    label: 'Employment',
    shortLabel: 'Employment',
    Icon: Briefcase,
    heroTitle: 'Employment history',
    heroDescription:
      'Confirm your employment record is current or add and update employers, aircraft, and duties as needed.',
  },
  {
    value: 'acknowledgment',
    label: 'Update Acknowledgment',
    shortLabel: 'Finalize',
    Icon: CheckCircle,
    heroTitle: 'Applicant acknowledgment',
    heroDescription:
      'Review disclosures, answer each question, and certify your application before submission.',
  },
];

type FlightBentoField = {
  name:
    | 'total'
    | 'turbinePic'
    | 'military'
    | 'civilian'
    | 'multiEngine'
    | 'instructor'
    | 'evaluator'
    | 'sic'
    | 'other'
    | 'nightHours'
    | 'lastAircraftFlown'
    | 'dateLastFlown';
  label: string;
  Icon: LucideIcon;
  input: 'number' | 'text' | 'date';
  colSpanLg2?: boolean;
};

const FLIGHT_BENTO_FIELDS: FlightBentoField[] = [
  { name: 'total', label: 'Total hours', Icon: Gauge, input: 'number' },
  { name: 'turbinePic', label: 'Turbine PIC hours', Icon: Zap, input: 'number' },
  { name: 'military', label: 'Military hours', Icon: Shield, input: 'number' },
  { name: 'civilian', label: 'Civilian hours', Icon: User, input: 'number' },
  { name: 'multiEngine', label: 'Multi-engine hours', Icon: Layers, input: 'number' },
  { name: 'instructor', label: 'Instructor hours', Icon: GraduationCap, input: 'number' },
  { name: 'evaluator', label: 'Evaluator hours', Icon: ClipboardCheck, input: 'number' },
  { name: 'sic', label: 'SIC hours', Icon: Users, input: 'number' },
  { name: 'other', label: 'Other hours', Icon: MoreHorizontal, input: 'number' },
  { name: 'nightHours', label: 'Night hours', Icon: Moon, input: 'number' },
  { name: 'lastAircraftFlown', label: 'Last aircraft flown', Icon: Plane, input: 'text', colSpanLg2: true },
  { name: 'dateLastFlown', label: 'Date last flown', Icon: CalendarIcon, input: 'date' },
];

function employmentDateToInputValue(d: Date | null | undefined): string {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse HTML date value (YYYY-MM-DD) as a local calendar date (avoids UTC shifts). */
function parseEmploymentDateInput(ymd: string): Date | null {
  const trimmed = ymd.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, mo, day] = parts;
  const d = new Date(y, mo - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return null;
  return d;
}

const ACKNOWLEDGMENT_QUESTIONS = [
  {
    id: 1,
    group: 'Employment History',
    name: 'terminations',
    headline: 'Terminations or resignations',
    label: 'Terminations or resignations in lieu of from any FAA covered positions?',
  },
  {
    id: 2,
    group: 'Employment History',
    name: 'askedToResign',
    headline: 'Asked to resign',
    label: 'Asked to resign from any FAA covered position?',
  },
  {
    id: 3,
    group: 'Employment History',
    name: 'formalDiscipline',
    headline: 'Formal discipline',
    label: 'Have you ever received formal discipline from your employer?',
  },
  {
    id: 4,
    group: 'Aviation Record',
    name: 'accidents',
    headline: 'Aircraft accidents',
    label: 'Aircraft accidents?',
  },
  {
    id: 5,
    group: 'Aviation Record',
    name: 'incidents',
    headline: 'Aircraft incidents',
    label: 'Aircraft Incidents?',
  },
  {
    id: 6,
    group: 'Aviation Record',
    name: 'flightViolations',
    headline: 'Flight violations',
    label: 'Flight violations?',
  },
  {
    id: 7,
    group: 'Aviation Record',
    name: 'certificateAction',
    headline: 'Certificate suspension or revocation',
    label: 'Certificate suspension/revocation?',
  },
  {
    id: 8,
    group: 'Aviation Record',
    name: 'pendingFaaAction',
    headline: 'Pending FAA action',
    label: 'Pending FAA Action/Letters of investigation?',
  },
  {
    id: 9,
    group: 'Aviation Record',
    name: 'failedCheckRide',
    headline: 'Failed check ride or evaluation',
    label:
      'Have you ever failed a flight check ride, proficiency check, flight eval, or upgrade attempt aircraft or while compensated as a professional pilot (in the last three years)?',
    isYesNo: true,
  },
  {
    id: 10,
    group: 'General Disclosures',
    name: 'investigationBoard',
    headline: 'Field board of investigation',
    label: 'Have you ever been called before a field board of investigation for any reason?',
  },
  {
    id: 11,
    group: 'General Disclosures',
    name: 'previousInterview',
    headline: 'Prior FedEx interviews',
    label:
      'Have you previously interviewed for the following positions at Fedex (not counting the one that you were hired under)?',
    isYesNo: true,
  },
  {
    id: 12,
    group: 'General Disclosures',
    name: 'trainingCommitmentConflict',
    headline: 'Training commitment conflict',
    label:
      'Do you have any commitment that will not allow you to enter and complete uninterrupted a training syllabus of approximately 10 weeks once commenced?',
    isYesNo: true,
  },
  {
    id: 13,
    group: 'General Disclosures',
    name: 'otherInfo',
    headline: 'Additional information',
    label: 'Is there anything else you feel warrants and that you would like to bring up at this time?',
    isYesNo: true,
  },
] as const;

type IncompleteItem = {
  tabValue: string;
  tabLabel: string;
  message: string;
};

export function ApplicationForm({
  applicantData,
}: {
  applicantData: ApplicantData;
}) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = React.useState(APPLICATION_TABS[0].value);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const [incompleteItems, setIncompleteItems] = useState<IncompleteItem[]>([]);
  const [legacyNudgeDismissed, setLegacyNudgeDismissed] = React.useState(false);
  const { toast } = useToast();

  const getDefaultValues = (data: ApplicantData): ApplicationFormValues => {
    const safetyQuestionsDefault: ApplicationFormValues['safetyQuestions'] = {
      terminations: { answer: null, explanation: '' },
      askedToResign: { answer: null, explanation: '' },
      accidents: { answer: null, explanation: '' },
      incidents: { answer: null, explanation: '' },
      flightViolations: { answer: null, explanation: '' },
      certificateAction: { answer: null, explanation: '' },
      pendingFaaAction: { answer: null, explanation: '' },
      failedCheckRide: { answer: null, explanation: '' },
      formalDiscipline: { answer: null, explanation: '' },
      investigationBoard: { answer: null, explanation: '' },
      previousInterview: { answer: null, explanation: '' },
      trainingCommitmentConflict: { answer: null, explanation: '' },
      otherInfo: { answer: null, explanation: '' },
    };

    if (data.safetyQuestions) {
      for (const key of Object.keys(safetyQuestionsDefault)) {
        const questionKey = key as keyof typeof data.safetyQuestions;
        const value = data.safetyQuestions[questionKey];
        if (value && typeof value === 'object' && 'answer' in value) {
          safetyQuestionsDefault[questionKey] = {
            answer: value.answer ?? null,
            explanation: value.explanation ?? '',
          };
        } else if (value) {
          safetyQuestionsDefault[questionKey] = {
            answer: value as 'yes' | 'no',
            explanation: '',
          };
        }
      }
    }
    
    return {
      flightTime: {
        total: data.flightTime?.total ?? 0,
        turbinePic: data.flightTime?.turbinePic ?? 0,
        military: data.flightTime?.military ?? 0,
        civilian: data.flightTime?.civilian ?? 0,
        multiEngine: data.flightTime?.multiEngine ?? 0,
        instructor: data.flightTime?.instructor ?? 0,
        evaluator: data.flightTime?.evaluator ?? 0,
        sic: data.flightTime?.sic ?? 0,
        other: data.flightTime?.other ?? 0,
        nightHours: data.flightTime?.nightHours ?? 0,
        lastAircraftFlown: data.flightTime?.lastAircraftFlown ?? '',
        dateLastFlown: data.flightTime?.dateLastFlown ?? '',
      },
      firstClassMedicalDate: (() => {
        if (!data.firstClassMedicalDate) return null;
        const raw = typeof data.firstClassMedicalDate === 'string' ? data.firstClassMedicalDate : null;
        if (raw && isEncrypted(raw)) return null;
        if (data.firstClassMedicalDate && typeof data.firstClassMedicalDate === 'object' && 'toDate' in data.firstClassMedicalDate) {
          return (data.firstClassMedicalDate as { toDate: () => Date }).toDate();
        }
        return raw ? new Date(raw) : null;
      })(),
      atpNumber: (() => {
        const raw = data.atpNumber;
        if (!raw) return 0;
        const str = String(raw);
        if (isEncrypted(str)) return 0;
        return Number(raw) || 0;
      })(),
      typeRatings: data.typeRatings ?? '',
      residentialHistoryUnchangedLast3Years: data.residentialHistoryUnchangedLast3Years ?? true,
      residentialHistory: (data.residentialHistory || []).map((rh: any) => ({
        ...rh,
        startDate: rh.startDate?.toDate ? rh.startDate.toDate() : rh.startDate,
        endDate: rh.endDate?.toDate ? rh.endDate.toDate() : rh.endDate,
        isCurrent: rh.isCurrent ?? !rh.endDate,
      })),
      employmentHistory: (data.employmentHistory || []).map((eh) => ({
        ...eh,
        street: (eh as any).street ?? '',
        city: (eh as any).city ?? '',
        state: (eh as any).state ?? '',
        zip: (eh as any).zip ?? '',
        startDate: eh.startDate.toDate(),
        endDate: eh.endDate ? eh.endDate.toDate() : null,
        isCurrent: !eh.endDate,
      })),
      safetyQuestions: safetyQuestionsDefault,
      isCertified: data.isCertified ?? false,
      printedName: data.printedName ?? '',
    };
  };

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: getDefaultValues(applicantData),
    mode: 'onChange',
  });

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const sensitive = await loadApplicantSensitiveFieldsDecrypted(token);
        if (cancelled) return;
        const cur = form.getValues();
        form.reset({
          ...cur,
          atpNumber: sensitive.atpNumber,
          firstClassMedicalDate: sensitive.firstClassMedicalDate,
        });
      } catch (e) {
        console.error('loadApplicantSensitiveFieldsDecrypted:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset stable; avoid reset loops
  }, [user, applicantData.uid]);

  const { fields: employmentFields, append: appendEmployment, remove: removeEmployment } = useFieldArray({
    control: form.control,
    name: 'employmentHistory',
  });

  const {
    fields: residentialFields,
    append: appendResidential,
    remove: removeResidential,
  } = useFieldArray({
    control: form.control,
    name: 'residentialHistory',
  });

  const [employmentConfirmed, setEmploymentConfirmed] = React.useState(
    !applicantData.employmentHistory || applicantData.employmentHistory.length === 0
  );

  const safetyQuestionsWatch = form.watch('safetyQuestions');
  const ackProgress = useMemo(() => {
    let answered = 0;
    for (const q of ACKNOWLEDGMENT_QUESTIONS) {
      const a =
        safetyQuestionsWatch?.[q.name as keyof typeof safetyQuestionsWatch]?.answer;
      if (a === 'yes' || a === 'no') answered++;
    }
    const total = ACKNOWLEDGMENT_QUESTIONS.length;
    return {
      answered,
      total,
      pct: total ? Math.round((answered / total) * 100) : 0,
    };
  }, [safetyQuestionsWatch]);

  // Firestore: owner write keys must stay within firestore.rules → userSelfUpdateAffectedKeysAllowlist
  const saveDataToFirestore = async () => {
    if (!user || !firestore) return false;
    setIsSaving(true);
    try {
      const values = form.getValues();
      const idToken = await user.getIdToken();
      const enc = await encryptApplicantSensitiveFields({
        idToken,
        atpNumber: String(values.atpNumber || ''),
        firstClassMedicalDate: values.firstClassMedicalDate
          ? values.firstClassMedicalDate instanceof Date
            ? values.firstClassMedicalDate.toISOString()
            : String(values.firstClassMedicalDate)
          : null,
      });
      const encryptedValues = {
        ...values,
        atpNumber: enc.atpNumber,
        firstClassMedicalDate: enc.firstClassMedicalDate,
      };
      const docRef = doc(firestore, 'users', user.uid);
      await updateDoc(docRef, encryptedValues as any);
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving your data.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAckSaveDraft = async () => {
    const ok = await saveDataToFirestore();
    if (ok) {
      toast({ title: 'Draft saved', description: 'Your responses have been saved.' });
    }
  };

  const handleTabChange = async (direction: 'next' | 'prev') => {
    const currentTabIndex = APPLICATION_TABS.findIndex((tab) => tab.value === activeTab);

    if (direction === 'next') {
      const saved = await saveDataToFirestore();
      if (saved) {
        const nextTabIndex = currentTabIndex + 1;
        if (nextTabIndex < APPLICATION_TABS.length)
          setActiveTab(APPLICATION_TABS[nextTabIndex].value);
      }
    } else {
      const nextTabIndex = currentTabIndex - 1;
      if (nextTabIndex >= 0) setActiveTab(APPLICATION_TABS[nextTabIndex].value);
    }
  };

  const onSubmit = (values: ApplicationFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    void (async () => {
      try {
        const idToken = await user.getIdToken();
        const enc = await encryptApplicantSensitiveFields({
          idToken,
          atpNumber: String(values.atpNumber || ''),
          firstClassMedicalDate: values.firstClassMedicalDate
            ? values.firstClassMedicalDate instanceof Date
              ? values.firstClassMedicalDate.toISOString()
              : String(values.firstClassMedicalDate)
            : null,
        });
        const encryptedValues = {
          ...values,
          atpNumber: enc.atpNumber,
          firstClassMedicalDate: enc.firstClassMedicalDate,
        };
        const docRef = doc(firestore, 'users', user.uid);
        await setDoc(
          docRef,
          {
            ...encryptedValues,
            submittedAt: serverTimestamp(),
            candidateFlowStatus: 'submitted',
          },
          { merge: true }
        );
        const cid = applicantData.candidateId;
        if (cid) {
          try {
            await updateDoc(doc(firestore, 'candidateIds', cid), {
              flowStatus: 'submitted',
              submittedAt: serverTimestamp(),
              flowStatusUpdatedAt: serverTimestamp(),
            });
          } catch (err) {
            console.error('Candidate flow status (submitted):', err);
          }
        }
        try {
          const nm = [applicantData.firstName, applicantData.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
          await writeCandidateAuditLog(firestore, {
            uid: user.uid,
            action: 'application_submitted',
            candidateName: nm,
            candidateEmail: user.email,
            candidateId: applicantData.candidateId ?? '',
          });
        } catch (auditErr) {
          console.error('application_submitted audit:', auditErr);
        }
        try {
          if (user.email) {
            const nm = [applicantData.firstName, applicantData.lastName]
              .filter(Boolean)
              .join(' ')
              .trim();
            const submittedAt = new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            await sendEmail(firestore, {
              to: user.email,
              subject: 'FedEx Pilot History Update Received — Thank You',
              html: buildSubmissionEmail(nm, user.email, submittedAt),
              type: 'application_submitted',
              candidateId: applicantData.candidateId || '',
              candidateName: nm,
              sentBy: 'system',
              sentByEmail: 'system',
            });
          }
        } catch (emailErr) {
          console.error('Submission confirmation email:', emailErr);
        }
        toast({ title: 'Application Submitted!' });
        router.push('/dashboard');
      } catch (e) {
        console.error('Submit application:', e);
        toast({
          variant: 'destructive',
          title: 'Submit failed',
          description:
            e instanceof Error ? e.message : 'Could not submit. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
        setShowSubmitDialog(false);
      }
    })();
  };

  const checkValidationAndShowErrors = () => {
    const data = form.getValues();

    const errors: IncompleteItem[] = [];

    // Flight Time Checks
    const flightFields = [
      'total',
      'turbinePic',
      'military',
      'civilian',
      'multiEngine',
      'instructor',
      'evaluator',
      'sic',
      'other',
      'nightHours',
    ];
    let flightHasValue = false;
    flightFields.forEach((f) => {
      const val = data.flightTime[f as keyof typeof data.flightTime];
      const numVal = typeof val === 'string' ? parseFloat(val) : (typeof val === 'number' ? val : 0);
      if (!isNaN(numVal) && numVal > 0) flightHasValue = true;
    });
    if (!flightHasValue) {
       errors.push({ tabValue: 'flight-time', tabLabel: 'Flight Time', message: 'No flight hours have been entered.' });
    }

    // Aeronautical Ratings Checks
    if (!data.firstClassMedicalDate) {
      errors.push({ tabValue: 'type-ratings', tabLabel: 'Aeronautical Ratings', message: 'First class medical date is missing.' });
    }
    if (!data.atpNumber) {
      errors.push({ tabValue: 'type-ratings', tabLabel: 'Aeronautical Ratings', message: 'ATP Number is missing or 0.' });
    }
    if (!data.typeRatings || data.typeRatings.trim() === '') {
      errors.push({ tabValue: 'type-ratings', tabLabel: 'Aeronautical Ratings', message: 'Type Ratings are empty.' });
    }

    // Employment History Checks
    if (!employmentConfirmed && (!data.employmentHistory || data.employmentHistory.length === 0)) {
      errors.push({ tabValue: 'employment-history', tabLabel: 'Employment', message: 'Employment history confirmation is unchecked and no history added.' });
    }

    // Acknowledgment Checks
    ACKNOWLEDGMENT_QUESTIONS.forEach(q => {
      const qData = data.safetyQuestions[q.name as keyof typeof data.safetyQuestions];
      if (qData.answer === null) {
        errors.push({ tabValue: 'acknowledgment', tabLabel: 'Acknowledgment', message: `No answer selected for: "${q.label}"` });
      } else if (qData.answer === 'yes' && (!qData.explanation || qData.explanation.trim() === '')) {
        errors.push({ tabValue: 'acknowledgment', tabLabel: 'Acknowledgment', message: `Answered "Yes" but missing explanation for: "${q.label}"` });
      }
    });

    if (!data.isCertified) {
      errors.push({ tabValue: 'acknowledgment', tabLabel: 'Acknowledgment', message: 'Certification checkbox is not checked.' });
    }
    if (!data.printedName || data.printedName.trim() === '') {
      errors.push({ tabValue: 'acknowledgment', tabLabel: 'Acknowledgment', message: 'Printed name / digital signature is empty.' });
    }

    setIncompleteItems(errors);
    return errors.length === 0;
  };

  const handleFinalSubmitClick = async () => {
    const isValid = checkValidationAndShowErrors();
    if (isValid) {
      const zodValid = await form.trigger();
      if (zodValid) {
        setShowSubmitDialog(true);
      } else {
        toast({ variant: 'destructive', title: 'Incomplete Application', description: 'Please review all sections before submitting.' });
      }
    }
  };

  const isSubmitted = !!applicantData.submittedAt;

  // Shared styles
  const inputStyle = "h-[42px] border-[1.5px] border-[#D0D0D0] rounded-[8px] bg-white text-[#333333] px-[14px] text-[15px] focus-visible:border-[#4D148C] focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(77,20,140,0.12)] w-full";
  /** Flight bento: white card shell (reference: border-white + shadow). */
  const bentoCardClass =
    'flex flex-col gap-4 rounded-xl border border-white bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-[#000000]/[0.05]';
  /** Employment date pickers (accordion) — soft fill, same family as before. */
  const bentoInputClass =
    'w-full rounded-lg border-0 bg-[#ece8f4] p-4 text-lg font-medium text-[#333333] placeholder:text-[#8E8E8E] shadow-[inset_0_1px_3px_rgba(77,20,140,0.09)] focus-visible:ring-2 focus-visible:ring-[#4D148C]/20 focus-visible:ring-offset-0 h-auto min-h-[56px] outline-none';
  /** Flight bento hours: visible resting border + light gray fill; purple ring on focus. */
  const bentoFlightHourInputClass =
    'w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFA] p-4 text-lg font-medium text-[#333333] placeholder:text-[#8E8E8E] focus-visible:border-[#4D148C] focus-visible:ring-2 focus-visible:ring-[#4D148C]/25 focus-visible:ring-offset-0 h-auto min-h-[56px] outline-none transition-[border-color,box-shadow]';
  const bentoFieldLabelClass =
    'mb-0 text-sm font-semibold uppercase tracking-wider text-[#565656]';
  const labelStyle = "text-[13px] font-semibold text-[#565656] mb-[6px] block";

  const activeTabMeta =
    APPLICATION_TABS.find((t) => t.value === activeTab) ?? APPLICATION_TABS[0];

  const getTabErrorIndicator = (tabValue: string) => {
    return incompleteItems.some(item => item.tabValue === tabValue) ? (
      <span className="w-1.5 h-1.5 bg-[#DE002E] rounded-full inline-block ml-1.5 align-middle" />
    ) : null;
  };

  const legacyContent = (
    <LegacyRecordsContent
      legacyData={applicantData.legacyData}
      candidateId={applicantData.candidateId}
      firstName={applicantData.firstName}
      lastName={applicantData.lastName}
      showNoteBanner
      showPrintHeader
    />
  );

  const hasLegacyFlightTime = !!applicantData.legacyData;
  const showLegacyNudge = activeTab === 'flight-time' && hasLegacyFlightTime && !legacyNudgeDismissed;

  const handleLegacyNudgeClick = () => {
    setLegacyNudgeDismissed(true);
    queueMicrotask(() => {
      const el = document.getElementById('legacy-flight-time');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollBy({ top: 700, behavior: 'smooth' });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <fieldset disabled={isSubmitted}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#333333]">Pilot History Update Form</h1>
              <p className="text-[#8E8E8E] mt-1">Please review and provide updates from the last 3 years.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8E8E8E] bg-[#F2F2F2] px-4 py-2 rounded-full border border-[#E3E3E3] shrink-0">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></> : <><Check className="h-4 w-4 text-[#008A00]" /><span>{isSubmitted ? 'Submitted' : 'Ready'}</span></>}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pb-8 md:pb-12">
            {/* Apple-style glass tab rail — FedEx gradient active state (brand: purple #4D148C → blend #7D22C3 → orange #FF6200) */}
            <div className="mb-8 md:mb-10 rounded-2xl border border-[#E3E3E3] bg-[rgba(250,250,250,0.78)] p-1.5 shadow-[0_4px_24px_rgba(77,20,140,0.07),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-[20px] backdrop-saturate-[180%] supports-[backdrop-filter]:bg-[rgba(250,250,250,0.55)]">
              <TabsList className="flex h-auto w-full min-h-0 items-stretch gap-1 bg-transparent p-0">
                {APPLICATION_TABS.map((tab) => {
                  const TabIcon = tab.Icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      title={tab.label}
                      aria-label={tab.label}
                      className={cn(
                        'group flex min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-0 px-2 py-2.5 text-center shadow-none transition-all duration-200 sm:gap-2.5 sm:px-3 sm:py-3',
                        'text-[#565656] hover:bg-[rgba(242,242,242,0.92)] hover:text-[#333333]',
                        'data-[state=inactive]:bg-transparent',
                        'data-[state=active]:bg-gradient-to-b data-[state=active]:from-[#4D148C] data-[state=active]:via-[#7D22C3] data-[state=active]:to-[#FF6200]',
                        'data-[state=active]:text-white data-[state=active]:shadow-[0_2px_14px_rgba(77,20,140,0.38)]',
                        'data-[state=active]:[&_svg]:text-white'
                      )}
                    >
                      <TabIcon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} />
                      <span className="flex min-w-0 flex-col items-center gap-0.5">
                        <span className="flex items-center justify-center gap-1 text-[13px] font-bold leading-tight sm:text-sm">
                          {tab.shortLabel}
                          {getTabErrorIndicator(tab.value)}
                        </span>
                        <span className="hidden w-full max-w-full text-[11px] font-medium leading-snug opacity-80 sm:block sm:line-clamp-2 sm:text-[#333333] group-data-[state=active]:sm:text-white/90">
                          {tab.label}
                        </span>
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {activeTab !== 'acknowledgment' && (
              <section className="mb-8 md:mb-10" aria-live="polite">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="mb-2 text-[26px] font-bold tracking-tight text-[#333333] md:text-[28px]">
                      {activeTabMeta.heroTitle}
                    </h2>
                    <p className="max-w-2xl text-[15px] leading-relaxed text-[#565656]">
                      {activeTabMeta.heroDescription}
                    </p>
                  </div>

                  {(showLegacyNudge || (activeTab === 'flight-time' && hasLegacyFlightTime && legacyNudgeDismissed)) && (
                    <button
                      type="button"
                      onClick={handleLegacyNudgeClick}
                      disabled={legacyNudgeDismissed}
                      className={cn(
                        'self-start rounded-full px-4 py-2 text-[13px] font-extrabold shadow-[0_10px_25px_-12px_rgba(0,0,0,0.25)] transition-colors',
                        showLegacyNudge
                          ? 'bg-[#4D148C] text-white hover:bg-[#35105F] animate-bounce'
                          : 'bg-[#E3E3E3] text-[#8E8E8E] cursor-default'
                      )}
                      aria-label="Scroll to legacy flight time below"
                      title="Scroll to legacy flight time below"
                    >
                      Legacy flight time below ↓
                    </button>
                  )}
                </div>
              </section>
            )}

            <TabsContent value="flight-time" className="mt-0 bg-transparent p-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {FLIGHT_BENTO_FIELDS.map(({ name, label, Icon, input, colSpanLg2 }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={`flightTime.${name}` as any}
                    render={({ field }) => (
                      <FormItem
                        className={cn(bentoCardClass, colSpanLg2 && 'lg:col-span-2')}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-6 w-6 shrink-0 text-[#4D148C]" aria-hidden />
                          <FormLabel className={bentoFieldLabelClass}>{label}</FormLabel>
                        </div>
                        <FormControl>
                          {input === 'number' ? (
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className={bentoFlightHourInputClass}
                              placeholder=""
                              name={field.name}
                              ref={field.ref}
                              onBlur={field.onBlur}
                              value={
                                field.value === undefined ||
                                field.value === null ||
                                field.value === '' ||
                                field.value === 0
                                  ? ''
                                  : field.value
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  field.onChange(0);
                                  return;
                                }
                                const n = Number(raw);
                                field.onChange(Number.isNaN(n) ? 0 : n);
                              }}
                            />
                          ) : input === 'date' ? (
                            <Input
                              type="date"
                              className={bentoFlightHourInputClass}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          ) : (
                            <Input
                              type="text"
                              className={bentoFlightHourInputClass}
                              placeholder="e.g. Boeing 777-200"
                              {...field}
                              value={field.value ?? ''}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <div className="mt-8" id="legacy-flight-time">
                {legacyContent}
              </div>

              <p className="mt-6 text-center text-sm text-[#8E8E8E] opacity-80">
                All information is encrypted and stored securely.
              </p>
            </TabsContent>

              <TabsContent
                value="type-ratings"
                className="mt-0 rounded-xl border border-[#E3E3E3] bg-white p-6 pt-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)] focus-visible:outline-none md:p-8"
              >
                  <div className="max-w-2xl space-y-6 pt-4">
                    <FormField control={form.control} name="atpNumber" render={({field}) => (
                      <FormItem>
                        <FormLabel className={labelStyle}>ATP Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="123446" 
                            className={inputStyle} 
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="firstClassMedicalDate" render={({field}) => (
                      <FormItem>
                        <FormLabel className={labelStyle}>First Class Medical Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            className={cn(inputStyle, "max-w-[320px]")} 
                            {...field}
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : (field.value || '')}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          />
                        </FormControl>
                        <p className="text-[12px] text-[#8E8E8E] mt-1">Date of your most recent FAA First Class Medical Certificate</p>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="typeRatings" render={({field}) => (
                      <FormItem>
                        <FormLabel className={labelStyle}>Type Ratings</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="C-17A, MD-11" 
                            className={cn(inputStyle, "min-height-[100px] resize-y py-3")} 
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
              </TabsContent>

              <TabsContent
                value="residential-history"
                className="mt-0 space-y-6 rounded-xl border border-[#E3E3E3] bg-white p-6 pt-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)] focus-visible:outline-none md:p-8"
              >
                <div className="mt-2 flex items-start gap-3 rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-5">
                  <FormField
                    control={form.control}
                    name="residentialHistoryUnchangedLast3Years"
                    render={({ field }) => (
                      <>
                        <div
                          onClick={() => field.onChange(!field.value)}
                          className={cn(
                            'w-[18px] h-[18px] border-2 rounded-[4px] shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-colors',
                            field.value ? 'bg-[#4D148C] border-[#4D148C]' : 'border-[#E3E3E3] bg-white'
                          )}
                        >
                          {field.value && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                        <div className="grid gap-1.5">
                          <span
                            className="text-sm font-bold text-[#333333] cursor-pointer"
                            onClick={() => field.onChange(!field.value)}
                          >
                            My residential history has not changed in the last three years.
                          </span>
                          <p className="text-[13px] text-[#565656]">
                            If you have moved, uncheck this and add each address you lived at within the last 3 years.
                          </p>
                        </div>
                      </>
                    )}
                  />
                </div>

                <div className="rounded-xl border border-[#E3E3E3] bg-white p-5">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-[#8E8E8E] mb-2">
                    Legacy address on file (reference)
                  </p>
                  <p className="text-[14px] font-semibold text-[#333333]">
                    {applicantData.legacyData?.lastResidence?.street || '—'}
                  </p>
                  <p className="text-[13px] text-[#565656]">
                    {[
                      applicantData.legacyData?.lastResidence?.city,
                      applicantData.legacyData?.lastResidence?.state,
                      applicantData.legacyData?.lastResidence?.zip,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                  {(applicantData.legacyData?.lastResidence?.from ||
                    applicantData.legacyData?.lastResidence?.to) && (
                    <p className="text-[12px] text-[#8E8E8E] mt-2">
                      {applicantData.legacyData?.lastResidence?.from || '—'} →{' '}
                      {applicantData.legacyData?.lastResidence?.to || '—'}
                    </p>
                  )}
                </div>

                {form.watch('residentialHistoryUnchangedLast3Years') === false && (
                  <div className="space-y-6 pt-2">
                    <Accordion
                      type="multiple"
                      className="w-full space-y-4"
                      defaultValue={residentialFields.length > 0 ? [residentialFields[0].id] : []}
                    >
                      {residentialFields.map((field, index) => {
                        const street = form.watch(`residentialHistory.${index}.street`);
                        const city = form.watch(`residentialHistory.${index}.city`);
                        const state = form.watch(`residentialHistory.${index}.state`);
                        const isCurrent = form.watch(`residentialHistory.${index}.isCurrent`);
                        const startDate = form.watch(`residentialHistory.${index}.startDate`);

                        return (
                          <AccordionItem
                            value={field.id}
                            key={field.id}
                            className="rounded-xl border border-[#E3E3E3] px-6 bg-white overflow-hidden"
                          >
                            <AccordionTrigger className="hover:no-underline py-5">
                              <div className="flex-1 text-left">
                                <p className="font-bold text-[#333333] text-lg">
                                  {street ? street : `Address #${index + 1}`}
                                </p>
                                <p className="text-sm text-[#565656] font-medium">
                                  {[city, state].filter(Boolean).join(', ') || 'City, State'}
                                </p>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-6">
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <FormField
                                    control={form.control}
                                    name={`residentialHistory.${index}.street`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={labelStyle}>Street Address</FormLabel>
                                        <FormControl>
                                          <Input className={inputStyle} placeholder="123 Main St" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`residentialHistory.${index}.zip`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={labelStyle}>ZIP</FormLabel>
                                        <FormControl>
                                          <Input className={inputStyle} placeholder="12345" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <FormField
                                    control={form.control}
                                    name={`residentialHistory.${index}.city`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={labelStyle}>City</FormLabel>
                                        <FormControl>
                                          <Input className={inputStyle} placeholder="Memphis" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`residentialHistory.${index}.state`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={labelStyle}>State</FormLabel>
                                        <FormControl>
                                          <Input className={inputStyle} placeholder="TN" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                  <FormField
                                    control={form.control}
                                    name={`residentialHistory.${index}.startDate`}
                                    render={({ field }) => (
                                      <FormItem className="flex flex-col">
                                        <FormLabel className={labelStyle}>Lived From</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="date"
                                            className={bentoInputClass}
                                            min="1950-01-01"
                                            max={employmentDateToInputValue(new Date())}
                                            name={field.name}
                                            ref={field.ref}
                                            onBlur={field.onBlur}
                                            value={employmentDateToInputValue(field.value)}
                                            onChange={(e) => {
                                              const parsed = parseEmploymentDateInput(e.target.value);
                                              if (parsed) field.onChange(parsed);
                                              else if (!e.target.value) field.onChange(undefined as unknown as Date);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`residentialHistory.${index}.isCurrent`}
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-center space-x-3 pb-3">
                                        <FormControl>
                                          <div
                                            onClick={() => {
                                              field.onChange(!field.value);
                                              if (!field.value) {
                                                form.setValue(`residentialHistory.${index}.endDate`, null);
                                              }
                                            }}
                                            className={cn(
                                              'w-[18px] h-[18px] border-2 rounded-[4px] shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-colors',
                                              field.value ? 'bg-[#4D148C] border-[#4D148C]' : 'border-[#E3E3E3] bg-white'
                                            )}
                                          >
                                            {field.value && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                          </div>
                                        </FormControl>
                                        <FormLabel className="text-[14px] font-semibold text-[#333333] cursor-pointer">
                                          I currently live here
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                {!isCurrent && (
                                  <FormField
                                    control={form.control}
                                    name={`residentialHistory.${index}.endDate`}
                                    render={({ field }) => (
                                      <FormItem className="flex flex-col">
                                        <FormLabel className={labelStyle}>Lived To</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="date"
                                            className={bentoInputClass}
                                            min={employmentDateToInputValue(startDate) || '1950-01-01'}
                                            max={employmentDateToInputValue(new Date())}
                                            name={field.name}
                                            ref={field.ref}
                                            onBlur={field.onBlur}
                                            value={employmentDateToInputValue(field.value)}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              field.onChange(v ? parseEmploymentDateInput(v) : null);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                )}

                                <div className="flex justify-end pt-2 border-t border-[#E3E3E3]">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeResidential(index)}
                                    className="text-[#DE002E] hover:text-[#DE002E] hover:bg-red-50 font-bold"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove Address
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        appendResidential({
                          street: '',
                          city: '',
                          state: '',
                          zip: '',
                          startDate: new Date(),
                          endDate: null,
                          isCurrent: false,
                        } as any)
                      }
                      className="fedex-btn-secondary py-6 px-8 border-dashed border-2"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Add Address
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="employment-history"
                className="mt-0 space-y-6 rounded-xl border border-[#E3E3E3] bg-white p-6 pt-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)] focus-visible:outline-none md:p-8"
              >
                 <div className="mt-2 flex items-start gap-3 rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-5">
                    <div 
                      onClick={() => setEmploymentConfirmed(!employmentConfirmed)}
                      className={cn(
                        "w-[18px] h-[18px] border-2 rounded-[4px] shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-colors",
                        employmentConfirmed ? "bg-[#4D148C] border-[#4D148C]" : "border-[#E3E3E3] bg-white"
                      )}
                    >
                      {employmentConfirmed && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    <div className="grid gap-1.5">
                      <span className="text-sm font-bold text-[#333333] cursor-pointer" onClick={() => setEmploymentConfirmed(!employmentConfirmed)}>
                        I confirm my employment history is up-to-date.
                      </span>
                      <p className="text-[13px] text-[#565656]">Check this box if no changes are required to your employment records.</p>
                    </div>
                 </div>

                  {!employmentConfirmed && (
                    <div className="space-y-6 pt-2">
                      <Accordion
                        type="multiple"
                        className="w-full space-y-4"
                        defaultValue={
                          employmentFields.length > 0
                            ? [employmentFields[0].id]
                            : []
                        }
                      >
                        {employmentFields.map((field, index) => {
                          const employerName = form.watch(
                            `employmentHistory.${index}.employerName`
                          );
                          const jobTitle = form.watch(
                            `employmentHistory.${index}.jobTitle`
                          );
                          const isCurrent = form.watch(
                            `employmentHistory.${index}.isCurrent`
                          );
                          const employmentStartDate = form.watch(
                            `employmentHistory.${index}.startDate`
                          );

                          return (
                            <AccordionItem
                              value={field.id}
                              key={field.id}
                              className="rounded-xl border border-[#E3E3E3] px-6 bg-white overflow-hidden"
                            >
                              <AccordionTrigger className="hover:no-underline py-5">
                                <div className="flex-1 text-left">
                                  <p className="font-bold text-[#333333] text-lg">
                                    {employerName || `Employer #${index + 1}`}
                                  </p>
                                  <p className="text-sm text-[#565656] font-medium">
                                    {jobTitle || 'Job Title'}
                                  </p>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-6">
                                <div className="space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.employerName`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={labelStyle}>Employer Name</FormLabel>
                                          <FormControl>
                                            <Input
                                              className={inputStyle}
                                              placeholder="e.g. FedEx"
                                              {...field}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.jobTitle`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={labelStyle}>Job Title</FormLabel>
                                          <FormControl>
                                            <Input
                                              className={inputStyle}
                                              placeholder="e.g. First Officer"
                                              {...field}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.street`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={labelStyle}>Street Address</FormLabel>
                                          <FormControl>
                                            <Input className={inputStyle} placeholder="123 Main St" {...field} />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.zip`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={labelStyle}>ZIP</FormLabel>
                                          <FormControl>
                                            <Input className={inputStyle} placeholder="12345" {...field} />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.city`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={labelStyle}>City</FormLabel>
                                          <FormControl>
                                            <Input className={inputStyle} placeholder="Memphis" {...field} />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.state`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={labelStyle}>State</FormLabel>
                                          <FormControl>
                                            <Input className={inputStyle} placeholder="TN" {...field} />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.startDate`}
                                      render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                          <FormLabel className={labelStyle}>Start Date</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="date"
                                              className={bentoInputClass}
                                              min="1950-01-01"
                                              max={employmentDateToInputValue(new Date())}
                                              name={field.name}
                                              ref={field.ref}
                                              onBlur={field.onBlur}
                                              value={employmentDateToInputValue(field.value)}
                                              onChange={(e) => {
                                                const parsed = parseEmploymentDateInput(
                                                  e.target.value
                                                );
                                                if (parsed) field.onChange(parsed);
                                                else if (!e.target.value)
                                                  field.onChange(undefined as unknown as Date);
                                              }}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.isCurrent`}
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 pb-3">
                                          <FormControl>
                                            <div 
                                              onClick={() => {
                                                field.onChange(!field.value);
                                                if (!field.value) {
                                                  form.setValue(`employmentHistory.${index}.endDate`, null);
                                                }
                                              }}
                                              className={cn(
                                                "w-[18px] h-[18px] border-2 rounded-[4px] shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-colors",
                                                field.value ? "bg-[#4D148C] border-[#4D148C]" : "border-[#E3E3E3] bg-white"
                                              )}
                                            >
                                              {field.value && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                            </div>
                                          </FormControl>
                                          <FormLabel className="text-[14px] font-semibold text-[#333333] cursor-pointer">
                                            I currently work here
                                          </FormLabel>
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  {!isCurrent && (
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.endDate`}
                                      render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                          <FormLabel className={labelStyle}>End Date</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="date"
                                              className={bentoInputClass}
                                              min={
                                                employmentDateToInputValue(
                                                  employmentStartDate
                                                ) || '1950-01-01'
                                              }
                                              max={employmentDateToInputValue(new Date())}
                                              name={field.name}
                                              ref={field.ref}
                                              onBlur={field.onBlur}
                                              value={employmentDateToInputValue(field.value)}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                field.onChange(
                                                  v ? parseEmploymentDateInput(v) : null
                                                );
                                              }}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.aircraftTypes`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={labelStyle}>Aircraft Flown</FormLabel>
                                          <FormControl>
                                            <Input
                                              className={inputStyle}
                                              placeholder="e.g. B777, MD-11"
                                              {...field}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.totalHours`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className={labelStyle}>
                                            Total Hours with Employer
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              className={inputStyle}
                                              placeholder="e.g. 1200"
                                              {...field}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <FormField
                                    control={form.control}
                                    name={`employmentHistory.${index}.duties`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={labelStyle}>
                                          Positions Held & Duties
                                        </FormLabel>
                                        <FormControl>
                                          <Textarea
                                            className={cn(inputStyle, "min-h-[100px] resize-y py-3")}
                                            placeholder="Describe your roles and responsibilities..."
                                            {...field}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />

                                  <div className="flex justify-end pt-2 border-t border-[#E3E3E3]">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeEmployment(index)}
                                      className="text-[#DE002E] hover:text-[#DE002E] hover:bg-red-50 font-bold"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove Employer
                                    </Button>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          appendEmployment({
                            employerName: '',
                            jobTitle: '',
                            street: '',
                            city: '',
                            state: '',
                            zip: '',
                            startDate: new Date(),
                            endDate: null,
                            isCurrent: false,
                            aircraftTypes: '',
                            totalHours: 0,
                            duties: '',
                          })
                        }
                        className="fedex-btn-secondary py-6 px-8 border-dashed border-2"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Add Employer
                      </Button>
                    </div>
                  )}
              </TabsContent>

              <TabsContent
                value="acknowledgment"
                className="mt-0 border-0 bg-transparent p-0 shadow-none focus-visible:outline-none"
              >
                <div className="pb-2 md:pb-4">
                  <h2 className="mb-4 text-[20px] font-bold text-[#333333]">Update acknowledgment</h2>
                  <div className="mb-8 max-w-[640px] rounded-r-lg border-l-4 border-[#4D148C] bg-[#f5f0ff] p-4 text-[14px] leading-[1.6] text-[#565656]">
                    Please update the information you provided on your application for employment. Indicate
                    whether there have been any changes or updates to your responses. Explain each &quot;yes&quot;
                    response below.
                  </div>

                  <div className="space-y-10">
                    {(['Employment History', 'Aviation Record', 'General Disclosures'] as const).map(
                      (groupName) => (
                        <div key={groupName} className="space-y-6">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#565656]">
                            {groupName}
                          </h3>
                          <div className="space-y-6">
                            {ACKNOWLEDGMENT_QUESTIONS.filter((q) => q.group === groupName).map((q) => {
                              const answer =
                                form.watch(
                                  `safetyQuestions.${q.name as keyof ApplicationFormValues['safetyQuestions']}.answer`
                                ) ?? null;
                              const isYes = answer === 'yes';
                              const isNo = answer === 'no';
                              const num = String(q.id).padStart(2, '0');
                              return (
                                <div
                                  key={q.id}
                                  className="rounded-xl border border-[#E3E3E3]/70 bg-white/85 p-8 shadow-sm backdrop-blur-sm transition-all hover:shadow-[0_8px_32px_rgba(75,0,130,0.06)]"
                                >
                                  <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
                                    <div className="flex items-start gap-6">
                                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eedcff]">
                                        <span className="text-xs font-bold text-[#4D148C]">{num}</span>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-lg font-semibold text-[#333333]">{q.headline}</h4>
                                        <p className="leading-relaxed text-[#565656]">{q.label}</p>
                                      </div>
                                    </div>
                                    <div className="flex w-fit self-end rounded-full bg-[#f4f3f8] p-1.5 md:self-center">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          form.setValue(
                                            `safetyQuestions.${q.name}.answer` as Path<ApplicationFormValues>,
                                            'no'
                                          )
                                        }
                                        className={cn(
                                          'rounded-full px-6 py-2 text-sm font-bold transition-all duration-200 enabled:active:scale-[0.98]',
                                          isNo
                                            ? 'scale-[1.02] bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] text-white shadow-lg enabled:hover:shadow-xl'
                                            : 'bg-transparent text-[#565656] hover:text-[#333333] enabled:hover:shadow-sm'
                                        )}
                                      >
                                        No
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          form.setValue(
                                            `safetyQuestions.${q.name}.answer` as Path<ApplicationFormValues>,
                                            'yes'
                                          )
                                        }
                                        className={cn(
                                          'rounded-full px-6 py-2 text-sm font-bold transition-all',
                                          isYes
                                            ? 'scale-[1.05] bg-[#4D148C] text-white shadow-lg'
                                            : 'bg-transparent text-[#565656] hover:text-[#333333]'
                                        )}
                                      >
                                        Yes
                                      </button>
                                    </div>
                                  </div>

                                  <div
                                    className={cn(
                                      'overflow-hidden transition-all duration-300',
                                      isYes ? 'mt-6 max-h-[280px] opacity-100' : 'max-h-0 opacity-0'
                                    )}
                                  >
                                    <label className="mb-1.5 block text-[13px] font-bold text-[#565656]">
                                      Please explain:
                                    </label>
                                    <Textarea
                                      {...form.register(
                                        `safetyQuestions.${q.name}.explanation` as Path<ApplicationFormValues>
                                      )}
                                      className={cn(inputStyle, 'min-h-[80px] resize-y py-3')}
                                      placeholder="Required details..."
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-16 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col">
                      <span className="mb-2 text-xs font-bold uppercase tracking-widest text-[#565656]">
                        Completion progress
                      </span>
                      <div className="h-1 w-48 overflow-hidden rounded-full bg-[#e3e2e7]">
                        <div
                          className="h-full rounded-full bg-[#FF6200] transition-[width] duration-300"
                          style={{ width: `${ackProgress.pct}%` }}
                        />
                      </div>
                      <span className="mt-1.5 text-[11px] font-medium text-[#8E8E8E]">
                        {ackProgress.answered} of {ackProgress.total} answered
                      </span>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAckSaveDraft}
                        disabled={isSaving || isSubmitted}
                        className="px-8"
                      >
                        {isSaving ? 'Saving…' : 'Save draft'}
                      </Button>
                      <Button type="button" onClick={() => setActiveTab(APPLICATION_TABS[0].value)} className="px-8">
                        Review details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-12 rounded-xl border-[1.5px] border-[#4D148C] bg-gradient-to-br from-[#4D148C]/[0.04] to-[#FF6200]/[0.04] p-6">
                    <div className="flex items-start gap-3">
                      <div 
                        onClick={() => form.setValue('isCertified', !form.watch('isCertified'))}
                        className={cn(
                          "w-5 h-5 border-2 rounded shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-colors",
                          form.watch('isCertified') ? "bg-[#4D148C] border-[#4D148C]" : "border-[#E3E3E3] bg-white"
                        )}
                      >
                        {form.watch('isCertified') && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#333333]">I certify the above information is complete and accurate.</p>
                        <p className="text-[12px] text-[#8E8E8E] mt-1.5 leading-[1.5]">I acknowledge and agree that if the company learns the information is inaccurate or incomplete, regardless of when, it is a sufficient basis to either immediately rescind a conditional job offer or terminate my employment.</p>
                      </div>
                    </div>

                    <div className="mt-8">
                       <label className="text-[13px] font-bold text-[#565656] mb-2 block">Printed Name (Digital Signature)</label>
                       <Input 
                         {...form.register('printedName')}
                         className={cn(inputStyle, "max-w-[360px]")}
                         placeholder="Your full legal name"
                       />
                       <p className="text-[12px] text-[#8E8E8E] mt-2 italic">Your typed name serves as your digital signature</p>
                    </div>
                  </div>

                  {incompleteItems.length > 0 && (
                    <div className="mt-8 p-5 bg-[rgba(222,0,46,0.04)] border-[1.5px] border-[rgba(222,0,46,0.25)] rounded-xl mb-6">
                      <h3 className="text-[14px] font-bold text-[#DE002E] mb-3">Your application has the following incomplete items:</h3>
                      <div className="space-y-0">
                        {incompleteItems.map((err, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 py-2 border-b border-[rgba(222,0,46,0.1)] last:border-0">
                            <XCircle className="w-4 h-4 text-[#DE002E] shrink-0 mt-0.5" />
                            <span className="text-[13px] text-[#333333] flex-1 leading-snug">{err.message}</span>
                            <button 
                              type="button" 
                              onClick={() => setActiveTab(err.tabValue)}
                              className="text-[12px] font-bold text-[#4D148C] underline cursor-pointer shrink-0"
                            >
                              Go to {err.tabLabel}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={cn("mt-8 p-4 bg-[#F7B118]/[0.08] border border-[#F7B118]/40 rounded-lg flex gap-3 items-start", incompleteItems.length > 0 ? "mt-4" : "")}>
                     <span className="text-[18px] shrink-0">⚠️</span>
                     <p className="text-[13px] text-[#565656] font-medium leading-[1.5]">By clicking Certify Updated Information, you certify that the updated residential and employment information provided for the last 3 years is true and complete.</p>
                  </div>
                </div>
              </TabsContent>

                  <div className="mt-10 flex flex-col gap-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTabChange('prev')}
                disabled={activeTab === APPLICATION_TABS[0].value}
                className="fedex-btn-secondary w-full py-6 px-10 sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> Previous
              </Button>
              {activeTab !== APPLICATION_TABS[APPLICATION_TABS.length - 1].value ? (
                <Button
                  type="button"
                  onClick={() => handleTabChange('next')}
                  className="w-full py-5 px-12 text-lg sm:w-auto"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save & Continue'}{' '}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full py-5 px-12 text-lg sm:w-auto"
                  disabled={isSubmitting || isSubmitted || isSaving}
                  onClick={handleFinalSubmitClick}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-5 w-5" />
                  )}
                  {isSubmitted ? 'Information Certified' : 'Certify Updated Information'}
                </Button>
              )}
            </div>
          </Tabs>
        </fieldset>
      </form>
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-[#333333]">Are you ready to submit?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#565656] text-base">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="fedex-btn-secondary mt-2 px-6 sm:mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={form.handleSubmit(onSubmit)}
              className={cn('px-8', isSubmitting && 'opacity-50')}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Yes, Certify Updated Information'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
