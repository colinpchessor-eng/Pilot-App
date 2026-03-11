import { Icons } from '@/components/icons';
import { SignupForm } from '@/components/signup-form';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bento-grid-bg p-4 md:p-8">
      <div className="w-full max-w-lg">
        <div className="bg-card border border-border rounded-lg shadow-2xl p-6 md:p-8">
          <div className="text-center">
            <Icons.logo className="h-12 w-auto mx-auto" />
            <h1 className="pt-4 text-3xl font-bold">Create an Account</h1>
            <p className="pt-2 text-muted-foreground">
              Enter your details below to get started.
            </p>
          </div>
          <div className="mt-8">
            <SignupForm />
          </div>
          <p className="mt-8 w-full text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/"
              className="font-semibold text-accent hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
