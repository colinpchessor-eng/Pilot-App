import { NextResponse } from 'next/server';
import {
  encodeUrlForHtmlAttribute,
  resolveOnboardEmailFooterLogoUrl,
} from '@/lib/email';

/**
 * Dev probe: same Firebase footer asset as production emails (`resolveOnboardEmailFooterLogoUrl`).
 * Open when `next dev` is running: `/api/admin/devtools/email-preview-onboard-logo`
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const footerUrl = resolveOnboardEmailFooterLogoUrl();
  const src = encodeUrlForHtmlAttribute(footerUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Probe — FDX Onboard footer PNG</title>
</head>
<body style="margin:0;background:#f3f3f3;font-family:system-ui,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f3f3f3;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e2e2;">
        <tr>
          <td style="padding:20px 16px;color:#333;font-size:14px;line-height:1.5;">
            <strong>FDX_Onboard_logo_dark_transparent.png</strong> · same &lt;img&gt; sizing as email footers.<br/>
            <span style="color:#666;font-size:12px;">SRC: ${footerUrl}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;padding-top:0;text-align:center;border-top:1px solid #e2e2e2;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 8px;border-collapse:collapse;">
              <tr>
                <td style="padding:0;line-height:0;text-align:center;">
                  <img src="${src}" width="140" alt="FDX Onboard" style="display:block;margin:0 auto;max-width:210px;width:44%;height:auto;border:0;outline:none;text-decoration:none;">
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#4b4452;line-height:1.6;">Uses <code>resolveOnboardEmailFooterLogoUrl()</code> in <code>src/lib/email.ts</code>.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
