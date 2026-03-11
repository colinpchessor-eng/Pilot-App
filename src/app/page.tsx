import { Icons } from '@/components/icons';
import { LoginForm } from '@/components/login-form';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bento-grid-bg p-4 md:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 flex flex-col justify-center items-center md:items-start text-center md:text-left p-8">
          <Icons.logo className="h-16 w-auto" />
          <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight">
            Welcome to FedexFlow
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            The future of pilot applications. Streamlined, simple, and secure.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-center">Applicant Sign In</h2>
          <p className="text-center text-muted-foreground mt-2 text-sm">
            Access your application portal.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
          <p className="mt-6 w-full text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-accent hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
