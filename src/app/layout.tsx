import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Inter, Orbitron } from 'next/font/google';
import { AuthGate } from '@/components/auth-gate';
import { ParallaxRoot } from '@/components/parallax-root';
import { PageTransition } from '@/components/page-transition';
import { GlobalBackgroundCanvas } from '@/components/global-background-canvas';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-headline' });

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
    <html lang="en" className={`dark ${inter.variable} ${orbitron.variable}`}>
      <head />
      <body className="font-body antialiased [text-rendering:optimizeLegibility] [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale]">
        <GlobalBackgroundCanvas />
        <div className="global-bg-overlay" aria-hidden="true" />
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
