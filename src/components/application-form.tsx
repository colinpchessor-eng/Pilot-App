'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
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
} from 'lucide-react';
import React from 'react';
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { Calendar } from './ui/calendar';
import { Textarea } from './ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { useRouter } from 'next/navigation';

const TABS = [
  { value: 'flight-time', label: 'Flight Time' },
  { value: 'type-ratings', label: 'Aeronautical Ratings and Certificates' },
  { value: 'employment-history', label: 'Employment' },
  { value: 'acknowledgment', label: 'Applicant Acknowledgment' },
];

const ACKNOWLEDGMENT_QUESTIONS = [
  {
    name: 'terminations',
    label:
      'Terminations or resignations in lieu of from any FAA covered positions?',
  },
  {
    name: 'askedToResign',
    label: 'Asked to resign from any FAA covered position?',
  },
  { name: 'accidents', label: 'Aircraft accidents?' },
  { name: 'incidents', label: 'Aircraft Incidents?' },
  { name: 'flightViolations', label: 'Flight violations?' },
  { name: 'certificateAction', label: 'Certificate suspension/revocation?' },
  {
    name: 'pendingFaaAction',
    label: 'Pending FAA Action/Letters of investigation?',
  },
  {
    name: 'failedCheckRide',
    label:
      'Have you ever failed a flight check ride, proficiency check, flight eval, or upgrade attempt aircraft or while compensated as a professional pilot (in the last three years)?',
  },
  {
    name: 'formalDiscipline',
    label: 'Have you ever received formal discipline from your?',
  },
  {
    name: 'investigationBoard',
    label:
      'Have you ever been called before a field board of investigation for any reason?',
  },
  {
    name: 'previousInterview',
    label:
      'Have you previously interviewed for the following positions at Fedex (not counting the one that you were hired under)?',
  },
  {
    name: 'trainingCommitmentConflict',
    label:
      'Do you have any commitment that will not allow you to enter and complete uninterrupted a training syllabus of approximately 10 weeks once commenced?',
  },
  {
    name: 'otherInfo',
    label:
      'Is there anything else you feel warrants and that you would like to bring up at this time?',
  },
];

