# Resend inbound support mail (Firebase Functions)

After Resend **Receiving** and Cloudflare **MX** are configured, wire the webhook to Firebase and secrets.

## 1. Deploy Firestore rules

Ship the `supportInboundMail` rules (admin read only, no client writes):

```bash
firebase deploy --only firestore:rules
```

## 2. Function secrets

From the repo root, set secrets consumed by `resendInboundWebhook` (`functions/src/index.ts`):

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set RESEND_WEBHOOK_SECRET
```

- **RESEND_API_KEY** — same API key used for outbound mail; must be allowed to call the [Receiving API](https://resend.com/docs/api-reference/emails/retrieve-received-email).
- **RESEND_WEBHOOK_SECRET** — signing secret from the Resend webhook detail page (shown when you create the webhook, often `whsec_…`).

## 3. Deploy the function

```bash
firebase deploy --only functions
```

Copy the HTTPS URL for **`resendInboundWebhook`** from the CLI output (region `us-central1`).

## 4. Register the webhook in Resend

1. Resend Dashboard → **Webhooks** → **Add Webhook**.
2. URL = the deployed function URL (POST root `/`).
3. Event = **`email.received`**.
4. Save; confirm `RESEND_WEBHOOK_SECRET` matches the secret shown for that endpoint.

## 5. Verify

1. Send a test email to **support@flyfdx.com** (or the address you route in Resend).
2. In Firebase: **Functions** logs should show a successful run; **Firestore** should contain `supportInboundMail/{email_id}`.
3. In the app: **Admin → Activity → Inbound** should list the message.

## Support address filter

The function only fetches and stores mail whose `to` list includes `support@flyfdx.com` (case-insensitive; supports `Name <support@flyfdx.com>`). To allow more addresses, edit `SUPPORT_INBOUND_ADDRESSES` in [`functions/src/index.ts`](../functions/src/index.ts).
