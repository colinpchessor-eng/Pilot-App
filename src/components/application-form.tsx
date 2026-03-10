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
  Check,
  FileUp,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import React from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  saveApplication,
  submitApplication,
  uploadResume,
} from '@/app/actions';
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
import { useUser } from '@/firebase';

const TABS = [
  { value: 'flight-time', label: 'Flight Time' },
  { value: 'type-ratings', label: 'Type Ratings' },
  { value: 'safety', label: 'Safety Questionnaire' },
  { value: 'resume', label: 'Resume' },
  { value: 'submit', label: 'Review & Submit' },
];

export function ApplicationForm({
  applicantData,
}: {
  applicantData: ApplicantData;
}) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = React.useState(TABS[0].value);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      flightTime: applicantData.flightTime,
      typeRatings: applicantData.typeRatings,
      safetyQuestions: applicantData.safetyQuestions,
      resumeFileName: applicantData.resumeFileName ?? undefined,
      trainingCommitment: applicantData.trainingCommitment ?? false,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'typeRatings',
  });

  const handleTabChange = async (direction: 'next' | 'prev') => {
    const currentTabIndex = TABS.findIndex((tab) => tab.value === activeTab);
    const isNext = direction === 'next';

    if (isNext) {
      const fieldsToValidate = TABS[currentTabIndex]
        .value as keyof ApplicationFormValues;
      const isValid = await form.trigger(fieldsToValidate as any);
      if (!isValid) return;
    }

    const nextTabIndex = isNext ? currentTabIndex + 1 : currentTabIndex - 1;
    if (nextTabIndex >= 0 && nextTabIndex < TABS.length) {
      setActiveTab(TABS[nextTabIndex].value);
    }
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', file);
    const result = await uploadResume(user.uid, formData);
    setIsUploading(false);

    if (result.success && result.fileName) {
      form.setValue('resumeFileName', result.fileName, {
        shouldValidate: true,
      });
      toast({ title: 'Success', description: result.message });
    } else {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: result.message,
      });
    }
  };

  const onSubmit = async (values: ApplicationFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    const result = await submitApplication(user.uid, values);
    setIsSubmitting(false);
    setShowSubmitDialog(false);

    if (result.success) {
      toast({
        title: 'Application Submitted!',
        description: 'Thank you for your interest in FedEx.',
        variant: 'default',
        duration: 5000,
      });
      // The form is not reset to allow viewing submitted data.
      // A submitted status should lock the form.
    } else {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: result.message,
      });
    }
  };

  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!user) return;
      if (name !== 'trainingCommitment') {
        setIsSaving(true);
        const timer = setTimeout(async () => {
          await saveApplication(user.uid, value);
          setIsSaving(false);
        }, 1000);
        return () => clearTimeout(timer);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, user]);
  
  const isSubmitted = !!applicantData.submittedAt;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => setShowSubmitDialog(true))}>
        <fieldset disabled={isSubmitted}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Pilot Application
            </h1>
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
            <TabsList className="grid w-full grid-cols-5">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
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
                <CardContent className="space-y-4">
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
                    name="flightTime.multiCrew"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Civilian Multi-Crew Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 1500"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum 500 hours required.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightTime.pic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pilot in Command (PIC) Hours</FormLabel>
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
                </CardContent>
              </TabsContent>

              <TabsContent value="type-ratings">
                <CardHeader>
                  <CardTitle>Aircraft Type Ratings</CardTitle>
                  <CardDescription>
                    List all your current aircraft type ratings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`typeRatings.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder="e.g. B-737" {...field} />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ value: '' })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rating
                  </Button>
                  {form.formState.errors.typeRatings && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.typeRatings.message}
                    </p>
                  )}
                </CardContent>
              </TabsContent>

              <TabsContent value="safety">
                <CardHeader>
                  <CardTitle>Safety Questionnaire</CardTitle>
                  <CardDescription>
                    Please answer the following questions honestly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="safetyQuestions.incidents"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>
                          Have you ever had any aircraft incidents?
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center gap-4"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="yes" />
                              </FormControl>
                              <FormLabel className="font-normal">Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="no" />
                              </FormControl>
                              <FormLabel className="font-normal">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safetyQuestions.accidents"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>
                          Have you ever had any aircraft accidents?
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center gap-4"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="yes" />
                              </FormControl>
                              <FormLabel className="font-normal">Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="no" />
                              </FormControl>
                              <FormLabel className="font-normal">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safetyQuestions.faaAction"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>
                          Have you ever been subject to FAA enforcement action?
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center gap-4"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="yes" />
                              </FormControl>
                              <FormLabel className="font-normal">Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="no" />
                              </FormControl>
                              <FormLabel className="font-normal">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </TabsContent>

              <TabsContent value="resume">
                <CardHeader>
                  <CardTitle>Upload Resume</CardTitle>
                  <CardDescription>
                    Please upload your resume in PDF format (max 5MB).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="resumeFileName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
                            <div className="text-center">
                              <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                              <p className="mt-2 text-sm text-muted-foreground">
                                Drag & drop or click to upload PDF
                              </p>
                            </div>
                            <Input
                              type="file"
                              accept="application/pdf"
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              onChange={onFileChange}
                              disabled={isUploading}
                            />
                          </div>
                        </FormControl>

                        {isUploading ? (
                          <div className="flex items-center gap-2 rounded-md border p-3">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Uploading...</span>
                          </div>
                        ) : (
                          field.value && (
                            <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-5 w-5" />
                                <span className="text-sm font-medium">
                                  {field.value}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  form.setValue('resumeFileName', undefined)
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </TabsContent>

              <TabsContent value="submit">
                <CardHeader>
                  <CardTitle>Review & Submit</CardTitle>
                  <CardDescription>
                    {isSubmitted
                      ? 'Your application has been submitted.'
                      : 'Please review your application and confirm your commitment.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="trainingCommitment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Training Commitment</FormLabel>
                          <FormDescription>
                            I confirm I can commit to the 10-week training
                            syllabus if my application is successful.
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <p className="text-sm text-muted-foreground">
                    By clicking "Submit Application", you certify that all
                    information provided is true and complete to the best of
                    your knowledge.
                  </p>
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
