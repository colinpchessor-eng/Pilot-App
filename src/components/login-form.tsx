'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type AuthError,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { loginSchema, type LoginSchema } from '@/lib/schemas';
import { useAuth, useFirestore } from '@/firebase';
import { createSessionCookie } from '@/app/auth/actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      keepSignedIn: false,
    },
  });

  async function onSubmit(values: LoginSchema) {
    setLoading(true);
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Firebase not initialized. Please try again later.',
      });
      setLoading(false);
      return;
    }
    try {
      await setPersistence(
        auth,
        values.keepSignedIn
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // Check for admin status
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      const userData = userDocSnap.exists() ? userDocSnap.data() : null;
      const goAdmin =
        !!userData &&
        (userData.role === 'admin' ||
          userData.role === 'dev' ||
          userData.isAdmin === true ||
          userData.skipCandidateVerification === true);

      // Set HTTP-only session cookie before navigating — middleware requires it for
      // /dashboard and /admin; without this, the first navigation bounces to /login.
      const idToken = await user.getIdToken();
      const sessionResult = await createSessionCookie(idToken);
      if (!sessionResult.success) {
        toast({
          variant: 'destructive',
          title: 'Session could not start',
          description: 'You are signed in, but the portal session failed. Please try signing in again.',
        });
        setLoading(false);
        return;
      }

      // Let onAuthStateChanged flush into React (useUser) before navigating; avoids
      // AuthGate seeing a stale `!user` on the next route. Skip router.refresh() here
      // — it tended to race with the cookie + client auth state.
      await new Promise<void>((resolve) => {
        queueMicrotask(() => resolve());
      });

      if (goAdmin) {
        toast({
          title: 'Admin Sign In',
          description: 'Welcome, Admin.',
        });
        router.push('/admin');
      } else {
        toast({
          title: 'Signed In!',
          description: 'Welcome back.',
        });
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid Email or password. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  const openForgotPassword = () => {
    const current = (form.getValues('email') || '').trim();
    setForgotEmail(current);
    setForgotOpen(true);
  };

  const handleSendReset = async () => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Password reset failed',
        description: 'Firebase not initialized. Please try again later.',
      });
      return;
    }

    const email = forgotEmail.trim();
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Enter the email address you used to sign in.',
      });
      return;
    }

    setForgotSending(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Reset link sent',
        description: 'If an account exists for that email, a reset link will arrive shortly.',
      });
      setForgotOpen(false);
    } catch {
      // Keep messaging generic to avoid account enumeration.
      toast({
        title: 'Check your email',
        description: 'If an account exists for that email, a reset link will arrive shortly.',
      });
    } finally {
      setForgotSending(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="auth-field-label">Email Address</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@fedex.com"
                    autoComplete="email"
                    className="auth-inset-field h-14 rounded-2xl border-0 bg-white pl-6 pr-12 text-[15px] font-medium text-[#333333] shadow-none focus-visible:ring-2 focus-visible:ring-[#4D148C]/15 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
                <Mail
                  className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B8B8C8]"
                  aria-hidden
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="mb-2 flex items-end justify-between gap-3">
                <FormLabel className="auth-field-label !mb-0">Password</FormLabel>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="shrink-0 cursor-pointer text-[11px] font-bold text-[#4D148C] transition-colors hover:text-[#FF6200]"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="auth-inset-field h-14 rounded-2xl border-0 bg-white pl-6 pr-12 text-[15px] font-medium text-[#333333] shadow-none focus-visible:ring-2 focus-visible:ring-[#4D148C]/15 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
                <Lock
                  className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B8B8C8]"
                  aria-hidden
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keepSignedIn"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 space-y-0 py-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className="shrink-0 cursor-pointer rounded border-[#E3E3E3] text-[#4D148C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D148C]"
                  style={{ width: 18, height: 18, minWidth: 18, accentColor: '#4D148C' }}
                />
              </FormControl>
              <FormLabel className="!mt-0 cursor-pointer text-[13px] font-medium leading-normal text-[#565656]">
                Remember me
              </FormLabel>
            </FormItem>
          )}
        />

        <div className="pt-2">
          <Button
            type="submit"
            className="group fedex-btn-primary h-14 w-full text-base font-bold"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </div>
        </form>
      </Form>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#333333]">Reset your password</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-[13px] text-[#8E8E8E]">
              Enter the email address you use to sign in and we&apos;ll send a reset link.
            </p>
            <div className="space-y-1.5">
              <label className="auth-field-label">Email</label>
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@fedex.com"
                className="h-12 rounded-2xl border border-[#E3E3E3] bg-white px-4 text-[15px] font-medium text-[#333333]"
                autoComplete="email"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setForgotOpen(false)}
              disabled={forgotSending}
              className="border-[#E3E3E3] text-[#565656]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendReset}
              disabled={forgotSending}
              className="fedex-btn-primary-sm !px-4 !py-2 disabled:opacity-40"
            >
              {forgotSending ? 'Sending…' : 'Send reset link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
