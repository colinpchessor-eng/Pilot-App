import { InteriorNavbar } from '@/components/layout/InteriorNavbar';
import Link from 'next/link';
import { PrivacyPolicyArticle } from '@/components/legal/privacy-policy-article';

export default function PrivacyPage() {
  return (
    <div
      className="min-h-screen pb-12"
      style={{
        background: 'linear-gradient(160deg, #f5f0ff 0%, #fafafa 40%, #fff8f4 100%)',
      }}
    >
      <InteriorNavbar />

      <div className="container mx-auto max-w-[760px] px-4 py-10">
        <div
          className="bg-white rounded-xl border border-[#E3E3E3] p-8 md:p-12"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          <PrivacyPolicyArticle showBranding />
        </div>
      </div>

      <footer className="mt-auto py-8 text-center text-[#8E8E8E] text-sm">
        © {new Date().getFullYear()} FedEx. All rights reserved.{' '}
        <span className="text-[#8E8E8E]">|</span>{' '}
        <Link href="/privacy" className="text-[#4D148C] text-[13px] hover:underline">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
