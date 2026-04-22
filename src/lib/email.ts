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

/**
 * Public site origin for links inside HTML (client-safe).
 * Must be set via `NEXT_PUBLIC_APP_URL` in production. Dev falls back to localhost.
 */
export function getPublicPortalOrigin(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.trim()) || '';
  if (raw) return raw.replace(/\/+$/, '');
  const isProd =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL must be set in production — refusing to build email links without a public origin.'
    );
  }
  return 'http://localhost:3000';
}

/** Resolve the From header for outbound mail. Required in production. */
function resolveFromAddress(): string {
  const fromEnv =
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_EMAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim())) || '';
  if (fromEnv) return fromEnv;
  const isProd =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error(
      'NEXT_PUBLIC_EMAIL_FROM must be set in production — refusing to send mail without a verified sender.'
    );
  }
  return 'FedEx Pilot Portal <noreply@localhost>';
}

/** Resolve the Reply-To header for outbound mail. Required in production. */
function resolveReplyToAddress(): string {
  const replyEnv =
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_EMAIL_REPLY_TO?.trim() || process.env.EMAIL_REPLY_TO?.trim())) || '';
  if (replyEnv) return replyEnv;
  const isProd =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error(
      'NEXT_PUBLIC_EMAIL_REPLY_TO must be set in production — refusing to send mail without a reply inbox.'
    );
  }
  return 'support@localhost';
}

