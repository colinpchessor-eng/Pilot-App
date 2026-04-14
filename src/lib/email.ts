import {
  addDoc,
  collection,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

export interface EmailRecord {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  type: string;
  candidateId?: string;
  candidateName?: string;
  sentBy?: string;
  sentByEmail?: string;
  createdAt?: ReturnType<typeof serverTimestamp>;
  status?: string;
}

/** Public site for links inside HTML (client-safe). */
export function getPublicPortalOrigin(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.trim()) || '';
  if (raw) return raw.replace(/\/+$/, '');
  return 'https://pilotportal.fedexinbound.com';
}

export async function sendEmail(
  firestore: Firestore,
  email: EmailRecord
): Promise<string> {
  const origin = getPublicPortalOrigin();
  const docRef = await addDoc(collection(firestore, 'mail'), {
    to: email.to,
    from:
      email.from ||
      'FedEx Pilot Recruiting <noreply@fedexinbound.com>',
    replyTo: email.replyTo || 'recruiting@fedexinbound.com',
    message: {
      subject: email.subject,
      html: email.html,
    },
    type: email.type,
    candidateId: email.candidateId || '',
    candidateName: email.candidateName || '',
    sentBy: email.sentBy || '',
    sentByEmail: email.sentByEmail || '',
    portalOrigin: origin,
    createdAt: serverTimestamp(),
    status: 'pending',
  });
  return docRef.id;
}

