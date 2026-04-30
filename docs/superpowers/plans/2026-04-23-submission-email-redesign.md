# Submission Email Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `buildSubmissionEmail` in `src/lib/email.ts` to use the same standalone HTML template structure as `buildFlowStartedEmail`, keeping all body text identical and updating the signature to Captain Autry with the styled footer.

**Architecture:** Replace the current `renderEmailShell()` call in `buildSubmissionEmail` with a full self-contained HTML template copied from `buildFlowStartedEmail`. The shared helpers (`renderEmailShell`, `renderEmailHeader`, `renderEmailFooter`, `SHARED_EMAIL_CSS`) are left untouched — the indoctrination email still uses them.

**Tech Stack:** TypeScript, template literal HTML strings in `src/lib/email.ts`

---

### Task 1: Rewrite `buildSubmissionEmail` as a standalone template

**Files:**
- Modify: `src/lib/email.ts:336-360`

- [ ] **Step 1: Replace the function body**

Open `src/lib/email.ts` and replace the entire `buildSubmissionEmail` function (lines 336–360) with the following:

```typescript
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
  a { color: inherit; text-decoration: none; }
  @media (prefers-color-scheme: dark) {
    body, .wrapper, .main, .email-footer { background-color: #ffffff !important; color: #1a1c1c !important; }
    .portal-header { background: linear-gradient(135deg, #1a0033 0%, #330066 35%, #4D148C 65%, #7c2fc4 100%) !important; }
    .body-text, .closing-body, .sig-name { color: #1a1c1c !important; }
    .sig-title, .footer-legal { color: #4b4452 !important; }
    .closing { border-color: #e2e2e2 !important; }
    .footer-links a { color: #4b4452 !important; }
  }
</style>
</head>
<body style="background-color:#f9f9f9; margin:0; padding:0;">
<div class="wrapper" style="background-color:#ffffff; color:#1a1c1c; max-width:600px; margin:0 auto;">

  <!-- Portal branded header -->
  <div class="portal-header">
    <p class="portal-site"><span style="color:#ffffff; text-decoration:none;">fdxonboard.com</span></p>
    <p class="portal-name"><span style="color:rgba(255,255,255,0.65); text-decoration:none;">Pilot History Portal</span></p>
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

    <p class="body-text">If you need to make any corrections or have questions about your submission, please visit the <a class="link" href="${portal}/help">Help page</a> on fdxonboard.com.</p>

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
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors. If errors appear, fix them before continuing.

- [ ] **Step 3: Send a test email via admin devtools**

Start the dev server (`npm run dev`) and log in as a dev admin. Navigate to the admin devtools email test panel. Send a test `submission` email to your own address. Verify in the received email:

- Gradient purple header with `fdxonboard.com` / `Pilot History Portal`
- Orange accent line below header
- Green checkmark success box with "Update Received" and submitted date
- Body text matches verbatim (thank you paragraph, what happens next bullets, help link)
- Closing divider, then "We appreciate your interest in joining the FedEx family."
- "Best regards," followed by Captain Abegael Autry name/title/email
- Footer: FedEx brand, © 2026 all rights reserved, address, Privacy/Terms/Unsubscribe links
- No dark mode color inversions
- "fdxonboard.com" header text is NOT a hyperlink in iOS Mail
- Dates and phone numbers in the body are NOT auto-linked by iOS Mail

- [ ] **Step 4: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(email): match submission received template to start flow style with iOS compat fixes"
```
