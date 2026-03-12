import { Icons } from '@/components/icons';
import { SignupForm } from '@/components/signup-form';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="frosted-glass rounded-xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <Icons.logo className="mx-auto h-12 w-auto" />
            <h1 className="pt-4 text-3xl font-bold uppercase tracking-wider">
              Create an Account
            </h1>
            <p className="pt-2 text-muted-foreground">
              Enter your details below to get started.
            </p>
          </div>
          <SignupForm />
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
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/30 p-2 text-center text-xs text-muted-foreground">
        System Status: <span className="text-green-400">Online</span>
      </footer>
    </main>
  );
}
