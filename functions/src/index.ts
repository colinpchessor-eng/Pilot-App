import * as admin from 'firebase-admin';
import express from 'express';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { Webhook } from 'svix';

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const RESEND_WEBHOOK_SECRET = defineSecret('RESEND_WEBHOOK_SECRET');

/** Local-part + domain for support inbox; compared with `toLowerCase()` against webhook/API `to`. */
const SUPPORT_INBOUND_ADDRESSES = new Set(['support@flyfdx.com']);

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

function targetsSupportInbox(to: unknown): boolean {
  if (!Array.isArray(to)) return false;
  return to.some(
    (addr) => typeof addr === 'string' && SUPPORT_INBOUND_ADDRESSES.has(normalizedRecipient(addr))
  );
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

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

const app = express();
app.disable('x-powered-by');

/** Svix verification requires the raw body; do not use express.json() for this route. */
app.post(
  '/',
  express.raw({ type: '*/*', limit: '512kb' }),
  (req, res) => {
    void (async () => {
      const webhookSecret = RESEND_WEBHOOK_SECRET.value();
      const apiKey = RESEND_API_KEY.value();

      try {
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

        const doc = stripUndefined({
          resendEmailId: full.id ?? emailId,
          from: full.from,
          to: full.to,
          cc: full.cc,
          bcc: full.bcc,
          replyTo: full.reply_to,
          subject: full.subject,
          html: full.html ?? null,
          text: full.text ?? null,
          headers: full.headers,
          attachments: full.attachments,
          messageId: full.message_id,
          rawDownloadUrl: full.raw?.download_url,
          rawExpiresAt: full.raw?.expires_at,
          webhookCreatedAt: typeof evt.created_at === 'string' ? evt.created_at : null,
          webhookMetadataFrom: typeof data.from === 'string' ? data.from : null,
          webhookMetadataSubject: typeof data.subject === 'string' ? data.subject : null,
          resendCreatedAt: full.created_at ?? null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('supportInboundMail').doc(emailId).set(doc, { merge: true });
        res.status(200).json({ ok: true });
      } catch (e) {
        console.error('resendInboundWebhook:', e);
        res.status(500).send('error');
      }
    })();
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
