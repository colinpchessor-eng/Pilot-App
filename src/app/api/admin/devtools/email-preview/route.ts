import { NextResponse } from 'next/server';
import { buildFlowStartedEmail } from '@/lib/email';

export async function GET() {
  const html = buildFlowStartedEmail('Test Candidate', 'test@example.com', '12345678');
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
