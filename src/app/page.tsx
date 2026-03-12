import { Icons } from '@/components/icons';
import { LoginForm } from '@/components/login-form';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="frosted-glass rounded-xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <Icons.logo className="mx-auto h-16 w-auto" />
            <h1 className="mt-6 text-3xl font-bold uppercase tracking-wider text-shadow">
              Applicant Portal
            </h1>
          </div>
          <LoginForm />
          <p className="mt-8 w-full text-center text-sm text-muted-foreground">
            First time applying?{' '}
            <Link
              href="/signup"
              className="font-semibold text-accent hover:underline"
            >
              Create an Account
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
