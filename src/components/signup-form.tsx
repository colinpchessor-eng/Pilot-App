'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createUserWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { signupSchema, type SignupSchema } from '@/lib/schemas';
import { useAuth, useFirestore } from '@/firebase';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { triggerWelcomeEmail } from '@/app/actions';
import type { ApplicantData } from '@/lib/types';

export function SignupForm() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const bothConsented = privacyConsent && dataConsent;

  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: SignupSchema) {
    setLoading(true);
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: 'Firebase not initialized.',
      });
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      const userProfile: ApplicantData = {
        uid: user.uid,
        email: user.email,
        firstName: values.firstName,
        lastName: values.lastName,
        createdAt: serverTimestamp() as any,
        isAdmin: values.email.toLowerCase() === 'fedexadmin@fedex.com',
        firstClassMedicalDate: null,
        atpNumber: null,
        flightTime: {
          total: 0,
          turbinePic: 0,
          military: 0,
          civilian: 0,
          multiEngine: 0,
          instructor: 0,
          evaluator: 0,
          sic: 0,
          other: 0,
        },
        typeRatings: '',
        employmentHistory: [],
        safetyQuestions: {
          terminations: { answer: null, explanation: null },
          askedToResign: { answer: null, explanation: null },
          accidents: { answer: null, explanation: null },
          incidents: { answer: null, explanation: null },
          flightViolations: { answer: null, explanation: null },
          certificateAction: { answer: null, explanation: null },
          pendingFaaAction: { answer: null, explanation: null },
          failedCheckRide: { answer: null, explanation: null },
          formalDiscipline: { answer: null, explanation: null },
          investigationBoard: { answer: null, explanation: null },
          previousInterview: { answer: null, explanation: null },
          trainingCommitmentConflict: { answer: null, explanation: null },
          otherInfo: { answer: null, explanation: null },
        },
        submittedAt: null,
        isCertified: false,
        printedName: null,
        consentGiven: true,
        consentTimestamp: serverTimestamp() as any,
        consentVersion: '1.0',
        privacyPolicyVersion: 'March 2026',
      };

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, userProfile);

      const fullName = `${values.firstName} ${values.lastName}`.trim();
      await triggerWelcomeEmail(user.email!, fullName);

      toast({
        title: 'Account Created!',
        description: "You've been successfully signed up.",
      });

      if (userProfile.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      let description = 'An unexpected error occurred. Please try again.';

      if (error instanceof Error) {
        // Check if it's a Firebase Auth error
        if (
          'code' in error &&
          typeof error.code === 'string' &&
          error.code.startsWith('auth/')
        ) {
          const authError = error as AuthError;
          if (authError.code === 'auth/email-already-in-use') {
            description = 'This email is already registered.';
          } else {
            description = authError.message;
          }
        } else {
          description = error.message;
        }
      }

      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description,
      });
    } finally {
      setLoading(false);
    }
  }

  const labelStyle = "text-[13px] font-semibold text-[#565656] mb-1.5 block";
  const inputStyle = "h-12 border-[1.5px] border-[#E3E3E3] rounded-lg px-4 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus-visible:ring-[#4D148C] focus-visible:ring-offset-0 focus-visible:border-[#4D148C]";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelStyle}>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" className={inputStyle} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelStyle}>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" className={inputStyle} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelStyle}>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className={inputStyle}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelStyle}>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" className={inputStyle} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelStyle}>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" className={inputStyle} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Consent Checkboxes */}
        <div
          className="!mt-5 flex flex-col gap-3 rounded-lg p-4"
          style={{
            background: 'rgba(77,20,140,0.04)',
            border: '1px solid rgba(77,20,140,0.15)',
          }}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyConsent}
              onChange={(e) => { setPrivacyConsent(e.target.checked); setConsentError(false); }}
              className="mt-0.5 shrink-0"
              style={{ width: 18, height: 18, minWidth: 18, borderRadius: 4, accentColor: '#4D148C' }}
            />
            <span className="text-[13px] text-[#565656] leading-[1.5]">
              I have read and agree to the{' '}
              <Link href="/privacy" target="_blank" className="text-[#4D148C] font-semibold underline">
                Privacy Policy
              </Link>{' '}
              regarding how my application data will be collected and used.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dataConsent}
              onChange={(e) => { setDataConsent(e.target.checked); setConsentError(false); }}
              className="mt-0.5 shrink-0"
              style={{ width: 18, height: 18, minWidth: 18, borderRadius: 4, accentColor: '#4D148C' }}
            />
            <span className="text-[13px] text-[#565656] leading-[1.5]">
              I consent to FedEx Express collecting and processing my pilot application data for employment evaluation purposes.
            </span>
          </label>

          {consentError && (
            <p className="text-[12px]" style={{ color: '#DE002E' }}>
              Please agree to both items above to create your account.
            </p>
          )}
        </div>

        <Button
          type={bothConsented ? 'submit' : 'button'}
          onClick={bothConsented ? undefined : () => setConsentError(true)}
          className={
            bothConsented
              ? '!mt-6 w-full h-12 fedex-gradient text-white font-bold rounded-lg shadow-[0_4px_15px_rgba(77,20,140,0.3)] transition-all hover:brightness-110 active:translate-y-0.5'
              : '!mt-6 w-full h-12 font-bold rounded-lg transition-all !bg-[#E3E3E3] !text-[#8E8E8E] cursor-not-allowed !shadow-none'
          }
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Create Account
        </Button>
      </form>
    </Form>
  );
}
