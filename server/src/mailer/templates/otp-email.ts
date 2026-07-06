/**
 * Branded "Geser" OTP email. Table-based layout + inline CSS so it renders
 * consistently across email clients (Gmail, Outlook, Apple Mail). Colours are
 * tuned for a light background; the code block is the visual focal point.
 *
 * Brand: wordmark "Ge" + accent "ser" (#D48B3A), cream surface (#FAF9F6).
 */

export interface OtpEmailOptions {
  /** The one-time code, already stringified (e.g. "492013"). */
  code: string;
  /** How long the code is valid, in minutes (shown to the user). */
  ttlMinutes: number;
}

const ACCENT = '#D48B3A';
const INK = '#1C1C1A';
const MUTED = '#8A8880';
const SURFACE = '#FAF9F6';
const BORDER = '#E8E4DD';

/** Plain-text fallback for clients that don't render HTML. */
export function otpEmailText({ code, ttlMinutes }: OtpEmailOptions): string {
  return [
    'Geser — Kode Verifikasi',
    '',
    `Kode verifikasi kamu: ${code}`,
    `Kode ini berlaku selama ${ttlMinutes} menit.`,
    '',
    'Jangan bagikan kode ini ke siapa pun.',
    'Kalau ini bukan kamu, abaikan email ini.',
    '',
    `© ${new Date().getFullYear()} Geser`,
  ].join('\n');
}

/** Full HTML email body. */
export function otpEmailHtml({ code, ttlMinutes }: OtpEmailOptions): string {
  // Space the digits a touch for readability without breaking copy-paste.
  const codeDisplay = code.split('').join(' ');
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>Kode Verifikasi Geser</title>
</head>
<body style="margin:0;padding:0;background:${SURFACE};">
<span style="display:none;font-size:1px;color:${SURFACE};max-height:0;max-width:0;opacity:0;overflow:hidden;">Kode verifikasi Geser kamu: ${code} (berlaku ${ttlMinutes} menit).</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td align="center" style="padding:28px 24px 8px 24px;">
            <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:26px;font-weight:800;letter-spacing:-1px;color:${INK};">Ge<span style="color:${ACCENT};">ser</span></div>
          </td>
        </tr>
        <!-- Title -->
        <tr>
          <td align="center" style="padding:8px 32px 0 32px;">
            <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:${INK};">Kode Verifikasi</div>
            <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:${MUTED};padding-top:8px;">Masukkan kode di bawah ini untuk melanjutkan masuk ke akun Geser kamu.</div>
          </td>
        </tr>
        <!-- Code -->
        <tr>
          <td align="center" style="padding:24px 32px 8px 32px;">
            <div style="font-family:'Courier New',Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:${INK};background:${SURFACE};border:1px solid ${ACCENT};border-radius:12px;padding:18px 12px;">${codeDisplay}</div>
          </td>
        </tr>
        <!-- Expiry -->
        <tr>
          <td align="center" style="padding:4px 32px 0 32px;">
            <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${MUTED};">Kode berlaku <strong style="color:${INK};">${ttlMinutes} menit</strong>.</div>
          </td>
        </tr>
        <!-- Warning -->
        <tr>
          <td style="padding:20px 32px 4px 32px;">
            <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${MUTED};border-top:1px solid ${BORDER};padding-top:16px;">
              Jangan bagikan kode ini ke siapa pun — tim Geser tidak akan pernah memintanya. Kalau ini bukan kamu, cukup abaikan email ini.
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="padding:16px 32px 28px 32px;">
            <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};">© ${new Date().getFullYear()} Geser</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