export function buildFlowStartedEmail(
  candidateName: string,
  candidateEmail: string,
  candidateId: string
): string {
  const portal = getPublicPortalOrigin();
  const safeName = candidateName || 'Candidate';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
  .header { background: #4D148C; padding: 32px 40px; }
  .header h1 { color: white; margin: 0; font-size: 24px; }
  .orange-bar { height: 4px; background: #FF6200; }
  .body { padding: 40px; color: #333333; line-height: 1.6; }
  .cta-button { display: inline-block; background: #FF6200; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 24px 0; }
  .id-box { background: #f5f0ff; border: 2px solid #4D148C; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
  .id-label { font-size: 12px; color: #8E8E8E; text-transform: uppercase; letter-spacing: 0.1em; }
  .id-value { font-size: 32px; font-weight: bold; color: #4D148C; letter-spacing: 0.2em; margin-top: 8px; }
  .footer { background: #f5f5f5; padding: 24px 40px; font-size: 12px; color: #8E8E8E; }
  .steps { background: #fafafa; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .step { display: flex; align-items: flex-start; margin-bottom: 12px; }
  .step-num { background: #4D148C; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>FedEx<span style="color:#FF6200">.</span> Pilot Portal</h1>
  </div>
  <div class="orange-bar"></div>
  <div class="body">
    <p>Dear ${safeName},</p>
    <p>We are reaching out because FedEx Express would like to invite you to update your pilot history through our secure Pilot History Update Portal.</p>
    <p>Your unique Candidate ID is below. You will need it to register and link your account to your application.</p>
    <div class="id-box">
      <div class="id-label">Your Candidate ID</div>
      <div class="id-value">${candidateId}</div>
    </div>
    <p><strong>To get started:</strong></p>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div>Visit the FedEx Pilot Portal at <strong>${portal.replace(/^https?:\/\//, '')}</strong></div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div>Register for an account using <strong>${candidateEmail}</strong> as your email address</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div>Enter your Candidate ID when prompted to link your portal account</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div>Review your legacy data and complete your updated application</div>
      </div>
    </div>
    <a href="${portal}" class="cta-button">Access Pilot Portal</a>
    <p style="color:#8E8E8E; font-size:13px;">If you have any questions please contact our recruiting team at recruiting@fedexinbound.com</p>
  </div>
  <div class="footer">
    <p>© 2026 FedEx Express. All rights reserved.</p>
    <p>This email was sent to ${candidateEmail} because you have an active pilot application on file with FedEx Express.</p>
    <p>FedEx Express · 3610 Hacks Cross Rd · Memphis, TN 38125</p>
  </div>
</div>
</body>
</html>`;
}

export function buildSubmissionEmail(
  candidateName: string,
  candidateEmail: string,
  submittedAt: string
): string {
  const safeName = candidateName || 'Candidate';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
  .header { background: #4D148C; padding: 32px 40px; }
  .header h1 { color: white; margin: 0; font-size: 24px; }
  .orange-bar { height: 4px; background: #FF6200; }
  .body { padding: 40px; color: #333333; line-height: 1.6; }
  .success-box { background: #f0fff4; border: 2px solid #008A00; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
  .footer { background: #f5f5f5; padding: 24px 40px; font-size: 12px; color: #8E8E8E; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>FedEx<span style="color:#FF6200">.</span> Pilot Portal</h1>
  </div>
  <div class="orange-bar"></div>
  <div class="body">
    <p>Dear ${safeName},</p>
    <div class="success-box">
      <div style="font-size:40px;">✓</div>
      <div style="font-size:18px; font-weight:bold; color:#008A00; margin-top:8px;">Update Received</div>
      <div style="color:#565656; margin-top:4px;">Submitted on ${submittedAt}</div>
    </div>
    <p>Thank you for completing your FedEx pilot application. We have successfully received your submission and it is now under review by our recruiting team.</p>
    <p><strong>What happens next:</strong></p>
    <ul style="color:#565656; line-height:2;">
      <li>Our team will review your updated application and flight hours</li>
      <li>Qualified candidates will be contacted to schedule an in-person interview</li>
      <li>You will receive an email notification at each stage of the process</li>
    </ul>
    <p>If you need to make any corrections or have questions about your application please contact us at <strong>recruiting@fedexinbound.com</strong></p>
    <p>We appreciate your interest in joining the FedEx Express family.</p>
    <p style="margin-top:32px;">Best regards,<br><strong>FedEx Express Pilot Recruiting Team</strong></p>
  </div>
  <div class="footer">
    <p>© 2026 FedEx Express. All rights reserved.</p>
    <p>FedEx Express · 3610 Hacks Cross Rd · Memphis, TN 38125</p>
  </div>
</div>
</body>
</html>`;
}

export function buildInterviewEmail(
  candidateName: string,
  candidateEmail: string,
  scheduleUrl: string
): string {
  const safeName = candidateName || 'Candidate';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
  .header { background: #4D148C; padding: 32px 40px; }
  .header h1 { color: white; margin: 0; font-size: 24px; }
  .orange-bar { height: 4px; background: #FF6200; }
  .body { padding: 40px; color: #333333; line-height: 1.6; }
  .cta-button { display: inline-block; background: #FF6200; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 24px 0; }
  .info-box { background: #f5f0ff; border-left: 4px solid #4D148C; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; }
  .footer { background: #f5f5f5; padding: 24px 40px; font-size: 12px; color: #8E8E8E; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>FedEx<span style="color:#FF6200">.</span> Pilot Portal</h1>
  </div>
  <div class="orange-bar"></div>
  <div class="body">
    <p>Dear ${safeName},</p>
    <p>Congratulations — after reviewing your pilot application we would like to invite you to schedule an in-person interview with our FedEx Express recruiting team.</p>
    <div class="info-box">
      <strong>Location:</strong> FedEx World Headquarters<br>
      3610 Hacks Cross Rd, Memphis, TN 38125<br>
      <strong>Format:</strong> In-Person Interview<br>
      <strong>Duration:</strong> Approximately 60 minutes
    </div>
    <p>Please use the link below to select your preferred interview time from our available slots. Times are shown in Central Time and update in real time as slots are booked.</p>
    <a href="${scheduleUrl}" class="cta-button">Choose Your Interview Time</a>
    <p style="color:#8E8E8E; font-size:13px;">Once you select a time you will receive a confirmation email with full details. If you have any questions please contact recruiting@fedexinbound.com</p>
    <p style="margin-top:32px;">We look forward to speaking with you.<br><br>Best regards,<br><strong>FedEx Express Pilot Recruiting Team</strong></p>
  </div>
  <div class="footer">
    <p>© 2026 FedEx Express. All rights reserved.</p>
    <p>FedEx Express · 3610 Hacks Cross Rd · Memphis, TN 38125</p>
  </div>
</div>
</body>
</html>`;
}
