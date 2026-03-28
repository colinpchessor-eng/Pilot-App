import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, verifyDevToolsAccess } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await verifyDevToolsAccess(token);
    const { emails } = (await req.json()) as { emails?: string[] };
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'emails array required' }, { status: 400 });
    }
    const auth = getAdminAuth();
    const result: Record<string, boolean> = {};
    for (const raw of emails) {
      const email = String(raw || '').trim().toLowerCase();
      if (!email) continue;
      try {
        await auth.getUserByEmail(email);
        result[email] = true;
      } catch {
        result[email] = false;
      }
    }
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Lookup failed';
    const status = message.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
