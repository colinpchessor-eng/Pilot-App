import Link from 'next/link';
import { Mail, LifeBuoy, ArrowRight } from 'lucide-react';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';
import { SUPPORT_EMAIL } from '@/lib/support-contact';

export const metadata = {
  title: 'Help — FedEx Pilot Portal',
  description: 'Get help with your FedEx Pilot History Update invitation.',
};

export default function PublicHelpPage() {
  return (
    <div
      className="min-h-screen pb-16"
      style={{
        background: 'linear-gradient(160deg, #f5f0ff 0%, #fafafa 40%, #fff8f4 100%)',
      }}
    >
      <header className="px-6 py-6 sm:px-10 sm:py-8">
        <Link href="/" className="inline-flex items-center">
          <FedExBrandMark height={36} />
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-4 sm:px-6">
        <div className="mb-10 text-center md:text-left">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E3E3E3] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#565656]">
            <LifeBuoy className="h-3.5 w-3.5 text-[#4D148C]" />
            Help
          </div>
          <h1 className="text-[30px] font-bold tracking-tight text-[#333333] md:text-[36px]">
            Need a hand with your pilot history update?
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#565656]">
            The FedEx Pilot History Update Portal is where you review your legacy flight data and
            submit your updated information to our recruiting team. If something is unclear or you
            can&apos;t get past a step, we&apos;re here to help.
          </p>
        </div>

        <section className="rounded-2xl border border-[#E3E3E3]/80 bg-white/90 p-6 shadow-[0_4px_24px_rgba(77,20,140,0.06)] md:p-8">
          <h2 className="text-[18px] font-bold text-[#333333]">I received an invitation email</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#565656]">
            Your invitation email contains a unique Candidate ID. Use it when you register on the
            portal — it&apos;s how we link your new account to your existing profile. Register using
            the same email address the invitation was sent to.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4D148C] px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#7D22C3]"
            >
              Register for an Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E3E3E3] bg-white px-5 py-3 text-[14px] font-bold text-[#333333] transition-colors hover:border-[#4D148C]"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#E3E3E3]/80 bg-white/90 p-6 shadow-[0_4px_24px_rgba(77,20,140,0.06)] md:p-8">
          <h2 className="text-[18px] font-bold text-[#333333]">Contact us directly</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#565656]">
            Stuck on something the portal can&apos;t solve? Reach the pilot portal administrators
            directly — we usually respond within one business day.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-5 inline-flex items-center gap-3 rounded-xl border border-[#E3E3E3] bg-[#fafafa] px-4 py-3 transition-colors hover:border-[#4D148C]/40"
          >
            <Mail className="h-5 w-5 shrink-0 text-[#4D148C]" />
            <div className="text-left">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E8E]">
                Email
              </div>
              <div className="text-[15px] font-semibold text-[#333333]">{SUPPORT_EMAIL}</div>
            </div>
          </a>
        </section>

        <section className="mt-6 rounded-2xl border border-[#4D148C]/15 bg-[#F7F1FF] p-6 md:p-8">
          <h2 className="text-[16px] font-bold text-[#333333]">Already registered?</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#565656]">
            Sign in and visit the{' '}
            <Link className="font-semibold text-[#4D148C] underline" href="/dashboard/help">
              in-portal Help page
            </Link>{' '}
            to submit privacy requests, unlock a submitted application, or reach your recruiter.
          </p>
        </section>
      </main>
    </div>
  );
}
