import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService (login + email OTP)', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; findById: jest.Mock; findOrCreateSocial: jest.Mock };
  let otp: { requestOtp: jest.Mock; verifyOtp: jest.Mock };
  let config: { get: jest.Mock };
  let env: Record<string, string | undefined>;
  let user: any;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('secret', 10);
  });

  beforeEach(() => {
    env = {};
    user = {
      id: 7,
      email: 'user@example.com',
      name: 'Dio',
      role: 'user',
      friendCode: 'ABC123',
      avatarUrl: null,
      twoFaEnabled: false,
      phoneVerified: false,
      passwordHash,
    };
    users = {
      findByEmail: jest.fn().mockResolvedValue(user),
      findById: jest.fn().mockResolvedValue(user),
      findOrCreateSocial: jest.fn().mockResolvedValue(user),
    };
    otp = {
      requestOtp: jest.fn().mockResolvedValue({
        otpId: 'otp-1',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      }),
      verifyOtp: jest.fn().mockReturnValue({ verified: true, status: 'verified' }),
    };
    config = { get: jest.fn((k: string) => env[k]) };
    const jwt = { sign: jest.fn(() => 'jwt-token') } as any;
    const cafesRepo = {} as any;

    service = new AuthService(
      users as any,
      jwt,
      config as any,
      cafesRepo,
      otp as any,
    );
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      users.findByEmail.mockResolvedValueOnce(null);
      await expect(
        service.login({ email: 'nope@example.com', password: 'secret' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(otp.requestOtp).not.toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      await expect(
        service.login({ email: user.email, password: 'wrong' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(otp.requestOtp).not.toHaveBeenCalled();
    });

    it('requires an email OTP on valid credentials (default)', async () => {
      const res: any = await service.login({
        email: user.email,
        password: 'secret',
      } as any);
      expect(otp.requestOtp).toHaveBeenCalledWith('user@example.com');
      expect(res).toMatchObject({
        twoFaRequired: true,
        otpId: 'otp-1',
        emailHint: 'us**@example.com', // "user" → 2 shown + 2 masked
      });
      expect(res.accessToken).toBeUndefined();
    });

    it('skips OTP and returns a JWT when LOGIN_OTP_ENABLED=false', async () => {
      env.LOGIN_OTP_ENABLED = 'false';
      const res: any = await service.login({
        email: user.email,
        password: 'secret',
      } as any);
      expect(otp.requestOtp).not.toHaveBeenCalled();
      expect(res.accessToken).toBe('jwt-token');
      expect(res.user.email).toBe('user@example.com');
    });
  });

  describe('verify2fa', () => {
    it('issues a JWT when the OTP is correct', async () => {
      await service.login({ email: user.email, password: 'secret' } as any);
      const res: any = await service.verify2fa('otp-1', '123456');
      expect(otp.verifyOtp).toHaveBeenCalledWith('otp-1', '123456');
      expect(res.accessToken).toBe('jwt-token');
    });

    it('rejects a wrong OTP code', async () => {
      await service.login({ email: user.email, password: 'secret' } as any);
      otp.verifyOtp.mockReturnValueOnce({
        verified: false,
        status: 'pending',
        message: 'Kode salah. Coba lagi.',
      });
      await expect(service.verify2fa('otp-1', '000000')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an unknown / expired verification session', async () => {
      await expect(service.verify2fa('ghost-otp', '123456')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(otp.verifyOtp).not.toHaveBeenCalled();
    });
  });

  describe('resend2fa', () => {
    it('re-issues a fresh OTP for a live session', async () => {
      await service.login({ email: user.email, password: 'secret' } as any);
      otp.requestOtp.mockResolvedValueOnce({
        otpId: 'otp-2',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      });
      const res = await service.resend2fa('otp-1');
      expect(res.otpId).toBe('otp-2');
      // Old session id is rotated out.
      await expect(service.verify2fa('otp-1', '123456')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects resend for an unknown session', async () => {
      await expect(service.resend2fa('ghost')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('socialLogin', () => {
    it('issues a JWT directly without any email OTP', async () => {
      const res: any = await service.socialLogin({
        provider: 'google',
        providerId: 'g-1',
        email: user.email,
        name: 'Dio',
      });
      expect(res.accessToken).toBe('jwt-token');
      expect(otp.requestOtp).not.toHaveBeenCalled();
    });
  });
});
