'use client';

import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';
import {
  canBookIndoctrinationSession,
  hasIndoctrinationBooking,
} from '@/lib/scheduling-eligibility';
import type { ApplicantData } from '@/lib/types';
import {
  GraduationCap,
  CalendarDays,
  MapPin,
  Briefcase,
  LifeBuoy,
  ArrowRight,
} from 'lucide-react';

type CandidatePipelineDoc = {
  flowStatus?: string | null;
  indoctrinationSessionId?: string | null;
  indoctrinationBookedAt?: unknown;
};

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E3E3E3]/80 bg-white/90 p-6 shadow-[0_4px_24px_rgba(77,20,140,0.06)] md:p-8">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eedcff]">
          <Icon className="h-5 w-5 text-[#4D148C]" />
        </div>
        <h2 className="mt-1 text-[20px] font-bold text-[#333333]">{title}</h2>
      </div>
      <div className="text-[14px] leading-relaxed text-[#565656]">{children}</div>
    </section>
  );
}

function PendingBadge({ label }: { label: string }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-[#FFD1AE] bg-[#FFF3E8] px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-[#C55200]">
      {label}
    </span>
  );
}

export default function DashboardIndoctrinationPage() {
  const { user, loading } = useUser();
  const firestore = useFirestore();

  const userDocRef = user && firestore ? doc(firestore, 'users', user.uid) : undefined;
  const { data: applicantData } = useDoc<ApplicantData>(userDocRef);

  const candidateIdKey = applicantData?.candidateId?.trim() || '';
  const candidatePipelineRef =
    firestore && candidateIdKey ? doc(firestore, 'candidateIds', candidateIdKey) : undefined;
  const { data: candidatePipeline } = useDoc<CandidatePipelineDoc>(candidatePipelineRef);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#4D148C] border-t-transparent" />
      </div>
    );
  }

  const flowForScheduling =
    candidatePipeline?.flowStatus ?? applicantData?.candidateFlowStatus ?? null;
  const alreadyBooked = hasIndoctrinationBooking(candidatePipeline ?? undefined);
  const canBook =
    !!candidateIdKey && canBookIndoctrinationSession(flowForScheduling) && !alreadyBooked;
  const schedulingParam = candidateIdKey
    ? `?candidateId=${encodeURIComponent(candidateIdKey)}`
    : '';

  return (
    <div
      className="min-h-screen pb-16"
      style={{
        background: 'linear-gradient(160deg, #f5f0ff 0%, #fafafa 40%, #fff8f4 100%)',
      }}
    >
      <InteriorNavbar />

      <div className="mx-auto max-w-[820px] px-4 py-8 sm:py-10">
        <div className="mb-8 text-center md:text-left">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E3E3E3] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#565656]">
            <GraduationCap className="h-3.5 w-3.5 text-[#4D148C]" />
            Indoctrination
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#333333] md:text-[32px]">
            FedEx Pilot Indoctrination — July 2026 Class
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#565656]">
            Welcome to the final step before your first day as a FedEx Express pilot. This page is
            your single source of truth for the July 2026 indoctrination class — dates, location,
            what to bring, and how to prepare. Details are still being finalized and this page will
            update as information is confirmed.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard icon={CalendarDays} title="Class dates">
            <p>
              <span className="font-semibold text-[#333333]">July 2026.</span>{' '}
              Exact dates and daily schedule are being finalized and will be published here as soon
              as they are confirmed.
              <PendingBadge label="TBD" />
            </p>
          </SectionCard>

          <SectionCard icon={MapPin} title="Location">
            <p>
              <span className="font-semibold text-[#333333]">Memphis, TN.</span>{' '}
              FedEx Express headquarters campus — 3610 Hacks Cross Rd, Memphis, TN 38125. Specific
              building, room, and parking details will be published here before the class begins.
              <PendingBadge label="Details forthcoming" />
            </p>
          </SectionCard>

          <SectionCard icon={Briefcase} title="What to bring">
            <p className="mb-3">
              The list below is preliminary. Any updates will be pushed here and emailed to you
              before the class.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Government-issued photo identification (passport preferred)</li>
              <li>Original pilot certificates and current medical</li>
              <li>Logbooks covering your most recent 12 months of flight time</li>
              <li>Any outstanding onboarding paperwork previously requested</li>
              <li>Business casual attire; more specific guidance will follow</li>
            </ul>
            <p className="mt-3 text-[13px] text-[#8E8E8E]">
              <PendingBadge label="Final list TBD" /> Check this page before you travel.
            </p>
          </SectionCard>

          <SectionCard icon={GraduationCap} title="Pre-class preparation">
            <p>
              A pre-reading packet and any required study materials will be posted to this page and
              referenced in a follow-up email. Plan for meaningful preparation time before class
              begins; treat it like you would any type rating ground school.
            </p>
          </SectionCard>

          <SectionCard icon={LifeBuoy} title="Frequently asked">
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-[#333333]">When will I receive my final schedule?</dt>
                <dd>We will publish the daily schedule here and email a copy at least two weeks before class starts.</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#333333]">What should I wear on day one?</dt>
                <dd>Business casual. Formal uniform fitting and dress code specifics are covered in week one.</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#333333]">Is lodging provided?</dt>
                <dd>Details on travel, lodging, and per diem will be posted here and confirmed by your recruiter.</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#333333]">Who do I contact with questions?</dt>
                <dd>
                  Use the{' '}
                  <Link className="font-semibold text-[#4D148C] underline" href="/dashboard/help">
                    Help page
                  </Link>{' '}
                  to open a support ticket — we will route it to your recruiter.
                </dd>
              </div>
            </dl>
          </SectionCard>

          <section className="rounded-2xl border border-[#4D148C]/15 bg-gradient-to-br from-[#4D148C] via-[#7D22C3] to-[#FF6200] p-6 text-white shadow-[0_8px_32px_rgba(77,20,140,0.18)] md:p-8">
            {alreadyBooked ? (
              <>
                <h2 className="text-[22px] font-bold">Your class date is booked.</h2>
                <p className="mt-2 text-[14px] opacity-90">
                  We&apos;ll post the remaining logistics — final schedule, travel guidance, and
                  prep materials — on this page as they&apos;re finalized.
                </p>
              </>
            ) : canBook ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[22px] font-bold">Choose your class date</h2>
                  <p className="mt-2 text-[14px] opacity-90">
                    Your slot is ready to book. Pick the session that fits your calendar.
                  </p>
                </div>
                <Link
                  href={`/schedule/indoctrination${schedulingParam}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-[#4D148C] transition-transform hover:-translate-y-0.5"
                >
                  Choose Your Class Date
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-[22px] font-bold">Your class date will be assigned.</h2>
                <p className="mt-2 text-[14px] opacity-90">
                  Sit tight — if your cohort is scheduled automatically we&apos;ll email you with
                  your assigned date. If booking opens for you, the button to choose a date will
                  appear right here.
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
