'use server';

import { getAdminFirestore, verifyIsAdmin } from '@/lib/firebase-admin';

type PurgeResult = {
  success: boolean;
  message: string;
  deletedSlots?: number;
  deletedBookings?: number;
};

const BATCH_SIZE = 500;

async function purgeCollection(
  db: FirebaseFirestore.Firestore,
  name: 'interviewSlots' | 'interviewBookings'
): Promise<number> {
  const coll = db.collection(name);
  let total = 0;
  while (true) {
    const snap = await coll.limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < BATCH_SIZE) break;
  }
  return total;
}

/**
 * Purge retired interview scheduling data (`interviewSlots` + `interviewBookings`)
 * in batched deletes. Admin-only. This action is irreversible.
 */
export async function purgeLegacyInterviewData(input: {
  idToken: string;
}): Promise<PurgeResult> {
  try {
    await verifyIsAdmin(input.idToken);
    const db = getAdminFirestore();

    const deletedSlots = await purgeCollection(db, 'interviewSlots');
    const deletedBookings = await purgeCollection(db, 'interviewBookings');

    return {
      success: true,
      message: `Purged ${deletedSlots} slot(s) and ${deletedBookings} booking(s).`,
      deletedSlots,
      deletedBookings,
    };
  } catch (err: any) {
    console.error('purgeLegacyInterviewData error:', err);
    return {
      success: false,
      message: err?.message || 'Failed to purge legacy interview data.',
    };
  }
}
