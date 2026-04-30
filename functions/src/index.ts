import * as admin from 'firebase-admin';
import express from 'express';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { Webhook } from 'svix';

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const RESEND_WEBHOOK_SECRET = defineSecret('RESEND_WEBHOOK_SECRET');

/** Local-part + domain for support inbox; compared with `toLowerCase()` against webhook/API `to`. */
const SUPPORT_INBOUND_ADDRESSES = new Set(['support@fdxonboard.com']);

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function headerString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function isEmailReceivedPayload(v: Record<string, unknown>): v is {
  type: string;
  created_at?: string;
  data: Record<string, unknown>;
} {
  return typeof v.type === 'string' && v.data != null && typeof v.data === 'object' && !Array.isArray(v.data);
}

function normalizedRecipient(addr: string): string {
  const t = addr.trim();
  const angle = t.match(/<([^>]+)>/);
  return (angle ? angle[1] : t).trim().toLowerCase();
}

/** Webhook `data.to` is usually string[]; normalize if Resend ever sends a single string. */
function coerceToRecipients(to: unknown): string[] {
  if (to == null) return [];
  if (Array.isArray(to)) {
    return to.filter((x): x is string => typeof x === 'string');
  }
  if (typeof to === 'string' && to.trim() !== '') {
    return [to];
  }
  return [];
}

function targetsSupportInbox(to: unknown): boolean {
  const recipients = coerceToRecipients(to);
  return recipients.some((addr) => SUPPORT_INBOUND_ADDRESSES.has(normalizedRecipient(addr)));
}

type ResendReceivingEmail = {
  object?: string;
  id?: string;
  to?: string[];
  from?: string;
  created_at?: string;
  subject?: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string>;
  bcc?: string[];
  cc?: string[];
  reply_to?: string[];
  message_id?: string;
  raw?: { download_url?: string; expires_at?: string };
  attachments?: Array<{
    id?: string;
    filename?: string;
    content_type?: string;
    content_disposition?: string | null;
    content_id?: string | null;
  }>;
};

async function fetchReceivedEmail(apiKey: string, emailId: string): Promise<ResendReceivingEmail> {
  const url = `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Resend receiving API ${res.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as ResendReceivingEmail;
}

/** Firestore rejects `undefined` anywhere in the document; keep under ~1MiB. */
const MAX_STORED_BODY_CHARS = 750_000;

function truncateBody(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n[truncated ${s.length - max} chars]`;
}

function cleanHeaders(input: Record<string, string> | undefined): Record<string, string> | null {
  if (input == null || typeof input !== 'object') return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function cleanAttachments(
  list: ResendReceivingEmail['attachments'] | undefined
): Array<Record<string, string | null>> | null {
  if (list == null || list.length === 0) return null;
  return list.map((a) => ({
    id: a.id ?? null,
    filename: a.filename ?? null,
    content_type: a.content_type ?? null,
    content_disposition: a.content_disposition ?? null,
    content_id: a.content_id ?? null,
  }));
}

function buildInboundFirestoreDoc(
  full: ResendReceivingEmail,
  emailId: string,
  evt: Record<string, unknown>,
  data: Record<string, unknown>
): Record<string, unknown> {
  const html =
    full.html != null && typeof full.html === 'string'
      ? truncateBody(full.html, MAX_STORED_BODY_CHARS)
      : null;
  const text =
    full.text != null && typeof full.text === 'string'
      ? truncateBody(full.text, MAX_STORED_BODY_CHARS)
      : null;

  return {
    resendEmailId: full.id ?? emailId,
    from: full.from ?? null,
    to: full.to ?? null,
    cc: full.cc ?? null,
    bcc: full.bcc ?? null,
    replyTo: full.reply_to ?? null,
    subject: full.subject ?? null,
    html,
    text,
    headers: cleanHeaders(full.headers),
    attachments: cleanAttachments(full.attachments),
    messageId: full.message_id ?? null,
    rawDownloadUrl: full.raw?.download_url ?? null,
    rawExpiresAt: full.raw?.expires_at ?? null,
    webhookCreatedAt: typeof evt.created_at === 'string' ? evt.created_at : null,
    webhookMetadataFrom: typeof data.from === 'string' ? data.from : null,
    webhookMetadataSubject: typeof data.subject === 'string' ? data.subject : null,
    resendCreatedAt: full.created_at ?? null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

const app = express();
app.disable('x-powered-by');

/** Svix verification requires the raw body; do not use express.json() for this route. */
app.post(
  '/',
  express.raw({ type: '*/*', limit: '512kb' }),
  (req, res) => {
    void (async () => {
      try {
        const webhookSecret = RESEND_WEBHOOK_SECRET.value();
        const apiKey = RESEND_API_KEY.value();

        const svixId = headerString(req.headers['svix-id']);
        const svixTimestamp = headerString(req.headers['svix-timestamp']);
        const svixSignature = headerString(req.headers['svix-signature']);
        if (!svixId || !svixTimestamp || !svixSignature) {
          res.status(400).send('Missing Svix headers');
          return;
        }

        const buf = req.body;
        const rawBody = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf ?? '');
        const wh = new Webhook(webhookSecret);
        let evt: Record<string, unknown>;
        try {
          evt = wh.verify(rawBody, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
          }) as Record<string, unknown>;
        } catch {
          res.status(400).send('invalid webhook');
          return;
        }

        if (!isEmailReceivedPayload(evt)) {
          res.status(200).send('ignored');
          return;
        }

        if (evt.type !== 'email.received') {
          res.status(200).send('ok');
          return;
        }

        const data = evt.data;
        const emailId = typeof data.email_id === 'string' ? data.email_id : null;
        if (!emailId) {
          console.warn('resendInboundWebhook: missing email_id');
          res.status(200).send('ok');
          return;
        }

        if (!targetsSupportInbox(data.to)) {
          console.warn('resendInboundWebhook: skipped — no support inbox in data.to', {
            emailId,
            to: data.to,
            normalized: coerceToRecipients(data.to).map(normalizedRecipient),
            wantOneOf: [...SUPPORT_INBOUND_ADDRESSES],
          });
          res.status(200).send('ok');
          return;
        }

        let full: ResendReceivingEmail;
        try {
          full = await fetchReceivedEmail(apiKey, emailId);
        } catch (e) {
          console.error('resendInboundWebhook: fetch received email failed', e);
          res.status(500).send('resend fetch failed');
          return;
        }

        const doc = buildInboundFirestoreDoc(full, emailId, evt, data);

        await db.collection('supportInboundMail').doc(emailId).set(doc, { merge: true });
        console.info('resendInboundWebhook: stored supportInboundMail', emailId);
        res.status(200).json({ ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('resendInboundWebhook:', msg, e instanceof Error ? e.stack : e);
        if (!res.headersSent) {
          res.status(500).send('error');
        }
      }
    })().catch((e) => {
      console.error('resendInboundWebhook: unhandled rejection', e);
    });
  }
);

app.use((req, res) => {
  if (req.method === 'POST') {
    res.status(404).send('not found');
    return;
  }
  res.setHeader('Allow', 'POST');
  res.status(405).send('Method Not Allowed');
});

export const resendInboundWebhook = onRequest(
  {
    region: 'us-central1',
    secrets: [RESEND_API_KEY, RESEND_WEBHOOK_SECRET],
    invoker: 'public',
    cors: false,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  app
);
