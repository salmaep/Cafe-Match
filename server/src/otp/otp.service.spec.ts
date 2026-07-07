import { BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';

const OTP_ENV: Record<string, string> = {
  OTP_CODE_LENGTH: '6',
  OTP_TTL_SECONDS: '300',
  OTP_RESEND_COOLDOWN_SECONDS: '60',
  OTP_MAX_ATTEMPTS: '3',
};

function flip(code: string): string {
  // Produce a code that differs from `code` in every digit.
  return code
    .split('')
    .map((d) => (d === '0' ? '1' : '0'))
    .join('');
}

describe('OtpService', () => {
  let service: OtpService;
  let sendOtpEmail: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    sendOtpEmail = jest.fn().mockResolvedValue(undefined);
    const config = { get: jest.fn((k: string) => OTP_ENV[k]) } as any;
    const mailer = { sendOtpEmail } as any;
    service = new OtpService(config, mailer);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  /** Request an OTP and return the code captured from the mailer call. */
  async function issue(email = 'user@example.com') {
    const res = await service.requestOtp(email);
    const [, code, ttlMinutes] = sendOtpEmail.mock.calls.at(-1)!;
    return { ...res, code: code as string, ttlMinutes: ttlMinutes as number };
  }

  it('emails a 6-digit code and returns an otpId + ISO expiry', async () => {
    const { otpId, expiresAt, code, ttlMinutes } = await issue();
    expect(otpId).toHaveLength(36); // uuid
    expect(code).toMatch(/^\d{6}$/);
    expect(ttlMinutes).toBe(5);
    expect(new Date(expiresAt).toString()).not.toBe('Invalid Date');
    expect(sendOtpEmail).toHaveBeenCalledWith('user@example.com', code, 5);
  });

  it('verifies the correct code once, then the entry is consumed', async () => {
    const { otpId, code } = await issue();

    const ok = service.verifyOtp(otpId, code);
    expect(ok).toMatchObject({ verified: true, status: 'verified', code: 'OK' });

    const again = service.verifyOtp(otpId, code);
    expect(again).toMatchObject({ verified: false, status: 'expired' });
  });

  it('rejects a wrong code and reports remaining attempts', async () => {
    const { otpId, code } = await issue();
    const res = service.verifyOtp(otpId, flip(code));
    expect(res).toMatchObject({
      verified: false,
      status: 'pending',
      code: 'WRONG_CODE',
      remainingAttempts: 2,
    });
  });

  it('locks the code after too many wrong attempts', async () => {
    const { otpId, code } = await issue();
    const wrong = flip(code);
    service.verifyOtp(otpId, wrong); // attempt 1
    service.verifyOtp(otpId, wrong); // attempt 2
    service.verifyOtp(otpId, wrong); // attempt 3 (== max)
    const locked = service.verifyOtp(otpId, wrong); // attempt 4 > max
    expect(locked).toMatchObject({
      verified: false,
      status: 'failed',
      code: 'ATTEMPTS_EXCEEDED',
    });
    // Even the correct code no longer works after lockout.
    expect(service.verifyOtp(otpId, code).verified).toBe(false);
  });

  it('expires the code after the TTL passes', async () => {
    const { otpId, code } = await issue();
    jest.advanceTimersByTime(301 * 1000);
    const res = service.verifyOtp(otpId, code);
    expect(res).toMatchObject({ verified: false, status: 'expired', code: 'EXPIRED' });
  });

  it('returns EXPIRED for an unknown otpId', () => {
    const res = service.verifyOtp('does-not-exist', '123456');
    expect(res).toMatchObject({ verified: false, status: 'expired', code: 'EXPIRED' });
  });

  it('enforces the resend cooldown per email', async () => {
    await issue('cool@example.com');
    await expect(service.requestOtp('cool@example.com')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows a new code once the cooldown window has passed', async () => {
    await issue('cool@example.com');
    jest.advanceTimersByTime(61 * 1000);
    await expect(service.requestOtp('cool@example.com')).resolves.toHaveProperty(
      'otpId',
    );
  });
});
