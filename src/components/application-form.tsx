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
  Info,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
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
  { id: 1, group: 'Employment History', name: 'terminations', label: 'Terminations or resignations in lieu of from any FAA covered positions?' },
  { id: 2, group: 'Employment History', name: 'askedToResign', label: 'Asked to resign from any FAA covered position?' },
  { id: 3, group: 'Employment History', name: 'formalDiscipline', label: 'Have you ever received formal discipline from your employer?' },
  { id: 4, group: 'Aviation Record', name: 'accidents', label: 'Aircraft accidents?' },
  { id: 5, group: 'Aviation Record', name: 'incidents', label: 'Aircraft Incidents?' },
  { id: 6, group: 'Aviation Record', name: 'flightViolations', label: 'Flight violations?' },
  { id: 7, group: 'Aviation Record', name: 'certificateAction', label: 'Certificate suspension/revocation?' },
  { id: 8, group: 'Aviation Record', name: 'pendingFaaAction', label: 'Pending FAA Action/Letters of investigation?' },
  { id: 9, group: 'Aviation Record', name: 'failedCheckRide', label: 'Have you ever failed a flight check ride, proficiency check, flight eval, or upgrade attempt aircraft or while compensated as a professional pilot (in the last three years)?', isYesNo: true },
  { id: 10, group: 'General Disclosures', name: 'investigationBoard', label: 'Have you ever been called before a field board of investigation for any reason?' },
  { id: 11, group: 'General Disclosures', name: 'previousInterview', label: 'Have you previously interviewed for the following positions at Fedex (not counting the one that you were hired under)?', isYesNo: true },
  { id: 12, group: 'General Disclosures', name: 'trainingCommitmentConflict', label: 'Do you have any commitment that will not allow you to enter and complete uninterrupted a training syllabus of approximately 10 weeks once commenced?', isYesNo: true },
  { id: 13, group: 'General Disclosures', name: 'otherInfo', label: 'Is there anything else you feel warrants and that you would like to bring up at this time?', isYesNo: true },
];

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
  const [activeTab, setActiveTab] = React.useState(TABS[0].value);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [incompleteItems, setIncompleteItems] = useState<IncompleteItem[]>([]);
  const { toast } = useToast();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Sticky Detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: [1] }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll active tab into view on mobile
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeTab]);

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
      },
      firstClassMedicalDate: data.firstClassMedicalDate ? data.firstClassMedicalDate.toDate() : null,
      atpNumber: Number(data.atpNumber) || 0,
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

  const { fields: employmentFields, append: appendEmployment, remove: removeEmployment } = useFieldArray({
    control: form.control,
    name: 'employmentHistory',
  });

  const [employmentConfirmed, setEmploymentConfirmed] = React.useState(
    !applicantData.employmentHistory || applicantData.employmentHistory.length === 0
  );

  const saveDataToFirestore = async () => {
    if (!user || !firestore) return false;
    setIsSaving(true);
    try {
      const values = form.getValues();
      const docRef = doc(firestore, 'users', user.uid);
      await updateDoc(docRef, values as any);
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving your data.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = async (direction: 'next' | 'prev') => {
    const currentTabIndex = TABS.findIndex((tab) => tab.value === activeTab);
    
    if (direction === 'next') {
      const saved = await saveDataToFirestore();
      if (saved) {
        const nextTabIndex = currentTabIndex + 1;
        if (nextTabIndex < TABS.length) setActiveTab(TABS[nextTabIndex].value);
      }
    } else {
      const nextTabIndex = currentTabIndex - 1;
      if (nextTabIndex >= 0) setActiveTab(TABS[nextTabIndex].value);
    }
  };

  const onSubmit = (values: ApplicationFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    const docRef = doc(firestore, 'users', user.uid);
    setDoc(docRef, { ...values, submittedAt: serverTimestamp() }, { merge: true })
      .then(() => {
        toast({ title: 'Application Submitted!' });
        router.push('/dashboard');
      })
      .finally(() => {
        setIsSubmitting(false);
        setShowSubmitDialog(false);
      });
  };

  const checkValidationAndShowErrors = () => {
    const data = form.getValues();
    console.log('Form data at submission:', JSON.stringify(data, null, 2));

    const errors: IncompleteItem[] = [];

    // Flight Time Checks
    const flightFields = ['total', 'turbinePic', 'military', 'civilian', 'multiEngine', 'instructor', 'evaluator', 'sic', 'other'];
    let flightHasValue = false;
    flightFields.forEach(f => {
      const val = data.flightTime[f as keyof typeof data.flightTime];
      if (val > 0) flightHasValue = true;
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
  const labelStyle = "text-[13px] font-semibold text-[#565656] mb-[6px] block";

  const getTabErrorIndicator = (tabValue: string) => {
    return incompleteItems.some(item => item.tabValue === tabValue) ? (
      <span className="w-1.5 h-1.5 bg-[#DE002E] rounded-full inline-block ml-1.5 align-middle" />
    ) : null;
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <fieldset disabled={isSubmitted}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#333333]">Pilot Application</h1>
              <p className="text-[#8E8E8E] mt-1">Please review and provide updates from the last 3 years.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8E8E8E] bg-[#F2F2F2] px-4 py-2 rounded-full border border-[#E3E3E3]">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></> : <><Check className="h-4 w-4 text-[#008A00]" /><span>{isSubmitted ? 'Submitted' : 'Ready'}</span></>}
            </div>
          </div>

          <div ref={sentinelRef} className="h-px w-full" />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className={cn(
              "sticky top-[88px] z-40 flex items-center h-[44px] gap-1 px-6 w-auto max-w-fit mx-6 mb-4 rounded-[16px] overflow-hidden",
              "bg-[rgba(45,42,58,0.96)] backdrop-blur-[16px] saturate-[160%]",
              "border-t border-white/10 border-b border-black/20",
              "transition-all duration-300",
              isStuck && "shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
            )}>
              <TabsList className="flex overflow-x-auto scrollbar-none h-auto p-0 bg-transparent gap-1 w-full items-center">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <TabsTrigger 
                      key={tab.value} 
                      value={tab.value}
                      ref={isActive ? activeTabRef : null}
                      className={cn(
                        "px-[18px] py-[6px] rounded-full text-[14px] font-medium transition-all duration-200 whitespace-nowrap border-none shadow-none h-auto leading-[1.4] flex items-center justify-center",
                        isActive 
                          ? "bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] text-white font-semibold shadow-[0_2px_10px_rgba(77,20,140,0.4)] data-[state=active]:bg-none data-[state=active]:text-white" 
                          : "text-[#a0a0a0] hover:bg-white/10 hover:text-white bg-transparent"
                      )}
                    >
                      {tab.label}
                      {getTabErrorIndicator(tab.value)}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <Card className="mt-4 border-[#E3E3E3] shadow-[0_2px_12px_rgba(0,0,0,0.06)] bg-white rounded-xl overflow-hidden">
              <TabsContent value="flight-time" className="p-6 pt-2 bg-transparent">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {['total', 'turbinePic', 'military', 'civilian', 'multiEngine', 'instructor', 'evaluator', 'sic', 'other'].map(f => (
                       <FormField key={f} control={form.control} name={`flightTime.${f}` as any} render={({field}) => (
                         <FormItem>
                           <FormLabel className={labelStyle}>{f.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Hours</FormLabel>
                           <FormControl>
                             <Input 
                               type="number" 
                               min="0"
                               className={inputStyle} 
                               placeholder="0"
                               {...field} 
                             />
                           </FormControl>
                         </FormItem>
                       )} />
                    ))}
                 </div>
              </TabsContent>

              <TabsContent value="type-ratings" className="p-6 pt-2 space-y-6 bg-transparent">
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

              <TabsContent value="employment-history" className="p-6 pt-2 space-y-6 bg-transparent">
                 <div className="p-5 rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] flex items-start gap-3 mt-4">
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

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                    <FormField
                                      control={form.control}
                                      name={`employmentHistory.${index}.startDate`}
                                      render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                          <FormLabel className={labelStyle}>Start Date</FormLabel>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <FormControl>
                                                <Button
                                                  variant={'outline'}
                                                  className={cn(
                                                    'w-full pl-3 text-left font-normal border-[#D0D0D0] rounded-lg h-[42px]',
                                                    !field.value &&
                                                      'text-[#8E8E8E]'
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
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <FormControl>
                                                <Button
                                                  variant={'outline'}
                                                  className={cn(
                                                    'w-full pl-3 text-left font-normal border-[#D0D0D0] rounded-lg h-[42px]',
                                                    !field.value &&
                                                      'text-[#8E8E8E]'
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

              <TabsContent value="acknowledgment" className="m-0 bg-transparent">
                <div className="p-8">
                  <h2 className="text-[20px] font-bold text-[#333333] mb-4">Applicant Acknowledgment</h2>
                  <div className="text-[14px] color-[#565656] leading-[1.6] max-w-[640px] mb-8 p-4 bg-[#f5f0ff] border-l-4 border-[#4D148C] rounded-r-lg">
                    Please update the information you provided on your application for employment. Indicate whether there have been any changes or updates to your responses. Explain each "yes" response below.
                  </div>

                  {['Employment History', 'Aviation Record', 'General Disclosures'].map(groupName => (
                    <div key={groupName} className="mb-8">
                      <h3 className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#8E8E8E] mb-4 pb-2 border-b border-[#E3E3E3]">{groupName}</h3>
                      <div className="space-y-3">
                        {ACKNOWLEDGMENT_QUESTIONS.filter(q => q.group === groupName).map((q) => {
                          const answer = form.watch(`safetyQuestions.${q.name as keyof ApplicationFormValues['safetyQuestions']}.answer`);
                          const isYes = answer === 'yes';
                          return (
                            <div key={q.id} className={cn(
                              "p-5 md:p-6 rounded-xl border transition-all duration-200",
                              isYes ? "border-[#4D148C] bg-[#fdfcff] shadow-[0_0_0_3px_rgba(77,20,140,0.08)]" : 
                              (answer === 'no' ? "border-[#E3E3E3] bg-[#FAFAFA]" : "border-[#E3E3E3] bg-white")
                            )}>
                              <div className="flex items-start gap-1 mb-4">
                                <span className="bg-[#F2F2F2] text-[#8E8E8E] text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 shrink-0">{q.id}</span>
                                <p className="text-[14px] font-semibold text-[#333333] leading-[1.5]">{q.label}</p>
                              </div>
                              
                              <div className="flex flex-wrap gap-3">
                                <button type="button" onClick={() => form.setValue(`safetyQuestions.${q.name as any}.answer`, 'yes')} className={cn(
                                  "inline-flex items-center gap-2 px-5 py-2 rounded-full border-[1.5px] text-[14px] font-medium transition-all",
                                  isYes ? "bg-[#4D148C] border-[#4D148C] text-white shadow-[0_2px_8px_rgba(77,20,140,0.3)]" : "border-[#E3E3E3] text-[#565656] hover:border-[#4D148C] hover:text-[#4D148C]"
                                )}>Yes</button>
                                <button type="button" onClick={() => form.setValue(`safetyQuestions.${q.name as any}.answer`, 'no')} className={cn(
                                  "inline-flex items-center gap-2 px-5 py-2 rounded-full border-[1.5px] text-[14px] font-medium transition-all",
                                  answer === 'no' ? "bg-[#F2F2F2] border-[#8E8E8E] text-[#333333]" : "border-[#E3E3E3] text-[#565656] hover:border-[#4D148C] hover:text-[#4D148C]"
                                )}>No</button>
                              </div>

                              <div className={cn(
                                "overflow-hidden transition-all duration-300",
                                isYes ? "max-h-[200px] opacity-100 mt-4" : "max-h-0 opacity-0"
                              )}>
                                <label className="text-[13px] font-bold text-[#565656] mb-1.5 block">Please explain:</label>
                                <Textarea 
                                  {...form.register(`safetyQuestions.${q.name as any}.explanation`)}
                                  className={cn(inputStyle, "min-h-[80px] resize-y py-3")}
                                  placeholder="Required details..."
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="mt-12 p-6 rounded-xl border-[1.5px] border-[#4D148C] bg-gradient-to-br from-[#4D148C]/[0.04] to-[#FF6200]/[0.04]">
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
                     <p className="text-[13px] text-[#565656] font-medium leading-[1.5]">By clicking Submit Application, you certify that all information provided is true and complete to the best of your knowledge.</p>
                  </div>
                </div>
              </TabsContent>
            </Card>
          </Tabs>

          <div className="mt-10 flex justify-between items-center pb-20">
            <Button type="button" variant="outline" onClick={() => handleTabChange('prev')} disabled={activeTab === TABS[0].value} className="fedex-btn-secondary py-6 px-10">
              <ArrowLeft className="mr-2 h-5 w-5" /> Previous
            </Button>
            {activeTab !== TABS[TABS.length - 1].value ? (
              <Button type="button" onClick={() => handleTabChange('next')} className="fedex-btn-primary py-6 px-12" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save & Continue"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button type="button" className="fedex-btn-primary py-6 px-12" disabled={isSubmitting || isSubmitted || isSaving} onClick={handleFinalSubmitClick}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                {isSubmitted ? 'Application Submitted' : 'Submit Application'}
              </Button>
            )}
          </div>
        </fieldset>
      </form>
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-[#333333]">Are you ready to submit?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#565656] text-base">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-lg border-[#E3E3E3] font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={form.handleSubmit(onSubmit)} className={cn('fedex-btn-primary px-8', isSubmitting && 'opacity-50')} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Yes, Submit My Application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
