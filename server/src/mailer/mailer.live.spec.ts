import { MailerService } from './mailer.service';

/**
 * OPT-IN live send test — actually delivers a real OTP email using the Gmail
 * OAuth2 credentials from the environment. Skipped by default (so `npm test`
 * and CI never send mail). To run:
 *
 *   MAIL_LIVE_TEST=1 \
 *   MAIL_LIVE_TO=dios.dev.one@gmail.com \
 *   MAIL_FROM='Geser <dios.dev.one@gmail.com>' \
 *   GMAIL_OAUTH_USER=... GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... \
 *   GMAIL_REFRESH_TOKEN=... \
 *   npx jest mailer.live
 *
 * Credentials come from the environment at run time — never hard-code them here.
 */
const LIVE =
  process.env.MAIL_LIVE_TEST === '1' && !!process.env.GMAIL_REFRESH_TOKEN;

(LIVE ? describe : describe.skip)('MailerService (live send)', () => {
  it('sends a real OTP email to the configured recipient', async () => {
    const config = { get: (k: string) => process.env[k] } as any;
    const mailer = new MailerService(config);
    expect(mailer.isConfigured).toBe(true);

    const to = process.env.MAIL_LIVE_TO || 'dios.dev.one@gmail.com';
    const code = '135790';
    // Resolves on SMTP accept; MailerService logs the messageId + 250 response.
    await expect(mailer.sendOtpEmail(to, code, 5)).resolves.toBeUndefined();
    // eslint-disable-next-line no-console
    console.log(`[live] OTP email dispatched to ${to} (code ${code})`);
  }, 30_000);
});
