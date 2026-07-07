import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { AuthService } from './auth.service';
import { OtpService } from '../otp/otp.service';
import { MailerService } from '../mailer/mailer.service';

jest.mock('nodemailer');

/**
 * Integration: the real AuthService + OtpService + MailerService wired
 * together, with only nodemailer's transport mocked. Exercises the whole
 * password-login → email OTP → verify → JWT path end to end.
 */
describe('Login + email OTP (integration)', () => {
  const ENV: Record<string, string> = {
    // Mailer (so MailerService.isConfigured === true)
    GMAIL_OAUTH_USER: 'sender@gmail.com',
    GMAIL_CLIENT_ID: 'cid',
    GMAIL_CLIENT_SECRET: 'csecret',
    GMAIL_REFRESH_TOKEN: 'rtoken',
    MAIL_FROM: 'Geser <sender@gmail.com>',
    // OTP tuning
    OTP_CODE_LENGTH: '6',
    OTP_TTL_SECONDS: '300',
    OTP_RESEND_COOLDOWN_SECONDS: '60',
    OTP_MAX_ATTEMPTS: '3',
    // LOGIN_OTP_ENABLED unset → OTP required by default
  };

  let auth: AuthService;
  let otpService: OtpService;
  let sendMail: jest.Mock;
  let user: any;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('secret', 10);
  });

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({ messageId: 'ok' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const config = { get: jest.fn((k: string) => ENV[k]) } as any;
    user = {
      id: 42,
      email: 'dio@example.com',
      name: 'Dio',
      role: 'user',
      friendCode: 'XYZ',
      avatarUrl: null,
      twoFaEnabled: false,
      phoneVerified: false,
      passwordHash,
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(user),
      findById: jest.fn().mockResolvedValue(user),
    } as any;
    const jwt = { sign: jest.fn(() => 'jwt-token') } as any;

    const mailer = new MailerService(config);
    otpService = new OtpService(config, mailer);
    auth = new AuthService(users, jwt, config, {} as any, otpService);
  });

  afterEach(() => {
    otpService.onModuleDestroy();
  });

  it('logs in with password, emails a code, and verifies it for a JWT', async () => {
    // 1) Password login → OTP challenge, and an email actually goes out.
    const challenge: any = await auth.login({
      email: 'dio@example.com',
      password: 'secret',
    } as any);
    expect(challenge.twoFaRequired).toBe(true);
    expect(challenge.otpId).toHaveLength(36);
    expect(challenge.emailHint).toBe('di***@example.com');

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('dio@example.com');
    expect(mail.from).toBe('Geser <sender@gmail.com>');

    // 2) Pull the real code out of the sent email subject.
    const code = mail.subject.match(/(\d{6})/)![1];
    expect(mail.text).toContain(code);

    // 3) A wrong code is rejected...
    await expect(
      auth.verify2fa(challenge.otpId, code === '000000' ? '111111' : '000000'),
    ).rejects.toBeInstanceOf(BadRequestException);

    // 4) ...the real code completes the login.
    const session: any = await auth.verify2fa(challenge.otpId, code);
    expect(session.accessToken).toBe('jwt-token');
    expect(session.user.email).toBe('dio@example.com');
  });

  it('does not send an email when credentials are invalid', async () => {
    await expect(
      auth.login({ email: 'dio@example.com', password: 'WRONG' } as any),
    ).rejects.toThrow();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
