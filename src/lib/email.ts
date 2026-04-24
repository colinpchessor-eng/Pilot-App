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
  const safeName = candidateName || 'Candidate';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
</head>
<body class="body" style="margin:0; padding:0; background-color:transparent; font-family:system-ui,Arial,sans-serif;">

<style>
  [data-ogsc] .email-body-dark    { color: #1a1c1c !important; -webkit-text-fill-color: #1a1c1c !important; }
  [data-ogsc] .email-muted-dark   { color: #4b4452 !important; -webkit-text-fill-color: #4b4452 !important; }
  [data-ogsc] .email-red-dark     { color: #ba1a1a !important; -webkit-text-fill-color: #ba1a1a !important; }
  [data-ogsc] .email-darkred-dark { color: #410002 !important; -webkit-text-fill-color: #410002 !important; }
  [data-ogsc] .email-purple-dark  { color: #330066 !important; -webkit-text-fill-color: #330066 !important; }
  [data-ogsb] .email-card-bg     { background-color: #ffffff !important; }
  [data-ogsb] .email-outer-bg    { background-color: #f3f3f3 !important; }
  u + .body .gmail-screen     { mix-blend-mode: screen; background-color: #000000; display: inline-block; }
  u + .body .gmail-difference { mix-blend-mode: difference; display: inline-block; }
</style>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
  <tr>
    <td align="center" class="email-outer-bg" style="padding:20px 0; background-color:#f3f3f3; background-image:linear-gradient(#f3f3f3,#f3f3f3);">

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff);">

        <!-- Horizontal gradient header -->
        <tr>
          <td style="background-color:#4D148C; background-image:linear-gradient(90deg,#4D148C 0%,#7D22C3 50%,#FF6200 100%); padding:20px 24px;">
            <p style="font-size:20px; font-weight:900; color:#fffffe; text-transform:uppercase; letter-spacing:0.05em; margin:0; font-family:system-ui,Arial,sans-serif;">
              <span class="gmail-difference"><span class="gmail-screen" style="color:#fffffe !important; -webkit-text-fill-color:#fffffe !important; text-decoration:none;">&#9992; Pilot History Portal</span></span>
            </p>
          </td>
        </tr>

        <!-- Hero image -->
        <tr>
          <td style="padding:0; line-height:0; font-size:0;">
            <img src="https://firebasestorage.googleapis.com/v0/b/studio-3449665797-2559e.firebasestorage.app/o/201504-15-002-03-04-02-105-dm-160125%20(1).jpg?alt=media&token=4b2da13b-1d4c-44af-9d27-a6876b2f65ea" alt="FedEx aircraft" width="600" style="max-width:100%; display:block; width:100%; height:auto;">
          </td>
        </tr>

        <!-- Main content — light grey outer, white card inner -->
        <tr>
          <td class="email-outer-bg" style="padding:24px; background-color:#f3f3f3; background-image:linear-gradient(#f3f3f3,#f3f3f3);">

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border:1px solid #cdc3d4; border-radius:8px;" class="email-card-bg">
              <tr>
                <td style="padding:24px;">

                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">Dear ${safeName},</p>

                  <p style="font-size:16px; line-height:24px; color:#4b4452; margin:0 0 24px; font-family:system-ui,Arial,sans-serif;" class="email-muted-dark">We are reaching out because your name is on our list of candidates who successfully completed the FedEx flight crew interview process. As we plan upcoming staffing needs we'd like to confirm whether you're still interested in pursuing a career with FedEx.</p>

                  <!-- Important Dates banner -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:0 0 24px;">
                    <tr>
                      <td style="background:rgba(186,26,26,0.08); border-left:4px solid #ba1a1a; border-radius:0 8px 8px 0; padding:16px 20px;">
                        <p style="font-size:18px; font-weight:600; color:#ba1a1a; margin:0 0 8px; line-height:28px; font-family:system-ui,Arial,sans-serif;" class="email-red-dark">&#128197; Important Dates</p>
                        <p style="font-size:14px; line-height:20px; color:#410002; margin:0; font-family:system-ui,Arial,sans-serif;" class="email-darkred-dark">The deadline to update your pilot history is <strong>May 15th, 2026.</strong> If you do not complete your pilot history update by the deadline you will be considered no longer interested.</p>
                      </td>
                    </tr>
                  </table>

                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">If you would like to remain under consideration please complete the pilot history update form on our secure pilot portal at <a href="${portal}/signup" style="color:#4D148C; font-weight:700; font-family:system-ui,Arial,sans-serif;">flyfdx.com</a>.</p>

                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">Your unique Legacy ID is below. You will need it to register and link your new account to your existing profile.</p>

                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">Once logged in, your latest flight information will be displayed. Please fill in the gap in flight information from these dates until present.</p>

                  <!-- Legacy ID card -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:0 0 16px;">
                    <tr>
                      <td style="background-color:#f3f3f3; background-image:linear-gradient(#f3f3f3,#f3f3f3); border:1px solid #cdc3d4; border-radius:12px; padding:24px 20px; text-align:center;">
                        <p style="font-size:12px; font-weight:700; color:#4b4452; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 4px; font-family:system-ui,Arial,sans-serif;" class="email-muted-dark">Your Unique Legacy ID</p>
                        <p style="font-size:13px; color:#4b4452; font-style:italic; margin:0 0 8px; font-family:system-ui,Arial,sans-serif;" class="email-muted-dark">You will need this to link your profile.</p>
                        <p style="font-size:32px; font-weight:700; color:#330066; letter-spacing:0.2em; padding:8px 0; margin:0; font-family:'Courier New',Courier,monospace;" class="email-purple-dark">${candidateId}</p>
                      </td>
                    </tr>
                  </table>

                  <p style="font-size:20px; font-weight:600; color:#330066; line-height:28px; margin:0 0 16px; font-family:system-ui,Arial,sans-serif;" class="email-purple-dark">Next Steps</p>

                  <!-- Step 1 -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border:1px solid #cdc3d4; border-radius:8px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td valign="top" style="padding-right:14px;">
                              <div style="background-color:#330066; background-image:linear-gradient(#330066,#330066); color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:13px; font-weight:700; text-align:center; line-height:30px; min-width:30px; font-family:system-ui,Arial,sans-serif;">1</div>
                            </td>
                            <td valign="top" style="padding-top:5px; font-size:14px; line-height:20px; color:#1a1c1c; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">Visit the Pilot History Update Portal at <a href="${portal}/signup" style="color:#4D148C; font-weight:700; text-decoration:none; font-family:system-ui,Arial,sans-serif;">flyfdx.com</a></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 2 -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border:1px solid #cdc3d4; border-radius:8px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td valign="top" style="padding-right:14px;">
                              <div style="background-color:#330066; background-image:linear-gradient(#330066,#330066); color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:13px; font-weight:700; text-align:center; line-height:30px; min-width:30px; font-family:system-ui,Arial,sans-serif;">2</div>
                            </td>
                            <td valign="top" style="padding-top:5px; font-size:14px; line-height:20px; color:#1a1c1c; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">Register for an account using <strong>${candidateEmail}</strong> as your email address</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 3 — Legacy ID in bold monospace inline -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border:1px solid #cdc3d4; border-radius:8px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td valign="top" style="padding-right:14px;">
                              <div style="background-color:#330066; background-image:linear-gradient(#330066,#330066); color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:13px; font-weight:700; text-align:center; line-height:30px; min-width:30px; font-family:system-ui,Arial,sans-serif;">3</div>
                            </td>
                            <td valign="top" style="padding-top:5px; font-size:14px; line-height:20px; color:#1a1c1c; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">Enter your Legacy ID <strong style="font-family:'Courier New',Courier,monospace; letter-spacing:0.1em;">${candidateId}</strong> when prompted to link your portal account</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 4 -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border:1px solid #cdc3d4; border-radius:8px; margin-bottom:0;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td valign="top" style="padding-right:14px;">
                              <div style="background-color:#330066; background-image:linear-gradient(#330066,#330066); color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:13px; font-weight:700; text-align:center; line-height:30px; min-width:30px; font-family:system-ui,Arial,sans-serif;">4</div>
                            </td>
                            <td valign="top" style="padding-top:5px; font-size:14px; line-height:20px; color:#1a1c1c; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">Review your legacy data and submit your updated information.</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA button -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:40px 0;">
                    <tr>
                      <td align="center">
                        <a href="${portal}/signup" style="display:inline-block; font-size:16px; font-weight:600; line-height:24px; padding:16px 40px; border-radius:12px; text-decoration:none; color:#fffffe; background-color:#4D148C; background-image:linear-gradient(135deg,#4D148C 0%,#7D22C3 55%,#FF6200 100%); font-family:system-ui,Arial,sans-serif;">
                          <span class="gmail-difference"><span class="gmail-screen" style="color:#fffffe !important; -webkit-text-fill-color:#fffffe !important;">Go To FlyFDX.com</span></span>
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Closing -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; border-top:1px solid #e2e2e2;">
                    <tr>
                      <td style="padding-top:24px;">
                        <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">If you have any questions, please visit our <a href="${portal}/help" style="color:#330066; font-family:system-ui,Arial,sans-serif;">Help page</a>. Thank you for your continued interest in FedEx, and best wishes in your professional journey.</p>
                        <p style="font-size:20px; font-weight:600; color:#1a1c1c; margin:0 0 4px; font-family:system-ui,Arial,sans-serif;" class="email-body-dark">Captain Abegael Autry</p>
                        <p style="font-size:14px; color:#4b4452; margin:0 0 4px; font-family:system-ui,Arial,sans-serif;" class="email-muted-dark">Senior Manager Fleet Standardization and Pilot Recruitment</p>
                        <a href="mailto:amautry@fedex.com" style="color:#330066; font-weight:700; font-size:14px; text-decoration:none; font-family:system-ui,Arial,sans-serif;">amautry@fedex.com</a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="email-card-bg" style="background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border-top:1px solid #e2e2e2; padding:32px 24px 48px; text-align:center;">
            <p style="font-size:18px; font-weight:700; margin:0 0 16px; font-family:system-ui,Arial,sans-serif;">
              <span style="color:#4D148C;">Fed</span><span style="color:#FF6200;">Ex</span>
            </p>
            <p style="font-size:12px; line-height:1.8; color:#4b4452; margin:0 0 20px; font-family:system-ui,Arial,sans-serif;" class="email-muted-dark">
              &copy; 2026 FedEx. All rights reserved.<br>
              This email was sent to <strong>${candidateEmail}</strong>.<br>
              FedEx &middot; 3131 Democrat Rd &middot; Memphis, TN 38118
            </p>
            <p style="margin:0; font-family:system-ui,Arial,sans-serif;">
              <a href="${portal}/privacy" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px; font-family:system-ui,Arial,sans-serif;">Privacy Policy</a>
              <a href="${portal}/help" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px; font-family:system-ui,Arial,sans-serif;">Contact Support</a>
              <a href="${portal}/unsubscribe" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px; font-family:system-ui,Arial,sans-serif;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

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
</head>
<body class="body" style="margin:0; padding:0; background-color:transparent; font-family:Arial,sans-serif;">

<style>
  [data-ogsc] .email-body-dark    { color: #1a1c1c !important; -webkit-text-fill-color: #1a1c1c !important; }
  [data-ogsc] .email-muted-dark   { color: #4b4452 !important; -webkit-text-fill-color: #4b4452 !important; }
  [data-ogsc] .email-purple-dark  { color: #330066 !important; -webkit-text-fill-color: #330066 !important; }
  [data-ogsb] .email-card-bg     { background-color: #ffffff !important; }
  u + .body .gmail-screen     { mix-blend-mode: screen; background-color: #000000; display: inline-block; }
  u + .body .gmail-difference { mix-blend-mode: difference; display: inline-block; }
</style>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
  <tr>
    <td align="center" style="padding:20px 0;">

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff);" class="email-card-bg">

        <!-- Purple gradient header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a0033 0%,#330066 35%,#4D148C 65%,#7c2fc4 100%); padding:32px 28px 28px;">
            <p style="font-size:26px; font-weight:900; color:#ffffff; margin:0 0 4px; letter-spacing:-0.01em;">
              <span class="gmail-difference"><span class="gmail-screen" style="color:#ffffff !important; -webkit-text-fill-color:#ffffff !important; text-decoration:none;">FlyFDX.com</span></span>
            </p>
            <p style="font-size:13px; font-weight:700; color:rgba(255,255,255,0.65); text-transform:uppercase; letter-spacing:0.12em; margin:0;">
              <span class="gmail-difference"><span class="gmail-screen" style="color:rgba(255,255,255,0.65) !important; -webkit-text-fill-color:rgba(255,255,255,0.65) !important; text-decoration:none;">Pilot History Portal</span></span>
            </p>
          </td>
        </tr>

        <!-- Orange accent bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#FF6200 0%,#ff9a00 50%,#FF6200 100%); height:3px; font-size:0; line-height:0;">&nbsp;</td>
        </tr>

        <!-- Main content -->
        <tr>
          <td class="email-card-bg" style="padding:32px 24px 40px; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff);">

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">Dear ${safeName},</p>

            <!-- Success box -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#f0fff4; background-image:linear-gradient(#f0fff4,#f0fff4); border:2px solid #008A00; border-radius:8px; margin:0 0 24px;">
              <tr>
                <td style="padding:20px; text-align:center;">
                  <p style="font-size:40px; margin:0;">&#10003;</p>
                  <p style="font-size:18px; font-weight:bold; color:#008A00; margin:8px 0 0;">Update Received</p>
                  <p style="color:#4b4452; margin:4px 0 0; font-size:14px;" class="email-muted-dark">Submitted on ${submittedAt}</p>
                </td>
              </tr>
            </table>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">Thank you for completing your pilot history update. We have successfully received your submission and it is now under review by our recruiting team.</p>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 8px;" class="email-body-dark"><strong>What happens next:</strong></p>
            <ul style="color:#4b4452; line-height:2; margin:0 0 24px; padding-left:24px; font-size:16px;" class="email-muted-dark">
              <li>Our team will review your updated pilot history and flight hours</li>
              <li>We will contact you regarding next steps within 7 business days</li>
            </ul>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">If you need to make any corrections or have questions about your submission, please visit the <a href="${portal}/help" style="color:#4D148C; text-decoration:underline;">Help page</a> on flyfdx.com.</p>

            <!-- Closing -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; border-top:1px solid #e2e2e2;">
              <tr>
                <td style="padding-top:24px;">
                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">We appreciate your interest in joining the FedEx family.</p>
                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 16px;" class="email-body-dark">Best regards,</p>
                  <p style="font-size:20px; font-weight:600; color:#1a1c1c; margin:0 0 4px;" class="email-body-dark">Captain Abegael Autry</p>
                  <p style="font-size:14px; color:#4b4452; margin:0 0 4px;" class="email-muted-dark">Senior Manager Fleet Standardization and Pilot Recruitment</p>
                  <a href="mailto:amautry@fedex.com" style="color:#330066; font-weight:700; font-size:14px; text-decoration:none; font-family:system-ui,Arial,sans-serif;">amautry@fedex.com</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="email-card-bg" style="background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border-top:1px solid #e2e2e2; padding:32px 24px 48px; text-align:center;">
            <p style="font-size:15px; font-weight:700; color:#1a1c1c; margin:0 0 16px;" class="email-body-dark">FedEx</p>
            <p style="font-size:12px; line-height:1.8; color:#4b4452; margin:0 0 20px;" class="email-muted-dark">
              &copy; 2026 FedEx. All rights reserved.<br>
              This email was sent to <strong>${candidateEmail}</strong>.<br>
              FedEx &middot; 3131 Democrat Rd &middot; Memphis, TN 38118
            </p>
            <p style="margin:0;">
              <a href="${portal}/privacy" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Privacy Policy</a>
              <a href="${portal}/terms" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Terms of Use</a>
              <a href="${portal}/unsubscribe" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

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
