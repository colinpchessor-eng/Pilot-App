import type { Metadata } from 'next';
import { LoginForm } from '@/components/login-form';
import Link from 'next/link';
import {
  AuthMarketingSplit,
  AuthTransactionalFooter,
} from '@/components/auth/auth-marketing-split';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';

export const metadata: Metadata = {
  title: 'Pilot Portal — fdxonboard.com',
  description: 'Flight Operations. Connect Your Legacy to Begin Your Journey.',
};

export default function LoginPage() {
  return (
    <AuthMarketingSplit
      variant="login"
      heroDescription="Connect Your Legacy to Begin Your Journey."
    >
      <div className="mb-10 flex justify-center lg:hidden">
        <FedExBrandMark height={44} />
      </div>

      <div className="auth-glass-panel rounded-3xl border border-white/50 p-10 shadow-[0_25px_60px_-15px_rgba(77,20,140,0.12)] md:p-12">
        <div className="mb-8 text-center lg:mb-10 lg:text-left">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-[#042048] sm:text-4xl">
            Welcome Back
          </h2>
          <p className="mt-2 text-[15px] font-medium text-[#565656]">
            Access your flight deck dashboard.
          </p>
        </div>

        <LoginForm />

        <p className="mt-4 text-center text-[12px] text-[#8E8E8E]">
          HR Staff — use your FedEx email to sign in. No Candidate ID required.
        </p>

        <p className="mt-10 text-center text-sm font-medium text-[#565656]">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="ml-1 font-extrabold text-[#4D148C] transition-colors hover:text-[#FF6200]"
          >
            Register Now
          </Link>
        </p>
      </div>

      <AuthTransactionalFooter />
    </AuthMarketingSplit>
  );
}
