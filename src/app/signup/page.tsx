import { SignupForm } from '@/components/signup-form';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen w-full flex-col md:flex-row bg-[#FAFAFA]">
      {/* Left Pane */}
      <div className="relative h-64 md:h-auto md:w-1/2 overflow-hidden bg-black">
        {/* FedEx Heartbeat Map animation placeholder */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/network-map-animated.webp"
            alt="FedEx Heartbeat Map"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Overlay Elements */}
        <div className="relative z-10 flex h-full flex-col justify-between p-8 md:p-12">
          <div className="flex items-center gap-2 text-white font-black italic text-2xl">
            <span className="text-white">Fed</span>
            <span className="text-[#FF6200]">Ex</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white uppercase">
              CHART YOUR <br /> COURSE.
            </h1>
            <p className="max-w-md text-lg text-gray-300">
               Join the world&apos;s largest express transportation company. Your journey to the cockpit begins here.
            </p>
            
            {/* Pagination Indicator */}
            <div className="flex gap-2 pt-4">
              <div className="h-1 w-8 rounded-full bg-white/30" />
              <div className="h-1 w-8 rounded-full bg-white" />
              <div className="h-1 w-8 rounded-full bg-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane */}
      <div className="flex flex-1 items-center justify-center p-8 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-12">
          {/* Logo above card */}
          <div className="mb-6 text-center">
             <div className="inline-flex items-center text-[22px] font-black italic tracking-tighter">
                <span className="text-[#4D148C]">Fed</span>
                <span className="text-[#FF6200]">Ex</span>
                <span className="text-[#FF6200] ml-0.5 text-3xl leading-[0]">.</span>
             </div>
          </div>

          {/* Signup Card */}
          <div className="bg-white rounded-[16px] border border-[#E3E3E3] shadow-[0_8px_40px_rgba(77,20,140,0.10)] p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#333333] tracking-tight">
                Create Account
              </h2>
              <p className="text-[14px] text-[#8E8E8E] mt-1">
                Enter your details to start your application
              </p>
            </div>

            <SignupForm />

            <div className="mt-10 text-center border-t border-[#E3E3E3] pt-6">
              <p className="text-sm text-[#8E8E8E]">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-bold text-[#4D148C] hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
