import { buildFlowStartedEmail } from '@/lib/email';

/**
 * Dev-only preview of the Pilot History invitation email (middleware allows
 * GET only when NODE_ENV !== "production").
 *
 * Open: http://localhost:9002/email-preview-flow-started
 */
export const metadata = {
  title: 'Email preview — Pilot History invitation',
  robots: { index: false, follow: false },
};

export default function EmailPreviewFlowStartedPage() {
  const html = buildFlowStartedEmail('Test Candidate', 'preview@example.com', '12345678');

  return (
    <iframe
      title="Pilot History invitation email"
      srcDoc={html}
      style={{
        width: '100%',
        minHeight: '100vh',
        border: 'none',
        display: 'block',
        backgroundColor: '#0f1117',
      }}
    />
  );
}
