'use client';

import { Navbar } from '@/components/marketing/navbar';
import { NetworkMapSection } from '@/components/marketing/network-map-section';
import { CountUp } from '@/components/marketing/count-up';
import { useSectionReveal } from '@/hooks/useSectionReveal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GlobalBackgroundCanvas } from '@/components/global-background-canvas';
import { useEffect } from 'react';

export function LandingPage() {
  const pathwaysRef = useSectionReveal<HTMLElement>();
  const faqRef = useSectionReveal<HTMLElement>();

  useEffect(() => {
    // Add dark theme class and set background color on mount
    document.body.classList.add('dark');
    document.body.style.backgroundColor = '#0a0819';
    document.body.style.overflowX = 'hidden';

    return () => {
      // Revert to light background on unmount
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#FAFAFA';
      document.body.style.overflowX = 'auto';
    };
  }, []);

  return (
    <main className="relative min-h-screen w-full">
      {/* Localized Background and Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <GlobalBackgroundCanvas />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(10,8,25,0.45)] via-[rgba(10,8,25,0.55)] to-[rgba(10,8,25,0.95)]" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Hero */}
        <section className="relative z-[2] w-full min-h-[100vh] bg-transparent flex items-center pt-[72px]">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 md:py-24 md:grid-cols-2 min-h-[100vh] items-center">
            <div className="space-y-6">
              <h1 className="hero-h1 text-4xl md:text-6xl font-bold uppercase tracking-tight text-white text-hero-shadow">
                CHART YOUR COURSE. <br />
                BECOME A FEDEX PILOT.
              </h1>
              <p className="text-[var(--color-text-secondary)] text-lg text-hero-shadow">
                A secure portal for returning applicants to continue their pilot
                application.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="uppercase tracking-wide font-bold" size="lg">
                  <Link href="/signup">Begin Pilot Application</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="uppercase tracking-wide"
                >
                  <Link href="/login">Talk to a human</Link>
                </Button>
              </div>
            </div>

            <div className="hidden md:block">
              <div
                className="p-6"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderTop: '1px solid rgba(255,255,255,0.25)',
                  boxShadow:
                    '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                  borderRadius: 16,
                }}
              >
                <div className="text-sm uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Pilot Pathway
                </div>
                <div className="mt-3 text-2xl font-bold text-white text-hero-shadow">
                  FedExFlow Portal
                </div>
                <div className="mt-2 text-[var(--color-text-secondary)]">
                  Secure, token-verified access for applicant continuity.
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div
                    className="p-3"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderRadius: 12,
                    }}
                  >
                    <div className="text-xl font-bold text-[var(--color-accent-orange)]">
                      24/7
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      Access
                    </div>
                  </div>
                  <div
                    className="p-3"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderRadius: 12,
                    }}
                  >
                    <div className="text-xl font-bold text-[var(--color-accent-orange)]">
                      2-Step
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      Verification
                    </div>
                  </div>
                  <div
                    className="p-3"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderRadius: 12,
                    }}
                  >
                    <div className="text-xl font-bold text-[var(--color-accent-orange)]">
                      Secure
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      Firestore
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pathways */}
        <section
          id="pathways"
          className="w-full py-16 md:py-24"
          style={{ background: 'rgba(15, 10, 35, 0.75)', backdropFilter: 'blur(2px)' }}
          ref={pathwaysRef}
        >
          <div className="container mx-auto max-w-6xl px-4">
            <div className="glass-card p-8 md:p-10 section-reveal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-56 rounded-md border bg-[var(--color-bg-tertiary)]" />
                <div className="space-y-4">
                  <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider">
                    Pathways
                  </h2>
                  <p className="text-muted-foreground">
                    Explore the routes that can lead to a FedEx cockpit.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="rounded-md border bg-[var(--color-bg-tertiary)] p-4">
                      <div className="font-bold">College Choices</div>
                      <div className="text-xs text-muted-foreground">
                        Programs &amp; prep
                      </div>
                    </div>
                    <div className="rounded-md border bg-[var(--color-bg-tertiary)] p-4">
                      <div className="font-bold">Fleet &amp; Routes</div>
                      <div className="text-xs text-muted-foreground">
                        Aircraft &amp; networks
                      </div>
                    </div>
                    <div className="rounded-md border bg-[var(--color-bg-tertiary)] p-4">
                      <div className="font-bold">Pre-hire</div>
                      <div className="text-xs text-muted-foreground">
                        Appointments
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Network Map */}
        <div id="network">
          <NetworkMapSection />
        </div>

        {/* Stats Strip */}
        <section
          className="w-full border-y border-white/10"
          style={{
            background:
              'linear-gradient(135deg, rgba(77,20,140,0.85) 0%, rgba(107,33,232,0.85) 100%)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="container mx-auto max-w-6xl px-4 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="glass-card p-4 stat-3d">
                <div className="text-3xl font-bold text-[var(--color-accent-orange)]">
                  <CountUp value={300} />
                </div>
                <div className="text-sm text-white/95">Destinations</div>
              </div>
              <div className="glass-card p-4 stat-3d">
                <div className="text-3xl font-bold text-[var(--color-accent-orange)]">
                  <CountUp value={650} />
                </div>
                <div className="text-sm text-white/95">Aircraft</div>
              </div>
              <div className="glass-card p-4 stat-3d">
                <div className="text-3xl font-bold text-[var(--color-accent-orange)]">
                  <CountUp value={10000} />
                </div>
                <div className="text-sm text-white/95">Team members</div>
              </div>
              <div className="glass-card p-4 stat-3d">
                <div className="text-3xl font-bold text-[var(--color-accent-orange)]">
                  <CountUp value={1} suffix="" />
                </div>
                <div className="text-sm text-white/95">Secure portal</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="w-full py-16 md:py-24"
          style={{ background: 'rgba(10, 8, 25, 0.80)' }}
          ref={faqRef}
        >
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wider">
              FAQ
            </h2>
            <div className="mt-6 glass-card section-reveal">
              <Accordion type="single" collapsible>
                {[
                  {
                    q: 'Why do I need a token?',
                    a: 'It confirms you are the returning applicant before unlocking your application.',
                  },
                  {
                    q: 'Where do I get the token?',
                    a: 'After you request access, an admin verifies you and emails your token.',
                  },
                  {
                    q: 'What if my token fails?',
                    a: 'Double-check the email address you used to sign in matches the applicant record, then request a new token if needed.',
                  },
                ].map((item, idx) => (
                  <AccordionItem
                    key={item.q}
                    value={`item-${idx}`}
                    className="border-b border-white/10 px-2"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <span className="text-left">{item.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="w-full py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="relative overflow-hidden rounded-xl border border-white/10 p-10 text-center"
              style={{ background: 'rgba(10, 8, 25, 0.90)' }}
            >
              <div className="relative space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-white text-hero-shadow">
                  OPEN OPPORTUNITIES. <br />
                  FIND YOUR FUTURE.
                </h2>
                <Button asChild size="lg" className="uppercase tracking-wide font-bold">
                  <Link href="/signup">Begin Application</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="w-full border-t border-white/10"
          style={{ background: 'rgba(5, 4, 15, 0.95)' }}
        >
          <div className="container mx-auto max-w-6xl px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            {['Pathways', 'Guest Move', 'Services', 'Locale'].map((h) => (
              <div key={h}>
                <div className="font-bold">{h}</div>
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  <li>
                    <a className="hover:text-foreground" href="#">
                      Link one
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-foreground" href="#">
                      Link two
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-foreground" href="#">
                      Link three
                    </a>
                  </li>
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 py-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} FedEx. All rights reserved.{' '}
            <span className="text-muted-foreground">|</span>{' '}
            <Link href="/privacy" className="text-[#4D148C] text-[13px] hover:underline">Privacy Policy</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