export async function sendEmail(
  firestore: Firestore,
  email: EmailRecord
): Promise<string> {
  const origin = getPublicPortalOrigin();
  const docRef = await addDoc(collection(firestore, 'mail'), {
    to: email.to,
    from: email.from || resolveFromAddress(),
    replyTo: email.replyTo || resolveReplyToAddress(),
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

/* -------------------------------------------------------------------------
 * Shared email skeleton (FlyFDX header + unified footer) — used by every
 * candidate-facing template below.
 * ------------------------------------------------------------------------- */

const SHARED_EMAIL_CSS = `
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
  .header { background: #4D148C; padding: 32px 40px; text-align: left; }
  .header .brand { color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.01em; }
  .header .sub { color: #F3EAFB; margin: 4px 0 0; font-size: 14px; font-weight: 400; letter-spacing: 0.02em; }
  .orange-bar { height: 4px; background: #FF6200; }
  .body { padding: 40px; color: #333333; line-height: 1.6; }
  .cta-button { display: inline-block; background: #FF6200; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 24px 0; }
  .id-box { background: #f5f0ff; border: 2px solid #4D148C; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
  .id-label { font-size: 12px; color: #8E8E8E; text-transform: uppercase; letter-spacing: 0.1em; }
  .id-value { font-size: 32px; font-weight: bold; color: #4D148C; letter-spacing: 0.2em; margin-top: 8px; }
  .steps { background: #fafafa; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .step { display: flex; align-items: flex-start; margin-bottom: 12px; }
  .step-num { background: #4D148C; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0; }
  .success-box { background: #f0fff4; border: 2px solid #008A00; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
  .info-box { background: #f5f0ff; border-left: 4px solid #4D148C; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; }
  .link { color: #4D148C; text-decoration: underline; }
  .footer { background: #f5f5f5; padding: 24px 40px; font-size: 12px; color: #8E8E8E; }
  .footer p { margin: 4px 0; }
`;

/** Purple FlyFDX.com / Pilot History Portal header used on every candidate email. */
function renderEmailHeader(): string {
  return `
  <div class="header">
    <p class="brand">FlyFDX.com</p>
    <p class="sub">Pilot History Portal</p>
  </div>
  <div class="orange-bar"></div>`;
}

/** Shared 3-line footer used on every candidate email. */
function renderEmailFooter(candidateEmail: string): string {
  return `
  <div class="footer">
    <p>© 2026 FedEx. All rights reserved.</p>
    <p>This email was sent to ${candidateEmail} because you have expressed interest in joining FedEx.</p>
    <p>FedEx · 3610 Hacks Cross Rd · Memphis, TN 38125</p>
  </div>`;
}

function renderEmailShell(bodyHtml: string, candidateEmail: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${SHARED_EMAIL_CSS}</style>
</head>
<body>
<div class="container">
  ${renderEmailHeader()}
  <div class="body">
${bodyHtml}
  </div>
  ${renderEmailFooter(candidateEmail)}
</div>
</body>
</html>`;
}

/* -------------------------------------------------------------------------
 * Email 2 — Pilot History Invitation (section 3.2a of the plan).
 * ------------------------------------------------------------------------- */
export function buildFlowStartedEmail(
  candidateName: string,
  candidateEmail: string,
  candidateId: string
): string {
  const portal = getPublicPortalOrigin();
  const portalDisplay = portal.replace(/^https?:\/\//, '');
  const safeName = candidateName || 'Candidate';
  const body = `
    <p>Dear ${safeName},</p>
    <p>We are reaching out to invite you to update your pilot history through our secure Pilot History Update Portal.</p>
    <p>Your unique Legacy ID is below. You will need it to register and link your new account to your existing profile.</p>
    <div class="id-box">
      <div class="id-label">Your Legacy ID</div>
      <div class="id-value">${candidateId}</div>
    </div>
    <p><strong>To get started:</strong></p>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div>Visit the Pilot History Update Portal at <strong>flyfdx.com</strong></div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div>Register for an account using <strong>${candidateEmail}</strong> as your email address</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div>Enter your Legacy ID when prompted to link your portal account</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div>Review your legacy data and submit your updated information.</div>
      </div>
    </div>
    <a href="${portal}" class="cta-button">Go To Fly FDX.com</a>
    <p style="color:#8E8E8E; font-size:13px;">If you have any questions, please visit our <a class="link" href="${portal}/help">Help page</a>.</p>`;
  return renderEmailShell(body, candidateEmail);
}

/* -------------------------------------------------------------------------
 * Email 2b — Submission Received (section 3.2ab of the plan).
 * ------------------------------------------------------------------------- */
export function buildSubmissionEmail(
  candidateName: string,
  candidateEmail: string,
  submittedAt: string
): string {
  const portal = getPublicPortalOrigin();
  const safeName = candidateName || 'Candidate';
  const body = `
    <p>Dear ${safeName},</p>
    <div class="success-box">
      <div style="font-size:40px;">&#10003;</div>
      <div style="font-size:18px; font-weight:bold; color:#008A00; margin-top:8px;">Update Received</div>
      <div style="color:#565656; margin-top:4px;">Submitted on ${submittedAt}</div>
    </div>
    <p>Thank you for completing your pilot history update. We have successfully received your submission and it is now under review by our recruiting team.</p>
    <p><strong>What happens next:</strong></p>
    <ul style="color:#565656; line-height:2;">
      <li>Our team will review your updated pilot history and flight hours</li>
      <li>We will contact you regarding next steps within 7 business days</li>
    </ul>
    <p>If you need to make any corrections or have questions about your submission, please visit the <a class="link" href="${portal}/help">Help page</a> on flyfdx.com.</p>
    <p>We appreciate your interest in joining the FedEx family.</p>
    <p style="margin-top:32px;">Best regards,<br><strong>FedEx Pilot Recruiting Team</strong></p>`;
  return renderEmailShell(body, candidateEmail);
}

/* -------------------------------------------------------------------------
 * Email 3 — Indoctrination Class Invitation (section 3.2c of the plan).
 * Replaces the old buildInterviewEmail. July 2026 cohort is hardcoded; update
 * the copy when the class session changes.
 * ------------------------------------------------------------------------- */
export function buildIndoctrinationEmail(
  candidateName: string,
  candidateEmail: string
): string {
  const portal = getPublicPortalOrigin();
  const safeName = candidateName || 'Candidate';
  const body = `
    <p>Dear ${safeName},</p>
    <p>Congratulations &mdash; on behalf of the FedEx Pilot Recruiting Team, we are delighted to invite you to our <strong>July 2026 Pilot Indoctrination Class</strong>.</p>
    <p>This is the final step before you officially begin your career as a FedEx pilot. Full class details &mdash; dates, times, location, and preparation materials &mdash; are available in your Pilot Portal.</p>
    <div class="info-box">
      <strong>Program:</strong> FedEx Pilot Indoctrination<br>
      <strong>Class Session:</strong> July 2026<br>
      <strong>Details:</strong> Available in your Pilot Portal
    </div>
    <a href="${portal}/dashboard/indoctrination" class="cta-button">View Class Details</a>
    <p style="color:#8E8E8E; font-size:13px;">If you have any questions, please visit our <a class="link" href="${portal}/dashboard/help">Help page</a>.</p>
    <p>We look forward to welcoming you to the FedEx family.</p>
    <p style="margin-top:32px;">Best regards,<br><strong>FedEx Pilot Recruiting Team</strong></p>`;
  return renderEmailShell(body, candidateEmail);
}
