# Email Template: Table Layout + Inline CSS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite both `buildFlowStartedEmail` and `buildSubmissionEmail` in `src/lib/email.ts` using table-based layout with fully inlined CSS, inline gradient background hacks, blend-mode spans on all white-on-dark text, and updated meta color-scheme tags — achieving maximum Gmail iOS/Android dark mode compatibility.

**Architecture:** Replace the `<div>`-based, class-driven templates with `<table>`/`<tr>`/`<td>` structures. All structural and color styles move to inline `style=""` attributes on their elements. The `<style>` block retains only `@media (prefers-color-scheme: dark)` and `u + .body` blend-mode rules, which cannot be inlined. The orange accent bar (previously a CSS `::after` pseudo-element) becomes its own `<tr>`. The unused `httpsPortal` variable is removed from `buildFlowStartedEmail`.

**Tech Stack:** TypeScript template literals, HTML email, `src/lib/email.ts` only — no other files touched.

---

### Task 1: Rewrite `buildFlowStartedEmail` as table-based inline-CSS template

**Files:**
- Modify: `src/lib/email.ts:165-337`

- [ ] **Step 1: Replace the entire `buildFlowStartedEmail` function**

In `src/lib/email.ts`, replace the full `buildFlowStartedEmail` function (from `export function buildFlowStartedEmail` through its closing `}`) with:

