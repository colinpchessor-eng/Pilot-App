import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, verifyDevToolsAccess } from '@/lib/firebase-admin';

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await verifyDevToolsAccess(token);
    const body = (await req.json()) as { uid?: string };
    const uid = body?.uid;
    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
    }
    await getAdminAuth().deleteUser(uid);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to delete user';
    const status = message.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
