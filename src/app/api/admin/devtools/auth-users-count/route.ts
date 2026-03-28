import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, verifyDevToolsAccess } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await verifyDevToolsAccess(token);
    const auth = getAdminAuth();
    let count = 0;
    let pageToken: string | undefined;
    do {
      const list = await auth.listUsers(1000, pageToken);
      count += list.users.length;
      pageToken = list.pageToken;
    } while (pageToken);
    return NextResponse.json({ count });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to count users';
    const status = message.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
