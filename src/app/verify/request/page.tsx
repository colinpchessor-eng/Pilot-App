'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InteriorNavbar } from '@/components/layout/InteriorNavbar';

/** Legacy URL: manual identity queue was retired; identity is confirmed at registration with Candidate ID. */
export default function VerifyRequestDeprecatedPage() {
  useEffect(() => {
    document.body.classList.add('light-theme');
    return () => {
      document.body.classList.remove('light-theme');
    };
  }, []);

  return (
    <div className="min-h-screen interior-bg">
      <InteriorNavbar />
      <div className="flex items-center justify-center px-4 py-12 pt-16">
        <div className="w-full max-w-2xl">
          <Card className="border-[#E3E3E3] bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold uppercase tracking-wider text-black">
                Registration and Candidate ID
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-[#565656]">
              <p>
                We no longer use a separate identity review queue. When you register, you confirm your identity by
                linking your <strong className="text-[#333333]">Candidate ID</strong> to your account. That unlocks
                your application and legacy records the same way.
              </p>
              <p className="text-sm text-[#8E8E8E]">
                If you were emailed an access token for a legacy applicant flow, use the token screen from your sign-in
                flow or open the dashboard to enter your Candidate ID.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="fedex-btn-primary h-12 flex-1">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="fedex-btn-secondary h-12 flex-1">
                  <Link href="/login">Back to login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
