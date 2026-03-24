'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type AuthError,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { loginSchema, type LoginSchema } from '@/lib/schemas';
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
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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

      const profile = userDocSnap.exists() ? userDocSnap.data() : null;
      const isAdminUser =
        profile?.isAdmin === true || profile?.role === 'admin';

      if (userDocSnap.exists() && isAdminUser) {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl fedex-gradient text-base font-bold text-white shadow-[0_12px_40px_-10px_rgba(77,20,140,0.45)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
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
  );
}
