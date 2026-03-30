'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Mail, Phone, Trash2, LockOpen, LifeBuoy } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/support-contact';
import { submitLegacyDeletionRequest, submitUnlockApplicationRequest } from '@/app/dashboard/help-actions';
import { cn } from '@/lib/utils';

function RequestCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[#E3E3E3]/80 bg-white/90 p-6 shadow-[0_4px_24px_rgba(77,20,140,0.06)]',
        'md:p-8'
      )}
    >
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eedcff]">
          <Icon className="h-5 w-5 text-[#4D148C]" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold text-[#333333]">{title}</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-[#565656]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function DashboardHelpPage() {
  const { user, loading } = useUser();
  const [deletionNotes, setDeletionNotes] = useState('');
  const [caAck, setCaAck] = useState(false);
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionMsg, setDeletionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [unlockReason, setUnlockReason] = useState('');
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const onDeletionSubmit = async () => {
    if (!user) return;
    setDeletionSubmitting(true);
    setDeletionMsg(null);
    try {
      const idToken = await user.getIdToken();
      const result = await submitLegacyDeletionRequest({
        idToken,
        notes: deletionNotes,
        californiaRightsAcknowledged: caAck,
      });
      if (result.success) {
        setDeletionMsg({ type: 'ok', text: result.message });
        setDeletionNotes('');
        setCaAck(false);
      } else {
        setDeletionMsg({ type: 'err', text: result.message });
      }
    } catch {
      setDeletionMsg({ type: 'err', text: 'Something went wrong. Please try again.' });
    }
    setDeletionSubmitting(false);
  };

  const onUnlockSubmit = async () => {
    if (!user) return;
    setUnlockSubmitting(true);
    setUnlockMsg(null);
    try {
      const idToken = await user.getIdToken();
      const result = await submitUnlockApplicationRequest({ idToken, reason: unlockReason });
      if (result.success) {
        setUnlockMsg({ type: 'ok', text: result.message });
        setUnlockReason('');
      } else {
        setUnlockMsg({ type: 'err', text: result.message });
      }
    } catch {
      setUnlockMsg({ type: 'err', text: 'Something went wrong. Please try again.' });
    }
    setUnlockSubmitting(false);
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#4D148C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-16"
      style={{
        background: 'linear-gradient(160deg, #f5f0ff 0%, #fafafa 40%, #fff8f4 100%)',
      }}
    >
      <InteriorNavbar />

      <div className="mx-auto max-w-[760px] px-4 py-8 sm:py-10">
        <div className="mb-8 text-center md:text-left">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E3E3E3] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#565656]">
            <LifeBuoy className="h-3.5 w-3.5 text-[#4D148C]" />
            Help
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#333333] md:text-[32px]">
            Requests &amp; support
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#565656]">
            Submit administrative requests for your account. For general questions, use the contact information
            below.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <RequestCard
            icon={Trash2}
            title="Legacy records &amp; privacy requests"
            description="Under California law, eligible consumers may request that we delete personal information we hold in certain systems. This sends a secure request for an administrator to delete your legacy records associated with this portal. It is not an instant automated deletion."
          >
            <Tabs defaultValue="rights" className="w-full">
              <TabsList className="mb-6 grid h-auto w-full grid-cols-1 gap-2 rounded-xl bg-[#f4f3f8] p-1 sm:grid-cols-2">
                <TabsTrigger
                  value="rights"
                  className="rounded-lg py-2.5 text-[13px] font-semibold data-[state=active]:bg-white data-[state=active]:text-[#4D148C] data-[state=active]:shadow-sm"
                >
                  California privacy rights
                </TabsTrigger>
                <TabsTrigger
                  value="request"
                  className="rounded-lg py-2.5 text-[13px] font-semibold data-[state=active]:bg-white data-[state=active]:text-[#4D148C] data-[state=active]:shadow-sm"
                >
                  Request deletion
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rights" className="mt-0 space-y-4 text-[14px] leading-[1.65] text-[#565656]">
                <p>
                  If you are a California resident, the California Consumer Privacy Act (CCPA), as amended by the
                  California Privacy Rights Act (CPRA), may provide you with specific rights regarding personal
                  information. Depending on the situation, those rights can include:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-semibold text-[#333333]">Right to know</span> — You may request details
                    about the categories and specific pieces of personal information we collected, the sources,
                    and our business purposes.
                  </li>
                  <li>
                    <span className="font-semibold text-[#333333]">Right to delete</span> — You may request
                    deletion of personal information we collected, subject to legal exceptions (for example,
                    where we must retain data to meet legal obligations or complete a transaction).
                  </li>
                  <li>
                    <span className="font-semibold text-[#333333]">Right to correct</span> — You may request
                    correction of inaccurate personal information we maintain.
                  </li>
                  <li>
                    <span className="font-semibold text-[#333333]">
                      Right to limit use of sensitive personal information
                    </span>{' '}
                    — Where applicable, you may limit certain uses of sensitive personal information.
                  </li>
                  <li>
                    <span className="font-semibold text-[#333333]">Non-discrimination</span> — We will not deny
                    services, charge different prices, or retaliate because you exercised these rights.
                  </li>
                </ul>
                <p>
                  We may need to verify your identity before fulfilling a request. We will respond within 45
                  calendar days when possible (with one 45-day extension when reasonably necessary, and
                  notice if that applies). You may designate an authorized agent under applicable law; we may
                  require proof of the agency relationship.
                </p>
                <p>
                  This page helps you start a <strong className="text-[#333333]">deletion request</strong> for
                  legacy records in this portal. For the full privacy policy, see{' '}
                  <Link href="/privacy" className="font-semibold text-[#4D148C] underline-offset-2 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </TabsContent>

              <TabsContent value="request" className="mt-0 space-y-5">
                <div className="rounded-r-lg border-l-4 border-[#4D148C] bg-[#f5f0ff] p-4 text-[13px] leading-relaxed text-[#565656]">
                  Submitting this form notifies administrators that you want your <strong>legacy records</strong>{' '}
                  removed from systems tied to this portal, subject to verification and legal exceptions. You may
                  be contacted to confirm your identity before processing.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deletion-details" className="text-[13px] font-bold text-[#565656]">
                    Describe your request
                  </Label>
                  <Textarea
                    id="deletion-details"
                    value={deletionNotes}
                    onChange={(e) => setDeletionNotes(e.target.value)}
                    placeholder="Example: Please delete my legacy application data associated with my account…"
                    className="min-h-[100px] border-[1.5px] border-[#D0D0D0] text-[15px] focus-visible:border-[#4D148C] focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(77,20,140,0.12)]"
                  />
                  <p className="text-[12px] text-[#8E8E8E]">Minimum 10 characters.</p>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-[#E3E3E3] bg-[#fafafa] p-4">
                  <Checkbox
                    id="ca-ack"
                    checked={caAck}
                    onCheckedChange={(v) => setCaAck(v === true)}
                    className="mt-0.5 border-[#D0D0D0] data-[state=checked]:bg-[#4D148C] data-[state=checked]:border-[#4D148C]"
                  />
                  <Label htmlFor="ca-ack" className="cursor-pointer text-[13px] leading-snug text-[#565656]">
                    I have read the <strong className="text-[#333333]">California privacy rights</strong> tab and
                    understand how deletion requests are verified and processed.
                  </Label>
                </div>
                {deletionMsg && (
                  <p
                    className={cn(
                      'text-[13px] font-medium',
                      deletionMsg.type === 'ok' ? 'text-[#008A00]' : 'text-[#DE002E]'
                    )}
                    role="status"
                  >
                    {deletionMsg.text}
                  </p>
                )}
                <Button type="button" onClick={onDeletionSubmit} disabled={deletionSubmitting} className="px-8">
                  {deletionSubmitting ? 'Sending…' : 'Submit deletion request'}
                </Button>
              </TabsContent>
            </Tabs>
          </RequestCard>

          <RequestCard
            icon={LockOpen}
            title="Unlock submitted application"
            description="After you submit your application, it is normally locked for editing. If you need to correct information, explain what changed below. An administrator will review and may reopen your application when appropriate."
          >
            <div className="space-y-2">
              <Label htmlFor="unlock-reason" className="text-[13px] font-bold text-[#565656]">
                What do you need to update?
              </Label>
              <Textarea
                id="unlock-reason"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Describe the sections or answers that need changes…"
                className="min-h-[100px] border-[1.5px] border-[#D0D0D0] text-[15px] focus-visible:border-[#4D148C] focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(77,20,140,0.12)]"
              />
              <p className="text-[12px] text-[#8E8E8E]">Minimum 15 characters.</p>
            </div>
            {unlockMsg && (
              <p
                className={cn('mt-4 text-[13px] font-medium', unlockMsg.type === 'ok' ? 'text-[#008A00]' : 'text-[#DE002E]')}
                role="status"
              >
                {unlockMsg.text}
              </p>
            )}
            <Button type="button" onClick={onUnlockSubmit} disabled={unlockSubmitting} className="mt-5 px-8">
              {unlockSubmitting ? 'Sending…' : 'Request unlock'}
            </Button>
          </RequestCard>

          <RequestCard
            icon={Phone}
            title="Contact us"
            description="Reach the pilot portal administrators directly for account issues, verification problems, or if your request is urgent."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, '')}`}
                className="flex items-center gap-3 rounded-xl border border-[#E3E3E3] bg-[#fafafa] p-4 transition-colors hover:border-[#4D148C]/40"
              >
                <Phone className="h-5 w-5 shrink-0 text-[#4D148C]" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E8E]">Phone</div>
                  <div className="text-[15px] font-semibold text-[#333333]">{SUPPORT_PHONE}</div>
                </div>
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-3 rounded-xl border border-[#E3E3E3] bg-[#fafafa] p-4 transition-colors hover:border-[#4D148C]/40"
              >
                <Mail className="h-5 w-5 shrink-0 text-[#4D148C]" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E8E]">Email</div>
                  <div className="truncate text-[15px] font-semibold text-[#333333]">{SUPPORT_EMAIL}</div>
                </div>
              </a>
            </div>
          </RequestCard>
        </div>

        <footer className="mt-12 text-center text-[12px] text-[#8E8E8E]">
          <Link href="/dashboard" className="text-[#4D148C] hover:underline">
            Back to dashboard
          </Link>
        </footer>
      </div>
    </div>
  );
}
