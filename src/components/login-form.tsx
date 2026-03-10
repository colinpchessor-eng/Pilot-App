'use client';

import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { login, type LoginFormState } from '@/app/actions';
import { loginSchema, type LoginSchema } from '@/lib/schemas';
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
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, LogIn } from 'lucide-react';
import { useEffect, useActionState } from 'react';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        'Authenticating...'
      ) : (
        <>
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </>
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginFormState, FormData>(login, {
    message: '',
  });

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      recordLocator: '',
      atpNumber: '',
    },
  });

  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Form {...form}>
      <form
        action={formAction}
        onSubmit={form.handleSubmit(() => formAction(new FormData(form.control._formValues)))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="recordLocator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Record Locator</FormLabel>
              <FormControl>
                <Input placeholder="e.g. ABCDEF" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="atpNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ATP Number</FormLabel>
              <FormControl>
                <Input type="password" placeholder="e.g. 12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {state.message && (
          <Alert variant="destructive" className="hidden">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <SubmitButton />
      </form>
    </Form>
  );
}
