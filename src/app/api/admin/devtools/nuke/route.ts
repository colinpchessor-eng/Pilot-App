import { NextRequest, NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore, verifyDevToolsAccess } from '@/lib/firebase-admin';

async function deleteCollectionInBatches(db: Firestore, collectionId: string) {
  const ref = db.collection(collectionId);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await ref.limit(500).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const d of snap.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { uid: callerUid } = await verifyDevToolsAccess(token);

    const body = (await req.json()) as { confirmPhrase?: string };
    if (body.confirmPhrase !== 'DELETE ALL') {
      return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
    }

    const db = getAdminFirestore();

    const usersSnap = await db.collection('users').get();
    let batch = db.batch();
    let op = 0;
    for (const d of usersSnap.docs) {
      if (d.id === callerUid) continue;
      batch.delete(d.ref);
      op++;
      if (op >= 500) {
        await batch.commit();
        batch = db.batch();
        op = 0;
      }
    }
    if (op > 0) await batch.commit();

    for (const col of ['legacyData', 'pendingVerifications', 'mail', 'candidateIds']) {
      await deleteCollectionInBatches(db, col);
    }

    const auth = getAdminAuth();
    let pageToken: string | undefined;
    do {
      const list = await auth.listUsers(1000, pageToken);
      for (const u of list.users) {
        if (u.uid === callerUid) continue;
        try {
          await auth.deleteUser(u.uid);
        } catch {
          /* non-fatal */
        }
      }
      pageToken = list.pageToken;
    } while (pageToken);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Nuke failed';
    const status = message.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
