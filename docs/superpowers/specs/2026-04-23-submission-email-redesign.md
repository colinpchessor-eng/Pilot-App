# Submission Received Email Redesign

**Date:** 2026-04-23  
**Status:** Approved  
**Scope:** `src/lib/email.ts` — `buildSubmissionEmail` only

---

## Goal

Rewrite `buildSubmissionEmail` to match the visual format and style of `buildFlowStartedEmail` (the "start flow" email), while keeping all body text identical and updating the signature to Captain Autry with the all-rights-reserved footer.

---

## Approach

Option A: Rewrite `buildSubmissionEmail` as a self-contained standalone HTML template, mirroring the start flow's pattern. The shared helpers (`renderEmailShell`, `renderEmailHeader`, `renderEmailFooter`, `SHARED_EMAIL_CSS`) are left untouched — they continue to serve the indoctrination email.

---

## Template Structure

### Header
Gradient purple `portal-header` block, identical to the start flow:
- `fdxonboard.com` (large white bold)
- `Pilot History Portal` (small muted caps)
- Orange accent line (`::after` pseudo-element)

### Body (text unchanged)
1. "Dear [candidateName],"
2. Green success box — checkmark ✓, "Update Received", "Submitted on [submittedAt]"
3. "Thank you for completing your pilot history update. We have successfully received your submission and it is now under review by our recruiting team."
4. "**What happens next:**"
   - "Our team will review your updated pilot history and flight hours"
   - "We will contact you regarding next steps within 7 business days"
5. "If you need to make any corrections or have questions about your submission, please visit the [Help page](${portal}/help) on fdxonboard.com."
6. "We appreciate your interest in joining the FedEx family."

### Closing / Signature
Matches start flow `.closing` block style (border-top divider, then):

```
Best regards,

Captain Abegael Autry
Senior Manager Fleet Standardization and Pilot Recruitment
amautry@fedex.com
```

### Footer
Matches start flow `.email-footer` block exactly:
- **FedEx** bold brand line
- © 2026 FedEx. All rights reserved.
- "This email was sent to [candidateEmail]."
- FedEx · 3131 Democrat Rd · Memphis, TN 38118
- Privacy Policy / Terms of Use / Unsubscribe links

---

## CSS

Full start flow CSS copied into the template's `<style>` block, including:
- `.portal-header`, `.portal-site`, `.portal-name`
- `.main`, `.body-text`, `.muted-text`
- `.closing`, `.sig-name`, `.sig-title`, `.sig-email`
- `.email-footer`, `.footer-brand`, `.footer-legal`, `.footer-links`
- Dark mode `@media (prefers-color-scheme: dark)` overrides (force light mode)

Additional class carried over from old shared CSS:
- `.success-box` — `background: #f0fff4; border: 2px solid #008A00` — used by the green checkmark box in the body

---

## What Does NOT Change

- All body text (word for word)
- `buildFlowStartedEmail` — untouched
- `buildIndoctrinationEmail` — untouched
- `renderEmailShell`, `renderEmailHeader`, `renderEmailFooter`, `SHARED_EMAIL_CSS` — untouched
- Function signature: `buildSubmissionEmail(candidateName, candidateEmail, submittedAt)` — unchanged

---

## Out of Scope

- No changes to indoctrination email style
- No refactoring of shared helpers
- No new shared template function
