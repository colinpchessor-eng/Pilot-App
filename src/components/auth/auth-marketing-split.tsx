import type { ReactNode } from 'react';
import Link from 'next/link';
import { AuthHeroBackground } from '@/components/auth/auth-hero-background';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';

export type AuthMarketingVariant = 'login' | 'signup';

type AuthMarketingSplitProps = {
  variant: AuthMarketingVariant;
  heroDescription: string;
  children: ReactNode;
};

function ProgressMarkers({ variant }: { variant: AuthMarketingVariant }) {
  const segments =
    variant === 'login'
      ? [
          { type: 'bar' as const, active: true },
          { type: 'dot' as const, active: false },
          { type: 'dot' as const, active: false },
        ]
      : [
          { type: 'dot' as const, active: false },
          { type: 'bar' as const, active: true },
          { type: 'dot' as const, active: false },
        ];

  return (
    <div className="flex items-center gap-4">
      {segments.map((seg, i) =>
        seg.type === 'bar' ? (
          <div
            key={i}
            className={
              seg.active ? 'h-0.5 w-12 rounded-full bg-[#FF6200]' : 'h-0.5 w-6 rounded-full bg-white/25'
            }
          />
        ) : (
          <div
            key={i}
            className={
              seg.active
                ? 'h-2 w-2 rounded-full bg-[#FF6200]'
                : 'h-2 w-2 rounded-full bg-white/20'
            }
          />
        )
      )}
    </div>
  );
}

export function AuthMarketingSplit({ variant, heroDescription, children }: AuthMarketingSplitProps) {
  return (
    <>
      <main className="relative z-[1] flex min-h-screen w-full bg-[#FAFAFA]">
        {/* Left: hero — desktop only; right form unchanged */}
        <section className="relative hidden min-h-screen w-full flex-col overflow-hidden lg:flex lg:w-[58.333333%]">
          <div className="absolute inset-0">
            <AuthHeroBackground />
            {/* Light scrim (~20%) — keep scene bright */}
            <div className="absolute inset-0 bg-black/20" aria-hidden />
            {/* Subtle bottom fade for legibility (~15% max at bottom edge) */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/15 via-transparent to-transparent"
              aria-hidden
            />
          </div>

          <div className="relative z-10 flex min-h-screen flex-1 flex-col">
            <div className="shrink-0 px-12 pt-12 xl:px-16 xl:pt-16">
              <div className="inline-flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-[#FF6200]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                  Flight Operations
                </span>
              </div>
              <h1 className="mt-4 max-w-[95%] font-headline text-[48px] font-black uppercase leading-[0.95] tracking-tight text-white">
                Connect Your Legacy
                <br />
                to Begin Your Journey.
              </h1>
            </div>

            <div className="min-h-4 flex-1" aria-hidden />

            <div className="flex shrink-0 items-end justify-between px-12 pb-12 xl:px-16">
              <ProgressMarkers variant={variant} />
              <div className="flex flex-col items-end text-right">
                <FedExBrandMark height={32} />
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">
                  Flight Operations
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex w-full flex-1 items-center justify-center overflow-y-auto bg-[#f9f9fe] p-8 md:p-12 lg:w-5/12 lg:p-16">
          <div
            className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#E8DDFF]/40 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#FFE8DB]/35 blur-3xl"
            aria-hidden
          />

          <div className="relative z-10 w-full max-w-md">{children}</div>
        </section>
      </main>

      <div
        className="pointer-events-none fixed left-1/2 top-1/2 z-0 h-[min(819px,90vh)] w-[80vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4D148C]/[0.06] blur-[120px]"
        aria-hidden
      />
    </>
  );
}

export function AuthTransactionalFooter() {
  return (
    <div className="mt-12 flex flex-wrap justify-center gap-6 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8E8E8E]">
      <Link href="/privacy" className="transition-colors hover:text-[#4D148C]">
        Privacy Policy
      </Link>
      <a href="#" className="transition-colors hover:text-[#4D148C]">
        Terms of Use
      </a>
      <a href="#" className="transition-colors hover:text-[#4D148C]">
        Support Center
      </a>
    </div>
  );
}
