import { ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailerService } from './mailer.service';

jest.mock('nodemailer');

const FULL_ENV: Record<string, string> = {
  GMAIL_OAUTH_USER: 'sender@gmail.com',
  GMAIL_CLIENT_ID: 'client-id',
  GMAIL_CLIENT_SECRET: 'client-secret',
  GMAIL_REFRESH_TOKEN: 'refresh-token',
  MAIL_FROM: 'Geser <sender@gmail.com>',
};

function makeConfig(env: Record<string, string | undefined>) {
  return { get: jest.fn((key: string) => env[key]) } as any;
}

function makeService(env: Record<string, string | undefined>) {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'ok' });
  (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  const service = new MailerService(makeConfig(env));
  return { service, sendMail };
}

describe('MailerService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('configuration', () => {
    it('is configured and builds a Gmail OAuth2 transport when all creds present', () => {
      const { service } = makeService(FULL_ENV);
      expect(service.isConfigured).toBe(true);
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: 'sender@gmail.com',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
        },
      });
    });

    it('is NOT configured (no transport) when a Gmail cred is missing', () => {
      const { service } = makeService({
        ...FULL_ENV,
        GMAIL_REFRESH_TOKEN: undefined,
      });
      expect(service.isConfigured).toBe(false);
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  describe('sendMail', () => {
    const mail = {
      to: 'user@example.com',
      subject: 'Hi',
      html: '<b>Hi</b>',
      text: 'Hi',
    };

    it('throws ServiceUnavailableException when the mailer is not configured', async () => {
      const { service } = makeService({ ...FULL_ENV, GMAIL_CLIENT_ID: undefined });
      await expect(service.sendMail(mail)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('sends with the configured From header and passes all fields', async () => {
      const { service, sendMail } = makeService(FULL_ENV);
      await service.sendMail(mail);
      expect(sendMail).toHaveBeenCalledWith({
        from: 'Geser <sender@gmail.com>',
        to: 'user@example.com',
        subject: 'Hi',
        text: 'Hi',
        html: '<b>Hi</b>',
      });
    });

    it('falls back to GMAIL_OAUTH_USER as From when MAIL_FROM is unset', async () => {
      const { service, sendMail } = makeService({
        ...FULL_ENV,
        MAIL_FROM: undefined,
      });
      await service.sendMail(mail);
      expect(sendMail.mock.calls[0][0].from).toBe('sender@gmail.com');
    });

    it('wraps transport errors in ServiceUnavailableException (no body leak)', async () => {
      const { service, sendMail } = makeService(FULL_ENV);
      sendMail.mockRejectedValueOnce(new Error('SMTP 535 boom'));
      const err = await service.sendMail(mail).catch((e) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).not.toContain('535'); // raw transport error not leaked
    });
  });

  describe('sendOtpEmail', () => {
    it('builds the branded OTP email (subject + code in body)', async () => {
      const { service, sendMail } = makeService(FULL_ENV);
      await service.sendOtpEmail('user@example.com', '492013', 5);

      const arg = sendMail.mock.calls[0][0];
      expect(arg.to).toBe('user@example.com');
      expect(arg.subject).toBe('Kode verifikasi Geser: 492013');
      expect(arg.text).toContain('492013');
      // The visible code box spaces the digits for readability, so assert
      // whitespace-agnostically that the code is present in the HTML body.
      expect(arg.html.replace(/\s+/g, '')).toContain('492013');
      expect(arg.html).toContain('Ge<span');
    });
  });
});
