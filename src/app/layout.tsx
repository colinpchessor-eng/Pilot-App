import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthGate } from '@/components/auth-gate';
import { ParallaxRoot } from '@/components/parallax-root';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: 'FedexFlow',
  description: 'Pilot application portal for FedEx.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body className="font-sans antialiased [text-rendering:optimizeLegibility] [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale] bg-[#FAFAFA]">
        <FirebaseClientProvider>
          <ParallaxRoot />
          <AuthGate />
          <div className="relative z-[2]">
            <PageTransition>{children}</PageTransition>
          </div>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