```typescript
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
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<style>
  @media (prefers-color-scheme: dark) {
    .email-body-dark { color: #1a1c1c !important; }
    .email-muted-dark { color: #4b4452 !important; }
    .email-purple-dark { color: #330066 !important; }
    .email-red-dark { color: #ba1a1a !important; }
    .email-darkred-dark { color: #410002 !important; }
  }
  u + .body .gmail-screen { mix-blend-mode: screen; background-color: #000000; display: inline-block; }
  u + .body .gmail-difference { mix-blend-mode: difference; display: inline-block; }
</style>
</head>
<body style="margin:0; padding:0; background-color:transparent; font-family:Arial,sans-serif;">

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
  <tr>
    <td align="center" style="padding:20px 0;">

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff);">

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
          <td style="padding:32px 24px 40px; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff);">

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">Dear \${safeName},</p>

            <p style="font-size:16px; line-height:24px; color:#4b4452; margin:0 0 24px;" class="email-muted-dark">We are reaching out because your name is on our list of candidates who successfully completed the FedEx flight crew interview process. As we plan upcoming staffing needs we'd like to confirm whether you're still interested in pursuing a career with FedEx.</p>

            <!-- Important Dates banner -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:0 0 24px;">
              <tr>
                <td style="background:rgba(186,26,26,0.08); border-left:4px solid #ba1a1a; border-radius:0 8px 8px 0; padding:16px 20px;">
                  <p style="font-size:18px; font-weight:600; color:#ba1a1a; margin:0 0 8px; line-height:28px;" class="email-red-dark">&#128197; Important Dates</p>
                  <p style="font-size:14px; line-height:20px; color:#410002; margin:0;" class="email-darkred-dark">The deadline to update your pilot history is <strong>May 15th 2026 at 2359 Central time.</strong> If you do not complete your pilot history update by the deadline you will be considered no longer interested.</p>
                </td>
              </tr>
            </table>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">If you would like to remain under consideration please complete the pilot history update form on our secure pilot portal at <a href="\${portal}/signup" style="color:#4D148C; font-weight:700;">flyfdx.com</a>.</p>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">Your unique Legacy ID is below. You will need it to register and link your new account to your existing profile.</p>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">Once logged in, your latest flight information will be displayed. Please fill in the gap in flight information from these dates until present.</p>

            <!-- Legacy ID card -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:0 0 16px;">
              <tr>
                <td style="background-color:#f3f3f3; background-image:linear-gradient(#f3f3f3,#f3f3f3); border:1px solid #cdc3d4; border-radius:12px; padding:24px 20px; text-align:center;">
                  <p style="font-size:12px; font-weight:700; color:#4b4452; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px;" class="email-muted-dark">Your Unique Legacy ID</p>
                  <p style="font-size:32px; font-weight:700; color:#330066; letter-spacing:0.2em; padding:8px 0; margin:0;" class="email-purple-dark">\${candidateId}</p>
                </td>
              </tr>
            </table>

            <p style="font-size:20px; font-weight:600; color:#330066; line-height:28px; margin:0 0 16px;" class="email-purple-dark">Next Steps</p>

            <!-- Step 1 -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border:1px solid #cdc3d4; border-radius:8px; margin-bottom:8px;">
              <tr>
                <td style="padding:14px 16px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr>
                      <td valign="top" style="padding-right:14px;">
                        <div style="background-color:#330066; background-image:linear-gradient(#330066,#330066); color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:13px; font-weight:700; text-align:center; line-height:30px; min-width:30px;">1</div>
                      </td>
                      <td valign="top" style="padding-top:5px; font-size:14px; line-height:20px; color:#1a1c1c;" class="email-body-dark">Visit the Pilot History Update Portal at <a href="\${portal}/signup" style="color:#4D148C; font-weight:700; text-decoration:none;">flyfdx.com</a></td>
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
                        <div style="background-color:#330066; background-image:linear-gradient(#330066,#330066); color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:13px; font-weight:700; text-align:center; line-height:30px; min-width:30px;">2</div>
                      </td>
                      <td valign="top" style="padding-top:5px; font-size:14px; line-height:20px; color:#1a1c1c;" class="email-body-dark">Register for an account using <strong>\${candidateEmail}</strong> as your email address</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Step 3 -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border:1px solid #cdc3d4; border-radius:8px; margin-bottom:8px;">
              <tr>
                <td style="padding:14px 16px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr>
                      <td valign="top" style="padding-right:14px;">
                        <div style="background-color:#330066; background-image:linear-gradient(#330066,#330066); color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:13px; font-weight:700; text-align:center; line-height:30px; min-width:30px;">3</div>
                      </td>
                      <td valign="top" style="padding-top:5px; font-size:14px; line-height:20px; color:#1a1c1c;" class="email-body-dark">Enter your Legacy ID when prompted to link your portal account</td>
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
                        <div style="background-color:#330066; background-image:linear-gradient(#330066,#330066); color:#ffffff; width:30px; height:30px; border-radius:50%; font-size:13px; font-weight:700; text-align:center; line-height:30px; min-width:30px;">4</div>
                      </td>
                      <td valign="top" style="padding-top:5px; font-size:14px; line-height:20px; color:#1a1c1c;" class="email-body-dark">Review your legacy data and submit your updated information.</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA button -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:40px 0;">
              <tr>
                <td align="center">
                  <a href="\${portal}/signup" style="display:inline-block; font-size:16px; font-weight:600; line-height:24px; padding:16px 40px; border-radius:12px; text-decoration:none; background-color:#4D148C; background-image:linear-gradient(135deg,#4D148C 0%,#7D22C3 55%,#FF6200 100%);">
                    <span class="gmail-difference"><span class="gmail-screen" style="color:#ffffff !important; -webkit-text-fill-color:#ffffff !important;">Go To FlyFDX.com</span></span>
                  </a>
                </td>
              </tr>
            </table>

            <!-- Closing -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; border-top:1px solid #e2e2e2;">
              <tr>
                <td style="padding-top:24px;">
                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">If you have any questions, please visit our <a href="\${portal}/help" style="color:#330066;">Help page</a>. Thank you for your continued interest in FedEx, and best wishes in your professional journey.</p>
                  <p style="font-size:20px; font-weight:600; color:#1a1c1c; margin:0 0 4px;" class="email-body-dark">Captain Abegael Autry</p>
                  <p style="font-size:14px; color:#4b4452; margin:0 0 4px;" class="email-muted-dark">Senior Manager Fleet Standardization and Pilot Recruitment</p>
                  <a href="mailto:amautry@fedex.com" style="color:#330066; font-weight:700; font-size:14px; text-decoration:none;">amautry@fedex.com</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border-top:1px solid #e2e2e2; padding:32px 24px 48px; text-align:center;">
            <p style="font-size:15px; font-weight:700; color:#1a1c1c; margin:0 0 16px;" class="email-body-dark">FedEx</p>
            <p style="font-size:12px; line-height:1.8; color:#4b4452; margin:0 0 20px;" class="email-muted-dark">
              &copy; 2026 FedEx. All rights reserved.<br>
              This email was sent to <strong>\${candidateEmail}</strong>.<br>
              FedEx &middot; 3131 Democrat Rd &middot; Memphis, TN 38118
            </p>
            <p style="margin:0;">
              <a href="\${portal}/privacy" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Privacy Policy</a>
              <a href="\${portal}/terms" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Terms of Use</a>
              <a href="\${portal}/unsubscribe" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Unsubscribe</a>
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
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors. If TypeScript reports any errors, fix them before continuing. Common issue: if the old `httpsPortal` variable appears elsewhere in the file, remove it here too.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(email): rewrite buildFlowStartedEmail with table layout and inline CSS"
```

