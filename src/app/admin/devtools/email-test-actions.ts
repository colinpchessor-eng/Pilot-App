'use server';

import { verifyCallerIsDev, getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, buildFlowStartedEmail, buildSubmissionEmail, buildIndoctrinationEmail } from '@/lib/email';
import { format } from 'date-fns';

export async function testEmailDelivery(input: {
  idToken: string;
  targetEmail: string;
  templateType: 'flow_started' | 'submission' | 'indoctrination';
}) {
  const admin = await verifyCallerIsDev(input.idToken);
  const db = getAdminFirestore();

  let html = '';
  let subject = '';

  if (input.templateType === 'flow_started') {
    html = buildFlowStartedEmail('Test Candidate', input.targetEmail, '12345678');
    subject = 'FedEx Pilot Hiring: Action Required to Update Your Profile';
  } else if (input.templateType === 'submission') {
    html = buildSubmissionEmail('Test Candidate', input.targetEmail, format(new Date(), 'MMM d, yyyy'));
    subject = 'Pilot Portal: Application Update Received';
  } else if (input.templateType === 'indoctrination') {
    html = buildIndoctrinationEmail('Test Candidate', input.targetEmail);
    subject = 'FedEx Pilot Hiring: Indoctrination Class Invitation';
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
  const fromAddr = process.env.EMAIL_FROM || process.env.NEXT_PUBLIC_EMAIL_FROM || 'FedEx Pilot Hiring <FedexPilotHiring@flyfdx.com>';
  const replyToAddr = process.env.EMAIL_REPLY_TO || process.env.NEXT_PUBLIC_EMAIL_REPLY_TO || 'noreply@flyfdx.com';

  const docRef = await db.collection('mail').add({
    to: input.targetEmail,
    from: fromAddr,
    replyTo: replyToAddr,
    message: {
      subject,
      html,
    },
    type: input.templateType,
    candidateName: 'Test Candidate',
    candidateId: 'TEST-DEVTOOLS',
    sentBy: admin.uid,
    sentByEmail: admin.email,
    portalOrigin: origin,
    createdAt: FieldValue.serverTimestamp(),
    status: 'pending',
  });

  return { success: true, mailDocId: docRef.id };
}
