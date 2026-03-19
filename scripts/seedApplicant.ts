import 'dotenv/config';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type ApplicantRecord = {
  token: string;
  email: string;
  name: string;
  legacyApplicationId: string;
  assignedUid: string | null;
  status: 'unassigned' | 'token_sent' | 'claimed';
};

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT,
    });
  }

  const db = getFirestore();

  const token = 'ABC123';
  const record: ApplicantRecord = {
    token,
    email: 'dmcnair@gmail.com',
    name: 'Dave McNair',
    legacyApplicationId: '123456',
    assignedUid: null,
    status: 'unassigned',
  };

  await db.collection('applicants').doc(token).set(record, { merge: true });
  // eslint-disable-next-line no-console
  console.log(`Seeded applicants/${token}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

