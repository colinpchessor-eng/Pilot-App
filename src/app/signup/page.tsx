import type { Metadata } from 'next';
import { SignupForm } from '@/components/signup-form';
import Link from 'next/link';
import {
  AuthMarketingSplit,
  AuthTransactionalFooter,
} from '@/components/auth/auth-marketing-split';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';

export const metadata: Metadata = {
  title: 'Pilot Portal — FlyFDX.com',
  description: 'Flight Operations. Connect Your Legacy to Begin Your Journey.',
};

export default function SignupPage() {
  return (
    <AuthMarketingSplit
      variant="signup"
      heroDescription="Join the world's largest express transportation company. Your journey to the cockpit begins here."
    >
      <div className="mb-10 flex justify-center lg:hidden">
        <FedExBrandMark height={44} />
      </div>

      <div className="auth-glass-panel rounded-3xl border border-white/50 p-10 shadow-[0_25px_60px_-15px_rgba(77,20,140,0.12)] md:p-12">
        <div className="mb-8 text-center lg:mb-10 lg:text-left">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-[#042048] sm:text-4xl">
            Create Account
          </h2>
          <p className="mt-2 text-[15px] font-medium text-[#565656]">
            Enter your details to start your application
          </p>
        </div>

        <SignupForm />

        <p className="mt-10 border-t border-[#E3E3E3]/80 pt-8 text-center text-sm font-medium text-[#565656]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="ml-1 font-extrabold text-[#4D148C] transition-colors hover:text-[#FF6200]"
          >
            Sign In
          </Link>
        </p>
      </div>

      <AuthTransactionalFooter />
    </AuthMarketingSplit>
  );
}
