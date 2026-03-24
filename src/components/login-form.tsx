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
import { Loader2 } from 'lucide-react';
import { Checkbox } from './ui/checkbox';

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] font-semibold text-[#565656] mb-1.5 block">
                Email Address
              </FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="name@fedex.com" 
                  className="h-12 border-[1.5px] border-[#E3E3E3] rounded-lg px-4 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus-visible:ring-[#4D148C] focus-visible:ring-offset-0 focus-visible:border-[#4D148C]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-1">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] font-semibold text-[#565656] mb-1.5 block">
                  Password
                </FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="h-12 border-[1.5px] border-[#E3E3E3] rounded-lg px-4 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus-visible:ring-[#4D148C] focus-visible:ring-offset-0 focus-visible:border-[#4D148C]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <button type="button" className="text-[13px] text-[#4D148C] font-medium hover:underline cursor-pointer">
              Forgot password?
            </button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="keepSignedIn"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 space-y-0 py-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="border-[#E3E3E3] data-[state=checked]:bg-[#4D148C] data-[state=checked]:border-[#4D148C]"
                />
              </FormControl>
              <FormLabel className="text-[13px] font-medium text-[#565656] cursor-pointer">
                Remember me
              </FormLabel>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-12 fedex-gradient text-white font-bold rounded-lg shadow-[0_4px_15px_rgba(77,20,140,0.3)] transition-all hover:brightness-110 active:translate-y-0.5"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Sign In
        </Button>
      </form>
    </Form>
  );
}
