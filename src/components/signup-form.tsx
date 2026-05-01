'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth';
import {
  completeCandidateIdVerification,
  syncLegacyDataForUser,
} from '@/app/applicant/verification-actions';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { signupSchema, type SignupSchema } from '@/lib/schemas';
import { useAuth, useFirestore } from '@/firebase';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PrivacyPolicyArticle } from '@/components/legal/privacy-policy-article';
import { createSessionCookie } from '@/app/auth/actions';
import type { ApplicantData } from '@/lib/types';
import { writeCandidateAuditLog } from '@/lib/candidate-audit';

export function SignupForm() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [isAdminEmail, setIsAdminEmail] = useState(false);

  const bothConsented = privacyConsent && dataConsent;

  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      candidateId: '',
    },
  });

  const watchedEmail = useWatch({ control: form.control, name: 'email', defaultValue: '' });

  useEffect(() => {
    if (!firestore) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const raw = (watchedEmail || '').trim().toLowerCase();
      if (!raw || !raw.includes('@')) {
        if (!cancelled) setIsAdminEmail(false);
        return;
      }
      void (async () => {
        try {
          const snap = await getDoc(doc(firestore, 'authorizedAdmins', raw));
          const ok = snap.exists() && snap.data()?.active === true;
          if (!cancelled) setIsAdminEmail(ok);
        } catch {
          if (!cancelled) setIsAdminEmail(false);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [watchedEmail, firestore]);

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

    const emailLower = values.email.trim().toLowerCase();
    const adminRef = doc(firestore, 'authorizedAdmins', emailLower);
    const adminSnap = await getDoc(adminRef);
    const isAuthorizedAdmin = adminSnap.exists() && adminSnap.data()?.active === true;
    const authorizedRole =
      isAuthorizedAdmin &&
      (adminSnap.data()?.role === 'admin' || adminSnap.data()?.role === 'dev')
        ? (adminSnap.data()?.role as 'admin' | 'dev')
        : null;
    const skipCandidateVerify = authorizedRole !== null;
    const staffRole = authorizedRole;

    if (!skipCandidateVerify && values.candidateId.trim().length < 6) {
      form.setError('candidateId', {
        type: 'manual',
        message: 'Please enter a valid Legacy ID',
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

      if (!skipCandidateVerify) {
        let verifyResult: Awaited<ReturnType<typeof completeCandidateIdVerification>>;
        try {
          const idToken = await user.getIdToken();
          verifyResult = await completeCandidateIdVerification({
            idToken,
            candidateId: values.candidateId,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Verification failed.';
          verifyResult = { ok: false, error: msg };
        }
        if (!verifyResult.ok) {
          await user.delete().catch(() => {});
          form.setError('candidateId', {
            type: 'manual',
            message: verifyResult.error,
          });
          setLoading(false);
          return;
        }
      }

      /** Fields allowed on users/{uid} merge after server verification (see firestore.rules). */
      const applicantOnlyMerge = {
        firstName: values.firstName,
        lastName: values.lastName,
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
          nightHours: 0,
          lastAircraftFlown: '',
          dateLastFlown: '',
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
      if (staffRole) {
        const staffProfile: ApplicantData = {
          uid: user.uid,
          email: user.email,
          firstName: values.firstName,
          lastName: values.lastName,
          createdAt: serverTimestamp() as any,
          isAdmin: true,
          role: staffRole,
          status: 'verified',
          verifiedAt: serverTimestamp() as any,
          candidateId: '',
          skipCandidateVerification: true,
          candidateFlowStatus: 'registered',
          firstClassMedicalDate: null,
          atpNumber: null,
          flightTime: applicantOnlyMerge.flightTime,
          typeRatings: '',
          employmentHistory: [],
          safetyQuestions: applicantOnlyMerge.safetyQuestions,
          submittedAt: null,
          isCertified: false,
          printedName: null,
          consentGiven: true,
          consentTimestamp: serverTimestamp() as any,
          consentVersion: '1.0',
          privacyPolicyVersion: 'March 2026',
        };
        await setDoc(userDocRef, staffProfile, { merge: true });
      } else {
        await setDoc(userDocRef, applicantOnlyMerge, { merge: true });
      }

      if (!skipCandidateVerify) {
        const idToken = await user.getIdToken();
        void syncLegacyDataForUser({ idToken }).catch(() => {});
      }

      const fullName = `${values.firstName} ${values.lastName}`.trim();
      try {
        await writeCandidateAuditLog(firestore, {
          uid: user.uid,
          action: 'candidate_registered',
          candidateName: fullName,
          candidateEmail: user.email,
          candidateId: skipCandidateVerify ? '' : values.candidateId.trim().toUpperCase(),
        });
      } catch (e) {
        console.error('candidate_registered audit:', e);
      }
      const idToken = await user.getIdToken();
      const sessionResult = await createSessionCookie(idToken);
      if (!sessionResult.success) {
        toast({
          variant: 'destructive',
          title: 'Session could not start',
          description: 'Your account was created, but the portal session failed. Please sign in from the login page.',
        });
        setLoading(false);
        return;
      }

      await new Promise<void>((resolve) => {
        queueMicrotask(() => resolve());
      });

      toast({
        title: 'Account Created!',
        description: staffRole ? 'Welcome — opening the admin portal.' : "You've been successfully signed up.",
      });

      if (staffRole) {
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

  const labelClassName = 'auth-field-label';
  const inputStyle =
    'auth-inset-field h-[73px] rounded-2xl border-0 bg-white px-8 text-[20px] font-medium text-[#333333] shadow-none focus-visible:ring-2 focus-visible:ring-[#4D148C]/15 focus-visible:ring-offset-0';

  return (
    <Form {...form}>
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="max-h-[min(90vh,820px)] w-[min(42rem,calc(100vw-1.5rem))] max-w-none flex flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="shrink-0 space-y-1 border-b border-[#E3E3E3] px-6 pb-4 pt-6 pr-14 text-left">
            <DialogTitle className="text-xl font-bold text-[#333333]">Privacy Policy</DialogTitle>
            <DialogDescription className="text-[13px] text-[#565656]">
              FedEx Pilot History Update Portal — review before you agree.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[min(58vh,540px)] px-6 py-4">
            <PrivacyPolicyArticle showBranding={false} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClassName}>First Name</FormLabel>
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
                <FormLabel className={labelClassName}>Last Name</FormLabel>
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
              <FormLabel className={labelClassName}>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className={inputStyle}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              {isAdminEmail ? (
                <div
                  className="mt-2 text-[12px] font-medium leading-snug text-[#008A00]"
                  style={{
                    background: 'rgba(0,138,0,0.06)',
                    border: '1px solid rgba(0,138,0,0.2)',
                    borderRadius: 8,
                    padding: '10px 14px',
                  }}
                >
                  ✓ HR Staff account detected — no Legacy ID required. You will be directed to the admin portal
                  after registration.
                </div>
              ) : null}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Password</FormLabel>
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
              <FormLabel className={labelClassName}>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" className={inputStyle} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isAdminEmail ? (
          <FormField
            control={form.control}
            name="candidateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClassName}>Legacy ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 12345678" className={inputStyle} autoComplete="off" {...field} />
                </FormControl>
                <FormDescription className="text-[13px] text-[#8E8E8E]">
                  Enter your unique Legacy ID.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
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
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(true)}
                className="inline p-0 align-baseline text-[#4D148C] font-semibold underline decoration-[#4D148C] hover:text-[#3d1070] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D148C]"
              >
                Privacy Policy
              </button>{' '}
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
              I consent to fdxonboard.com to collect and process my pilot data for employment evaluation purposes.
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
              ? 'group fedex-btn-primary !mt-6 h-[73px] w-full text-[21px] font-bold'
              : '!mt-6 h-[73px] w-full cursor-not-allowed rounded-xl !bg-[#E3E3E3] text-[21px] font-bold !text-[#8E8E8E] !shadow-none transition-all'
          }
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : bothConsented ? (
            <>
              <span>Create Account</span>
              <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            <span>Create Account</span>
          )}
        </Button>
      </form>
    </Form>
  );
}
