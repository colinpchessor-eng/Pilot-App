'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
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
import { Loader2, LogIn } from 'lucide-react';
import { triggerWelcomeEmail } from '@/app/actions';

export function SignupForm() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: SignupSchema) {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      const userProfile = {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        createdAt: serverTimestamp(),
        flightTime: { total: 0, multiCrew: 0, pic: 0 },
        typeRatings: [],
        safetyQuestions: {
          incidents: null,
          accidents: null,
          faaAction: null,
        },
        resumeFileName: null,
        submittedAt: null,
        trainingCommitment: false,
      };

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, userProfile);

      // We can await this now as well to ensure it completes.
      await triggerWelcomeEmail(user.email!, user.displayName);

      toast({
        title: 'Account Created!',
        description: "You've been successfully signed up.",
      });
      router.push('/dashboard');
    } catch (error) {
      const authError = error as AuthError;
      let description = 'An unexpected error occurred. Please try again.';

      if (authError.code === 'auth/email-already-in-use') {
        description = 'This email is already registered.';
      } else if (authError.message) {
        description = authError.message;
      } else if (error instanceof Error) {
        description = error.message;
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
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
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          Sign Up
        </Button>
      </form>
    </Form>
  );
}