---

### Task 2: Rewrite `buildSubmissionEmail` as table-based inline-CSS template

**Files:**
- Modify: `src/lib/email.ts:342-454`

- [ ] **Step 1: Replace the entire `buildSubmissionEmail` function**

In `src/lib/email.ts`, replace the full `buildSubmissionEmail` function (from `export function buildSubmissionEmail` through its closing `}`) with:

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
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<style>
  @media (prefers-color-scheme: dark) {
    .email-body-dark { color: #1a1c1c !important; }
    .email-muted-dark { color: #4b4452 !important; }
    .email-purple-dark { color: #330066 !important; }
  }
  u + .body .gmail-screen { mix-blend-mode: screen; background-color: #000000; display: inline-block; }
  u + .body .gmail-difference { mix-blend-mode: difference; display: inline-block; }
</style>
</head>
<body style="margin:0; padding:0; background-color:transparent; font-family:Arial,sans-serif;">

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
  <tr>
    <td align="center" style="padding:20px 0;">

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; width:100%; border-collapse:collapse; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff);">

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
          <td style="padding:32px 24px 40px; background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff);">

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">Dear \${safeName},</p>

            <!-- Success box -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:#f0fff4; background-image:linear-gradient(#f0fff4,#f0fff4); border:2px solid #008A00; border-radius:8px; margin:0 0 24px;">
              <tr>
                <td style="padding:20px; text-align:center;">
                  <p style="font-size:40px; margin:0;">&#10003;</p>
                  <p style="font-size:18px; font-weight:bold; color:#008A00; margin:8px 0 0;">Update Received</p>
                  <p style="color:#565656; margin:4px 0 0; font-size:14px;">Submitted on \${submittedAt}</p>
                </td>
              </tr>
            </table>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">Thank you for completing your pilot history update. We have successfully received your submission and it is now under review by our recruiting team.</p>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 8px;" class="email-body-dark"><strong>What happens next:</strong></p>
            <ul style="color:#565656; line-height:2; margin:0 0 24px; padding-left:24px; font-size:16px;">
              <li>Our team will review your updated pilot history and flight hours</li>
              <li>We will contact you regarding next steps within 7 business days</li>
            </ul>

            <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">If you need to make any corrections or have questions about your submission, please visit the <a href="\${portal}/help" style="color:#4D148C; text-decoration:underline;">Help page</a> on flyfdx.com.</p>

            <!-- Closing -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; border-top:1px solid #e2e2e2;">
              <tr>
                <td style="padding-top:24px;">
                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 24px;" class="email-body-dark">We appreciate your interest in joining the FedEx family.</p>
                  <p style="font-size:16px; line-height:24px; color:#1a1c1c; margin:0 0 16px;" class="email-body-dark">Best regards,</p>
                  <p style="font-size:20px; font-weight:600; color:#1a1c1c; margin:0 0 4px;" class="email-body-dark">Captain Abegael Autry</p>
                  <p style="font-size:14px; color:#4b4452; margin:0 0 4px;" class="email-muted-dark">Senior Manager Fleet Standardization and Pilot Recruitment</p>
                  <a href="mailto:amautry@fedex.com" style="color:#330066; font-weight:700; font-size:14px; text-decoration:none;">amautry@fedex.com</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#ffffff; background-image:linear-gradient(#ffffff,#ffffff); border-top:1px solid #e2e2e2; padding:32px 24px 48px; text-align:center;">
            <p style="font-size:15px; font-weight:700; color:#1a1c1c; margin:0 0 16px;" class="email-body-dark">FedEx</p>
            <p style="font-size:12px; line-height:1.8; color:#4b4452; margin:0 0 20px;" class="email-muted-dark">
              &copy; 2026 FedEx. All rights reserved.<br>
              This email was sent to <strong>\${candidateEmail}</strong>.<br>
              FedEx &middot; 3131 Democrat Rd &middot; Memphis, TN 38118
            </p>
            <p style="margin:0;">
              <a href="\${portal}/privacy" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Privacy Policy</a>
              <a href="\${portal}/terms" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Terms of Use</a>
              <a href="\${portal}/unsubscribe" style="color:#4b4452; text-decoration:none; font-size:12px; margin:0 8px;">Unsubscribe</a>
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
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(email): rewrite buildSubmissionEmail with table layout and inline CSS"
```
