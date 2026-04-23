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
  return 'FedEx Pilot Hiring <FedexPilotHiring@flyfdx.com>';
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
    <p>FedEx · 3131 Democrat Rd · Memphis, TN 38118</p>
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
  // Emails must use absolute https:// URLs for images — http or relative paths
  // break in iOS Mail and many corporate mail proxies.
  const httpsPortal = portal.replace(/^http:\/\//, 'https://');
  const safeName = candidateName || 'Candidate';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; line-height: normal; }
  .wrapper > * { margin-top: 0; margin-bottom: 0; }
  /* Portal branded header — top of email, no image above */
  /* Portal branded header */
  .portal-header { background: linear-gradient(135deg, #1a0033 0%, #330066 35%, #4D148C 65%, #7c2fc4 100%); padding: 32px 28px 28px; position: relative; overflow: hidden; }
  .portal-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #FF6200 0%, #ff9a00 50%, #FF6200 100%); }
  .portal-site { font-size: 26px; font-weight: 900; color: #ffffff; margin: 0 0 4px; letter-spacing: -0.01em; }
  .portal-name { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.12em; margin: 0; }
  /* Main */
  .main { padding: 32px 24px 40px; color: #1a1c1c; }
  .body-text { font-size: 16px; line-height: 24px; color: #1a1c1c; margin: 0 0 24px; }
  .muted-text { font-size: 16px; line-height: 24px; color: #4b4452; margin: 0 0 24px; }
  /* Important Dates banner */
  .dates-banner { background: rgba(186,26,26,0.08); border-left: 4px solid #ba1a1a; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 0 0 24px; }
  .dates-title { font-size: 18px; font-weight: 600; color: #ba1a1a; margin: 0 0 8px; line-height: 28px; }
  .dates-body { font-size: 14px; line-height: 20px; color: #410002; margin: 0; }
  /* Legacy ID card */
  .id-card { background: #f3f3f3; border: 1px solid #cdc3d4; border-radius: 12px; padding: 24px 20px; margin: 0 0 16px; text-align: center; }
  .id-card-label { font-size: 12px; font-weight: 700; color: #4b4452; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; }
  .id-card-value { font-size: 32px; font-weight: 700; color: #330066; letter-spacing: 0.2em; padding: 8px 0; margin: 0; }
  .id-card-hint { font-size: 14px; color: #4b4452; margin: 8px 0 0; line-height: 20px; }
  .italic-note { font-size: 14px; font-style: italic; color: #4b4452; line-height: 20px; margin: 0 0 40px; }
  /* Steps */
  .steps-title { font-size: 20px; font-weight: 600; color: #330066; line-height: 28px; margin: 0 0 16px; }
  .step { display: flex; align-items: flex-start; padding: 14px 16px; background: #ffffff; border: 1px solid #cdc3d4; border-radius: 8px; margin-bottom: 8px; }
  .step-num { background: #330066; color: #ffffff; min-width: 30px; height: 30px; border-radius: 50%; font-size: 13px; font-weight: 700; text-align: center; line-height: 30px; margin-right: 14px; flex-shrink: 0; }
  .step-text { font-size: 14px; line-height: 20px; color: #1a1c1c; margin: 0; padding-top: 5px; }
  /* CTA */
  .cta-wrap { text-align: center; margin: 40px 0; }
  .cta-btn { display: inline-block; color: #ffffff; font-size: 16px; font-weight: 600; line-height: 24px; padding: 16px 40px; border-radius: 12px; text-decoration: none; background: #4D148C; background-image: linear-gradient(135deg, #4D148C 0%, #7D22C3 55%, #FF6200 100%); }
  /* Closing */
  .closing { border-top: 1px solid #e2e2e2; padding-top: 24px; }
  .closing-body { font-size: 16px; line-height: 24px; color: #1a1c1c; margin: 0 0 24px; }
  .sig-name { font-size: 20px; font-weight: 600; color: #1a1c1c; margin: 0 0 4px; }
  .sig-title { font-size: 14px; color: #4b4452; margin: 0 0 4px; }
  .sig-email { color: #330066; font-weight: 700; font-size: 14px; text-decoration: none; }
  /* Footer */
  .email-footer { background: #ffffff; border-top: 1px solid #e2e2e2; padding: 32px 24px 48px; text-align: center; }
  .footer-brand { font-size: 15px; font-weight: 700; color: #1a1c1c; margin: 0 0 16px; }
  .footer-legal { font-size: 12px; line-height: 1.8; color: #4b4452; margin: 0 0 20px; }
  .footer-links a { color: #4b4452; text-decoration: none; font-size: 12px; margin: 0 8px; }
  /* Force light mode — iOS Mail dark mode must not invert or override colors */
  @media (prefers-color-scheme: dark) {
    body, .wrapper, .main, .email-footer { background-color: #ffffff !important; color: #1a1c1c !important; }
    .portal-header { background: linear-gradient(135deg, #1a0033 0%, #330066 35%, #4D148C 65%, #7c2fc4 100%) !important; }
    .body-text, .closing-body, .sig-name { color: #1a1c1c !important; }
    .muted-text, .sig-title, .id-card-label, .id-card-hint, .italic-note, .step-text, .footer-legal { color: #4b4452 !important; }
    .dates-title { color: #ba1a1a !important; }
    .dates-body { color: #410002 !important; }
    .dates-banner { background-color: rgba(186,26,26,0.08) !important; }
    .id-card { background-color: #f3f3f3 !important; border-color: #cdc3d4 !important; }
    .id-card-value { color: #330066 !important; }
    .step { background-color: #ffffff !important; border-color: #cdc3d4 !important; }
    .steps-title, .sig-email { color: #330066 !important; }
    .portal-site { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
    .portal-name { color: rgba(255,255,255,0.65) !important; -webkit-text-fill-color: rgba(255,255,255,0.65) !important; }
    .closing { border-color: #e2e2e2 !important; }
    .footer-links a { color: #4b4452 !important; }
  }
  [data-ogsc] .portal-header { background: linear-gradient(135deg, #1a0033 0%, #330066 35%, #4D148C 65%, #7c2fc4 100%) !important; }
  [data-ogsc] .portal-site { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
  [data-ogsc] .portal-name { color: rgba(255,255,255,0.65) !important; -webkit-text-fill-color: rgba(255,255,255,0.65) !important; }
</style>
</head>
<body style="background-color:#f9f9f9; margin:0; padding:0;">
<div class="wrapper" style="background-color:#ffffff; color:#1a1c1c; max-width:600px; margin:0 auto;">

  <!-- Portal branded header -->
  <div class="portal-header">
    <p class="portal-site"><span style="color:#ffffff !important; -webkit-text-fill-color:#ffffff !important; text-decoration:none;">FlyFDX.com</span></p>
    <p class="portal-name"><span style="color:rgba(255,255,255,0.65) !important; -webkit-text-fill-color:rgba(255,255,255,0.65) !important; text-decoration:none;">Pilot History Portal</span></p>
  </div>

  <!-- Main content -->
  <div class="main">

    <p class="body-text">Dear ${safeName},</p>

    <p class="muted-text">We are reaching out because your name is on our list of candidates who successfully completed the FedEx flight crew interview process. As we plan upcoming staffing needs we'd like to confirm whether you're still interested in pursuing a career with FedEx.</p>

    <!-- Important Dates -->
    <div class="dates-banner">
      <p class="dates-title">&#128197; Important Dates</p>
      <p class="dates-body">The deadline to update your pilot history is <strong>May 15th 2026 at 2359 Central time.</strong> If you do not complete your pilot history update by the deadline you will be considered no longer interested.</p>
    </div>

    <p class="body-text">If you would like to remain under consideration please complete the pilot history update form on our secure pilot portal at <a href="${portal}/signup" style="color:#4D148C;font-weight:700;">flyfdx.com</a>.</p>

    <p class="body-text">Your unique Legacy ID is below. You will need it to register and link your new account to your existing profile.</p>

    <p class="body-text">Once logged in, your latest flight information will be displayed. Please fill in the gap in flight information from these dates until present.</p>

    <!-- Legacy ID card -->
    <div class="id-card">
      <p class="id-card-label">Your Unique Legacy ID</p>
      <p class="id-card-value">${candidateId}</p>
    </div>

    <!-- Next Steps -->
    <p class="steps-title">Next Steps</p>

    <div class="step">
      <div class="step-num">1</div>
      <p class="step-text">Visit the Pilot History Update Portal at <a href="${portal}/signup" style="color:#4D148C;font-weight:700;text-decoration:none;">flyfdx.com</a></p>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <p class="step-text">Register for an account using <strong>${candidateEmail}</strong> as your email address</p>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <p class="step-text">Enter your Legacy ID when prompted to link your portal account</p>
    </div>
    <div class="step" style="margin-bottom:0;">
      <div class="step-num">4</div>
      <p class="step-text">Review your legacy data and submit your updated information.</p>
    </div>

    <!-- CTA -->
    <div class="cta-wrap">
      <a href="${portal}/signup" class="cta-btn" style="color:#ffffff !important;text-decoration:none !important;display:inline-block;">Go To FlyFDX.com</a>
    </div>

    <!-- Closing -->
    <div class="closing">
      <p class="closing-body">If you have any questions, please visit our <a href="${portal}/help" style="color:#330066;">Help page</a>. Thank you for your continued interest in FedEx, and best wishes in your professional journey.</p>
      <p class="sig-name">Captain Abegael Autry</p>
      <p class="sig-title">Senior Manager Fleet Standardization and Pilot Recruitment</p>
      <a class="sig-email" href="mailto:amautry@fedex.com">amautry@fedex.com</a>
    </div>

  </div><!-- /main -->

  <!-- Footer -->
  <div class="email-footer">
    <p class="footer-brand">FedEx</p>
    <p class="footer-legal">
      &copy; 2026 FedEx. All rights reserved.<br>
      This email was sent to <strong>${candidateEmail}</strong>.<br>
      FedEx &middot; 3131 Democrat Rd &middot; Memphis, TN 38118
    </p>
    <div class="footer-links">
      <a href="${portal}/privacy">Privacy Policy</a>
      <a href="${portal}/terms">Terms of Use</a>
      <a href="${portal}/unsubscribe">Unsubscribe</a>
    </div>
  </div>

</div><!-- /wrapper -->
</body>
</html>`;
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; line-height: normal; }
  .wrapper > * { margin-top: 0; margin-bottom: 0; }
  .portal-header { background: linear-gradient(135deg, #1a0033 0%, #330066 35%, #4D148C 65%, #7c2fc4 100%); padding: 32px 28px 28px; position: relative; overflow: hidden; }
  .portal-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #FF6200 0%, #ff9a00 50%, #FF6200 100%); }
  .portal-site { font-size: 26px; font-weight: 900; color: #ffffff; margin: 0 0 4px; letter-spacing: -0.01em; }
  .portal-name { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.12em; margin: 0; }
  .main { padding: 32px 24px 40px; color: #1a1c1c; }
  .body-text { font-size: 16px; line-height: 24px; color: #1a1c1c; margin: 0 0 24px; }
  .success-box { background: #f0fff4; border: 2px solid #008A00; border-radius: 8px; padding: 20px; margin: 0 0 24px; text-align: center; }
  a { color: inherit; text-decoration: none; }
  .link { color: #4D148C; text-decoration: underline; }
  .closing { border-top: 1px solid #e2e2e2; padding-top: 24px; }
  .closing-body { font-size: 16px; line-height: 24px; color: #1a1c1c; margin: 0 0 24px; }
  .sig-name { font-size: 20px; font-weight: 600; color: #1a1c1c; margin: 0 0 4px; }
  .sig-title { font-size: 14px; color: #4b4452; margin: 0 0 4px; }
  .sig-email { color: #330066; font-weight: 700; font-size: 14px; text-decoration: none; }
  .email-footer { background: #ffffff; border-top: 1px solid #e2e2e2; padding: 32px 24px 48px; text-align: center; }
  .footer-brand { font-size: 15px; font-weight: 700; color: #1a1c1c; margin: 0 0 16px; }
  .footer-legal { font-size: 12px; line-height: 1.8; color: #4b4452; margin: 0 0 20px; }
  .footer-links a { color: #4b4452; text-decoration: none; font-size: 12px; margin: 0 8px; }
  @media (prefers-color-scheme: dark) {
    body, .wrapper, .main, .email-footer { background-color: #ffffff !important; color: #1a1c1c !important; }
    .portal-header { background: linear-gradient(135deg, #1a0033 0%, #330066 35%, #4D148C 65%, #7c2fc4 100%) !important; }
    .portal-site { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
    .portal-name { color: rgba(255,255,255,0.65) !important; -webkit-text-fill-color: rgba(255,255,255,0.65) !important; }
    .body-text, .closing-body, .sig-name { color: #1a1c1c !important; }
    .sig-title, .footer-legal { color: #4b4452 !important; }
    .closing { border-color: #e2e2e2 !important; }
    .footer-links a { color: #4b4452 !important; }
  }
  [data-ogsc] .portal-header { background: linear-gradient(135deg, #1a0033 0%, #330066 35%, #4D148C 65%, #7c2fc4 100%) !important; }
  [data-ogsc] .portal-site { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
  [data-ogsc] .portal-name { color: rgba(255,255,255,0.65) !important; -webkit-text-fill-color: rgba(255,255,255,0.65) !important; }
</style>
</head>
<body style="background-color:#f9f9f9; margin:0; padding:0;">
<div class="wrapper" style="background-color:#ffffff; color:#1a1c1c; max-width:600px; margin:0 auto;">

  <!-- Portal branded header -->
  <div class="portal-header">
    <p class="portal-site"><span style="color:#ffffff !important; -webkit-text-fill-color:#ffffff !important; text-decoration:none;">FlyFDX.com</span></p>
    <p class="portal-name"><span style="color:rgba(255,255,255,0.65) !important; -webkit-text-fill-color:rgba(255,255,255,0.65) !important; text-decoration:none;">Pilot History Portal</span></p>
  </div>

  <!-- Main content -->
  <div class="main">

    <p class="body-text">Dear ${safeName},</p>

    <div class="success-box">
      <div style="font-size:40px;">&#10003;</div>
      <div style="font-size:18px; font-weight:bold; color:#008A00; margin-top:8px;">Update Received</div>
      <div style="color:#565656; margin-top:4px;">Submitted on ${submittedAt}</div>
    </div>

    <p class="body-text">Thank you for completing your pilot history update. We have successfully received your submission and it is now under review by our recruiting team.</p>

    <p class="body-text"><strong>What happens next:</strong></p>
    <ul style="color:#565656; line-height:2; margin: 0 0 24px; padding-left: 24px;">
      <li>Our team will review your updated pilot history and flight hours</li>
      <li>We will contact you regarding next steps within 7 business days</li>
    </ul>

    <p class="body-text">If you need to make any corrections or have questions about your submission, please visit the <a class="link" href="${portal}/help">Help page</a> on flyfdx.com.</p>

    <!-- Closing -->
    <div class="closing">
      <p class="closing-body">We appreciate your interest in joining the FedEx family.</p>
      <p class="closing-body" style="margin-bottom:16px;">Best regards,</p>
      <p class="sig-name">Captain Abegael Autry</p>
      <p class="sig-title">Senior Manager Fleet Standardization and Pilot Recruitment</p>
      <a class="sig-email" href="mailto:amautry@fedex.com">amautry@fedex.com</a>
    </div>

  </div><!-- /main -->

  <!-- Footer -->
  <div class="email-footer">
    <p class="footer-brand">FedEx</p>
    <p class="footer-legal">
      &copy; 2026 FedEx. All rights reserved.<br>
      This email was sent to <strong>${candidateEmail}</strong>.<br>
      FedEx &middot; 3131 Democrat Rd &middot; Memphis, TN 38118
    </p>
    <div class="footer-links">
      <a href="${portal}/privacy">Privacy Policy</a>
      <a href="${portal}/terms">Terms of Use</a>
      <a href="${portal}/unsubscribe">Unsubscribe</a>
    </div>
  </div>

</div><!-- /wrapper -->
</body>
</html>`;
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