export function ApplicationForm({
  applicantData,
}: {
  applicantData: ApplicantData;
}) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = React.useState(TABS[0].value);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const { toast } = useToast();

  // Helper to safely transform applicantData (which might be in an old format)
  // to the format expected by the form.
  const getDefaultValues = (
    data: ApplicantData
  ): ApplicationFormValues => {
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

        // Check if value is in the new format ({ answer, explanation }) or old (string/null)
        if (value && typeof value === 'object' && 'answer' in value) {
          safetyQuestionsDefault[questionKey] = {
            answer: value.answer ?? null,
            explanation: value.explanation ?? '',
          };
        } else if (value) {
          // It's the old format, just a string ('yes'/'no')
          safetyQuestionsDefault[questionKey] = {
            answer: value as 'yes' | 'no',
            explanation: '', // Old format didn't have per-question explanations
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
      },
      firstClassMedicalDate: data.firstClassMedicalDate
        ? data.firstClassMedicalDate.toDate()
        : null,
      atpNumber: data.atpNumber ?? '',
      typeRatings: data.typeRatings ?? '',
      employmentHistory: (data.employmentHistory || []).map((eh) => ({
        ...eh,
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

  const employmentHistory = form.watch('employmentHistory');
  const hasEmploymentHistory =
    employmentHistory && employmentHistory.length > 0;

  const [employmentConfirmed, setEmploymentConfirmed] = React.useState(
    !applicantData.employmentHistory ||
      applicantData.employmentHistory.length === 0
  );

  const {
    fields: employmentFields,
    append: appendEmployment,
    remove: removeEmployment,
  } = useFieldArray({
    control: form.control,
    name: 'employmentHistory',
  });

  const handleTabChange = async (direction: 'next' | 'prev') => {
    const currentTabIndex = TABS.findIndex((tab) => tab.value === activeTab);
    const isNext = direction === 'next';
  
    if (isNext) {
      const currentTabValue = TABS[currentTabIndex].value;
      let fieldsToValidate: (keyof ApplicationFormValues)[] | keyof ApplicationFormValues | undefined;
  
      switch (currentTabValue) {
        case 'flight-time':
          fieldsToValidate = 'flightTime';
          break;
        case 'type-ratings':
          fieldsToValidate = ['firstClassMedicalDate', 'atpNumber', 'typeRatings'];
          break;
        case 'employment-history':
          if (!employmentConfirmed) {
            fieldsToValidate = 'employmentHistory';
          }
          break;
        case 'acknowledgment':
          // No validation needed when clicking "Next" as it's the last tab
          break;
      }
  
      if (fieldsToValidate) {
        const isValid = await form.trigger(fieldsToValidate);
        if (!isValid) {
          toast({
            variant: 'destructive',
            title: 'Incomplete Information',
            description: 'Please review the current section for errors before continuing.',
          });
          return;
        }
      }
    }
  
    const nextTabIndex = isNext ? currentTabIndex + 1 : currentTabIndex - 1;
    if (nextTabIndex >= 0 && nextTabIndex < TABS.length) {
      setActiveTab(TABS[nextTabIndex].value);
    }
  };

  const onSubmit = (values: ApplicationFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    const docRef = doc(firestore, 'users', user.uid);
    const submissionData = {
      ...values,
      submittedAt: serverTimestamp(),
    };

    setDoc(docRef, submissionData, { merge: true })
      .then(() => {
        toast({
          title: 'Application Submitted!',
          description: 'Thank you for your interest in FedEx.',
          variant: 'default',
          duration: 5000,
        });
        router.push('/dashboard');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: submissionData,
        });
        errorEmitter.emit('permission-error', permissionError);
        // The listener will show a toast.
      })
      .finally(() => {
        setIsSubmitting(false);
        setShowSubmitDialog(false);
      });
  };

  const onInvalid = (errors: any) => {
    const errorFields = Object.keys(errors);
    if (errorFields.length === 0) return;

    // This logic finds which tab the first error is on
    let firstErrorField = errorFields[0] as keyof ApplicationFormValues;

    // Special handling for nested objects
    if (firstErrorField === 'safetyQuestions' && errors.safetyQuestions) {
        firstErrorField =
        'safetyQuestions.' +
        Object.keys(
          errors.safetyQuestions
        )[0] as keyof ApplicationFormValues;
    }
    if (firstErrorField === 'flightTime' && errors.flightTime) {
        firstErrorField =
        'flightTime.' + Object.keys(errors.flightTime)[0] as keyof ApplicationFormValues;
    }
    if (firstErrorField === 'employmentHistory' && errors.employmentHistory) {
      // Logic to find the specific field in the array can be complex.
      // For now, we'll just point to the employment history tab.
      firstErrorField = 'employmentHistory';
    }


    const fieldToTabMap: Record<string, { tab: string; label: string }> = {
      flightTime: { tab: 'flight-time', label: 'Flight Time' },
      firstClassMedicalDate: {
        tab: 'type-ratings',
        label: 'Aeronautical Ratings and Certificates',
      },
      atpNumber: {
        tab: 'type-ratings',
        label: 'Aeronautical Ratings and Certificates',
      },
      typeRatings: {
        tab: 'type-ratings',
        label: 'Aeronautical Ratings and Certificates',
      },
      employmentHistory: { tab: 'employment-history', label: 'Employment' },
      safetyQuestions: {
        tab: 'acknowledgment',
        label: 'Applicant Acknowledgment',
      },
      isCertified: {
        tab: 'acknowledgment',
        label: 'Applicant Acknowledgment',
      },
      printedName: {
        tab: 'acknowledgment',
        label: 'Applicant Acknowledgment',
      },
    };
    
    // Find the tab for the first error field. We might need to check prefixes for nested fields.
    const errorKey = Object.keys(fieldToTabMap).find(key => firstErrorField.startsWith(key));
    const errorLocation = errorKey ? fieldToTabMap[errorKey] : null;


    if (errorLocation) {
      setActiveTab(errorLocation.tab);
      toast({
        variant: 'destructive',
        title: 'Incomplete Application',
        description: `Please review the "${errorLocation.label}" section for missing information.`,
        duration: 5000,
      });
    } else {
      // Fallback for any error not mapped
      toast({
        variant: 'destructive',
        title: 'Incomplete Application',
        description: 'Please review all sections for missing information.',
        duration: 5000,
      });
    }
  };

  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!user || !firestore) return;
      if (name !== 'isCertified' && name !== 'printedName') {
        setIsSaving(true);
        const timer = setTimeout(() => {
          const docRef = doc(firestore, 'users', user.uid);
          setDoc(docRef, value, { merge: true })
            .catch((serverError) => {
              const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: value,
              });
              errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
              setIsSaving(false);
            });
        }, 1000);
        return () => clearTimeout(timer);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, user, firestore]);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const isSubmitted = !!applicantData.submittedAt;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          () => setShowSubmitDialog(true),
          onInvalid
        )}
      >
        <fieldset disabled={isSubmitted}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Pilot Application
              </h1>
              <p className="text-muted-foreground">
                Please review and provide updates from the last 3 years.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSubmitted ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Submitted</span>
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Progress saved</span>
                </>
              )}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-4 h-auto">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-wrap h-full">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Card className="mt-4">
              <TabsContent value="flight-time">
                <CardHeader>
                  <CardTitle>Flight Time</CardTitle>
                  <CardDescription>
                    Enter your flight hours in the fields below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="flightTime.total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Flight Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 3000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.turbinePic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Turbine PIC Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 1000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.military"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Military Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.civilian"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Civilian Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 2500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.multiEngine"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Multi-engine Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 1500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.instructor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructor Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.evaluator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evaluator Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 100"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.sic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIC Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 1000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.other"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </TabsContent>

              <TabsContent value="type-ratings">
                <CardHeader>
                  <CardTitle>Aeronautical Ratings and Certificates</CardTitle>
                  <CardDescription>
                    Provide your medical certificate date, ATP number, and all
                    aircraft type ratings you hold.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="firstClassMedicalDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>
                          Date of your first class medical certificate
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-[280px] pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date('1950-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="atpNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What is your ATP number?</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1234567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="typeRatings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Please indicate all aircraft type ratings you hold
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. B-737, Commercial Pilot License"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter each rating or certificate on a new line or
                          separated by commas. At a minimum, please add your FAA
                          ATP certificate to continue.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </TabsContent>

              <TabsContent value="employment-history">
                <CardHeader>
                  <CardTitle>Employment History</CardTitle>
                  <CardDescription>
                    Please provide your employment history. Start with your most
                    recent employer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3 rounded-md border p-4">
                    <Checkbox
                      id="employment-confirmed"
                      checked={employmentConfirmed}
                      onCheckedChange={(checked) =>
                        setEmploymentConfirmed(Boolean(checked))
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="employment-confirmed"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        My employment history is up-to-date.
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Uncheck this box to add or edit your employment history.
                      </p>
                    </div>
                  </div>

                  {!employmentConfirmed && (
                    <div className="space-y-4 pt-4">
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

                          return (
                            <AccordionItem
                              value={field.id}
                              key={field.id}
                              className="rounded-lg border px-4"
                            >
                              <AccordionTrigger>
                                <div className="flex-1 text-left">
                                  <p className="font-semibold">
                                    {employerName || `Employer #${index + 1}`}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {jobTitle || 'Job Title'}
                                  </p>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.employerName`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Employer Name</FormLabel>
                                          <FormControl>
                                            <Input
                                              placeholder="e.g. FedEx"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.jobTitle`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Job Title</FormLabel>
                                          <FormControl>
                                            <Input
                                              placeholder="e.g. First Officer"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.startDate`}
                                      render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                          <FormLabel>Start Date</FormLabel>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <FormControl>
                                                <Button
                                                  variant={'outline'}
                                                  className={cn(
                                                    'w-full pl-3 text-left font-normal',
                                                    !field.value &&
                                                      'text-muted-foreground'
                                                  )}
                                                >
                                                  {field.value ? (
                                                    format(field.value, 'PPP')
                                                  ) : (
                                                    <span>Pick a date</span>
                                                  )}
                                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                              </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent
                                              className="w-auto p-0"
                                              align="start"
                                            >
                                              <Calendar
                                                mode="single"
                                                selected={field.value ?? undefined}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                  date > new Date() ||
                                                  date <
                                                    new Date('1950-01-01')
                                                }
                                                initialFocus
                                              />
                                            </PopoverContent>
                                          </Popover>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.isCurrent`}
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-2 pb-2">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value}
                                              onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                if (checked) {
                                                  form.setValue(
                                                    `employmentHistory.${index}.endDate`,
                                                    null
                                                  );
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel>
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
                                          <FormLabel>End Date</FormLabel>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <FormControl>
                                                <Button
                                                  variant={'outline'}
                                                  className={cn(
                                                    'w-full pl-3 text-left font-normal',
                                                    !field.value &&
                                                      'text-muted-foreground'
                                                  )}
                                                >
                                                  {field.value ? (
                                                    format(field.value, 'PPP')
                                                  ) : (
                                                    <span>Pick a date</span>
                                                  )}
                                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                              </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent
                                              className="w-auto p-0"
                                              align="start"
                                            >
                                              <Calendar
                                                mode="single"
                                                selected={field.value ?? undefined}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                  date > new Date() ||
                                                  date <
                                                    form.getValues(
                                                      `employmentHistory.${index}.startDate`
                                                    )
                                                }
                                                initialFocus
                                              />
                                            </PopoverContent>
                                          </Popover>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.aircraftTypes`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Aircraft Flown</FormLabel>
                                          <FormControl>
                                            <Input
                                              placeholder="e.g. B777, MD-11"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.totalHours`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Total Hours with Employer
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              placeholder="e.g. 1200"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <FormField
                                    control={form.control}
                                    name={`employmentHistory.${index}.duties`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Positions Held & Duties
                                        </FormLabel>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Describe your roles and responsibilities..."
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeEmployment(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
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
                            startDate: new Date(),
                            endDate: null,
                            isCurrent: false,
                            aircraftTypes: '',
                            totalHours: 0,
                            duties: '',
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Employer
                      </Button>
                      {form.formState.errors.employmentHistory && (
                        <p className="text-sm font-medium text-destructive">
                          {typeof form.formState.errors.employmentHistory ===
                          'string'
                            ? form.formState.errors.employmentHistory
                            : form.formState.errors.employmentHistory.message}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              <TabsContent value="acknowledgment">
                <CardHeader>
                  <CardTitle>Applicant Acknowledgment</CardTitle>
                  <CardDescription>
                    Please update the information you provided on your
                    application for employment. Indicate whether there have been
                    any changes or updates to your responses to the following
                    questions. Also indicate whether there have been any changes
                    in your employment status, specifically if there was a
                    resignation in lieu of termination or a termination of your
                    employment. Please respond "yes" or "no" to each question
                    and explain each "yes" response below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {ACKNOWLEDGMENT_QUESTIONS.map((q) => {
                    const questionName =
                      q.name as keyof ApplicationFormValues['safetyQuestions'];
                    const answer = form.watch(
                      `safetyQuestions.${questionName}.answer`
                    );

                    return (
                      <div key={q.name} className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`safetyQuestions.${questionName}.answer`}
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>{q.label}</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value ?? ''}
                                  className="flex items-center gap-4"
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="yes" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      Yes
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="no" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      No
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {answer === 'yes' && (
                          <FormField
                            control={form.control}
                            name={`safetyQuestions.${questionName}.explanation`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">
                                  Explanation for {q.label}
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Please explain your 'Yes' answer here."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="space-y-6 pt-6 border-t">
                    <FormField
                      control={form.control}
                      name="isCertified"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I certify the above information is complete and
                              accurate.
                            </FormLabel>
                            <FormDescription>
                              I acknowledge and agree that if the company learns
                              the information is inaccurate or incomplete,
                              regardless of when, it is a sufficient basis to
                              either immediately rescind a conditional job offer
                              or terminate my employment.
                            </FormDescription>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="printedName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Printed Name (as digital signature)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-sm text-muted-foreground">
                      By clicking "Submit Application", you certify that all
                      information provided is true and complete to the best of
                      your knowledge.
                    </p>
                  </div>
                </CardContent>
              </TabsContent>
            </Card>
          </Tabs>

          <div className="mt-6 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleTabChange('prev')}
              disabled={activeTab === TABS[0].value}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {activeTab !== TABS[TABS.length - 1].value ? (
              <Button
                type="button"
                variant="default"
                onClick={() => handleTabChange('next')}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="accent"
                className="bg-accent hover:bg-accent/90"
                disabled={isSubmitting || isSubmitted}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSubmitted ? 'Application Submitted' : 'Submit Application'}
              </Button>
            )}
          </div>
        </fieldset>
      </form>
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you ready to submit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will not be able to make changes
              to your application after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={form.handleSubmit(onSubmit)}
              className={cn(
                'bg-accent hover:bg-accent/90',
                isSubmitting && 'opacity-50'
              )}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
