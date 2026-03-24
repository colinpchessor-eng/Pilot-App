import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FedExBrandMark } from '@/components/brand/fedex-brand-mark';

const sectionHeadingStyle =
  'text-[18px] font-bold text-[#4D148C] mt-8 pb-2 border-b-2 border-[#FF6200]';
const subHeadingStyle = 'text-[14px] font-bold text-[#333333] mt-4 mb-2';
const bodyStyle = 'text-[14px] text-[#333333] leading-[1.7]';
const bulletStyle = 'text-[14px] text-[#565656] leading-[1.7]';

type PrivacyPolicyArticleProps = {
  /** When false, omit logo and page-level H1 (e.g. dialog already has a title). */
  showBranding?: boolean;
  className?: string;
};

export function PrivacyPolicyArticle({
  showBranding = true,
  className,
}: PrivacyPolicyArticleProps) {
  return (
    <article className={cn(showBranding ? '' : 'pt-1', className)}>
      {showBranding ? (
        <>
          <div className="mb-6">
            <FedExBrandMark height={36} />
          </div>

          <h1 className="text-3xl font-bold text-[#333333] tracking-tight">Privacy Policy</h1>
          <p className="text-[14px] text-[#565656] mt-1">FedEx Pilot Application Portal</p>
          <div className="flex gap-4 mt-3 text-[12px] text-[#8E8E8E]">
            <span>Last updated: March 2026</span>
            <span>Effective date: March 2026</span>
          </div>
        </>
      ) : (
        <p className="text-[12px] text-[#8E8E8E] mb-4">
          Last updated: March 2026 · Effective date: March 2026
        </p>
      )}

      <p className={`${bodyStyle} ${showBranding ? 'mt-6' : 'mt-0'}`}>
        FedEx Express operates the Pilot Application Portal to collect and process pilot candidate
        application data for employment evaluation purposes. This Privacy Policy explains what
        information we collect, how we use it, who has access to it, and your rights regarding your
        personal data.
      </p>

      <h2 className={sectionHeadingStyle}>1. Information We Collect</h2>

      <p className={subHeadingStyle}>Information you provide directly:</p>
      <ul className={`list-disc pl-6 space-y-1 ${bulletStyle}`}>
        <li>Full name and email address</li>
        <li>Flight hours and aviation certificates</li>
        <li>Employment history (most recent employer)</li>
        <li>Residence information (most recent address)</li>
        <li>FAA ATP certificate number</li>
        <li>First Class Medical Certificate date</li>
        <li>Answers to applicant acknowledgment questions</li>
        <li>Digital signature (typed name)</li>
      </ul>

      <p className={subHeadingStyle}>Information imported from your previous application:</p>
      <ul className={`list-disc pl-6 space-y-1 ${bulletStyle}`}>
        <li>Flight time summary from your previous FedEx pilot application on file</li>
        <li>Most recent employer on file</li>
        <li>Most recent residence on file</li>
        <li>
          This data is imported from our applicant tracking system and displayed for your review
          and update
        </li>
      </ul>

      <p className={subHeadingStyle}>Information we do NOT collect:</p>
      <ul className={`list-disc pl-6 space-y-1 ${bulletStyle}`}>
        <li>Social Security Number</li>
        <li>Date of Birth</li>
        <li>Financial information</li>
        <li>Biometric data</li>
      </ul>

      <h2 className={sectionHeadingStyle}>2. How We Use Your Information</h2>
      <ul className={`list-disc pl-6 space-y-1 mt-3 ${bulletStyle}`}>
        <li>To evaluate your application for a pilot position at FedEx Express</li>
        <li>To verify your identity as a returning applicant using your Candidate ID</li>
        <li>To pre-populate your application with data from your previous application for your review</li>
        <li>To communicate with you regarding your application status</li>
        <li>We do not sell your information to third parties</li>
      </ul>

      <h2 className={sectionHeadingStyle}>3. How We Store Your Information</h2>
      <ul className={`list-disc pl-6 space-y-1 mt-3 ${bulletStyle}`}>
        <li>
          Your data is stored securely in Google Firebase Firestore, a cloud database hosted on
          Google Cloud infrastructure
        </li>
        <li>All data is encrypted in transit using TLS and encrypted at rest using AES-256</li>
        <li>Data is stored on US-based servers only</li>
        <li>Access is restricted to authorized FedEx HR personnel only</li>
      </ul>

      <h2 className={sectionHeadingStyle}>4. Data Retention</h2>
      <ul className={`list-disc pl-6 space-y-1 mt-3 ${bulletStyle}`}>
        <li>Your application data is retained for the duration of the hiring process</li>
        <li>
          If your application is not selected, your data will be retained for up to 3 years in
          accordance with employment record requirements
        </li>
        <li>You may request deletion of your data at any time (see Your Rights below)</li>
      </ul>

      <h2 className={sectionHeadingStyle}>5. Your Rights</h2>
      <ul className={`list-disc pl-6 space-y-1 mt-3 ${bulletStyle}`}>
        <li>
          <strong>Right to access:</strong> You may request a copy of the data we hold about you
        </li>
        <li>
          <strong>Right to correction:</strong> You may update your information at any time through
          the application portal
        </li>
        <li>
          <strong>Right to deletion:</strong> You may request that we delete your personal data
        </li>
        <li>
          <strong>Right to know:</strong> You have the right to know what data we collect and how we
          use it
        </li>
        <li>California residents have additional rights under the California Consumer Privacy Act (CCPA)</li>
        <li>
          To exercise any of these rights contact:{' '}
          <a
            href="mailto:privacy@fedex.com"
            className="text-[#4D148C] font-semibold hover:underline"
          >
            privacy@fedex.com
          </a>
        </li>
      </ul>

      <h2 className={sectionHeadingStyle}>6. Contact Us</h2>
      <p className={`${bodyStyle} mt-3`}>
        If you have questions about this Privacy Policy or how your data is handled please contact:
      </p>
      <div className={`${bodyStyle} mt-3 space-y-1`}>
        <p className="font-bold">FedEx Express Privacy Team</p>
        <p>
          <a href="mailto:privacy@fedex.com" className="text-[#4D148C] font-semibold hover:underline">
            privacy@fedex.com
          </a>
        </p>
        <p>3610 Hacks Cross Rd</p>
        <p>Memphis, TN 38125</p>
      </div>

      <div className="mt-10 pt-6 border-t border-[#E3E3E3]">
        <p className="text-[12px] text-[#8E8E8E] leading-relaxed">
          This Privacy Policy applies specifically to the FedEx Pilot Application Portal. For
          FedEx&apos;s general privacy policy please visit{' '}
          <a
            href="https://www.fedex.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4D148C] hover:underline"
          >
            fedex.com/privacy
          </a>
        </p>
      </div>

      {!showBranding && (
        <p className="text-[12px] text-[#8E8E8E] mt-6 pb-2">
          Full-page version:{' '}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4D148C] font-semibold underline">
            Open Privacy Policy in new tab
          </Link>
        </p>
      )}
    </article>
  );
}
