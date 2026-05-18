import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
import { Cafe } from '../cafes/entities/cafe.entity';
import { OtpClient } from '../otp/otp.client';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  // In-memory map: otpId -> userId. OTP itself is verified by Engine OTP service;
  // we just bind it to a pending user so we can issue JWT after success.
  private readonly pendingTwoFa = new Map<
    string,
    { userId: number; expiresAt: number }
  >();
  // Pending social-login phone enrollment: enrollmentId -> userId. Used when
  // a Google/FB user has no phone yet — they must enroll a phone + verify OTP
  // before a JWT is issued.
  private readonly pendingSocialEnroll = new Map<
    string,
    { userId: number; expiresAt: number }
  >();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Cafe)
    private readonly cafesRepo: Repository<Cafe>,
    private readonly otpClient: OtpClient,
  ) {}

  private signJwt(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        friendCode: user.friendCode,
        avatarUrl: user.avatarUrl,
        twoFaEnabled: user.twoFaEnabled,
        phoneVerified: user.phoneVerified,
      },
    };
  }

  private validatePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException(
        'Format nomor WA tidak valid (8–15 digit).',
      );
    }
    return digits;
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async registerOwner(dto: RegisterOwnerDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: 'owner',
    });

    // Create the owner's cafe so they see it on first login
    const slug =
      dto.cafeName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .slice(0, 60) +
      '-' +
      Date.now().toString(36);

    // Default coordinates to Bandung city center if not provided
    const defaultLat = -6.9175;
    const defaultLng = 107.6191;

    try {
      await this.cafesRepo.query(
        `INSERT INTO cafes (
          name, slug, address, phone, latitude, longitude, location,
          owner_id, google_maps_url, price_range, is_active,
          has_active_promotion, bookmarks_count, favorites_count
        ) VALUES (?, ?, ?, ?, ?, ?,
          ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326),
          ?, ?, '$$', TRUE,
          FALSE, 0, 0)`,
        [
          dto.cafeName,
          slug,
          dto.cafeAddress,
          dto.phone || null,
          defaultLat,
          defaultLng,
          defaultLng, // POINT wants (lng lat)
          defaultLat,
          user.id,
          `https://maps.google.com/?q=${defaultLat},${defaultLng}`,
        ],
      );
    } catch (err: any) {
      console.warn(
        '[auth] Failed to create owner cafe on registration:',
        err.message,
      );
      // Don't fail registration — user can still log in, just without a cafe
    }

    const { passwordHash: _, ...result } = user;
    return {
      ...result,
      cafeName: dto.cafeName,
      cafeAddress: dto.cafeAddress,
      phone: dto.phone,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFaEnabled && user.phone && user.phoneVerified) {
      const otp = await this.otpClient.requestOtp(
        this.validatePhone(user.phone),
      );
      this.pendingTwoFa.set(otp.otpId, {
        userId: user.id,
        expiresAt: new Date(otp.expiresAt).getTime(),
      });
      return {
        twoFaRequired: true,
        otpId: otp.otpId,
        expiresAt: otp.expiresAt,
        phoneHint: user.phone.slice(0, 4) + '***' + user.phone.slice(-2),
      };
    }

    return this.signJwt(user);
  }

  async verify2fa(otpId: string, code: string) {
    const pending = this.pendingTwoFa.get(otpId);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingTwoFa.delete(otpId);
      // 400 (not 401) so the FE doesn't auto-redirect to /login — user should
      // see the inline message and request a fresh OTP.
      throw new BadRequestException(
        'Sesi verifikasi sudah habis. Silakan minta kode baru.',
      );
    }

    const result = await this.otpClient.verifyOtp(otpId, code);
    if (!result.verified) {
      if (result.status === 'failed' || result.status === 'expired') {
        this.pendingTwoFa.delete(otpId);
      }
      throw new BadRequestException(result.message || 'Kode OTP salah.');
    }

    this.pendingTwoFa.delete(otpId);
    const user = await this.usersService.findById(pending.userId);
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    return this.signJwt(user);
  }

  async resend2fa(otpId: string) {
    const pending = this.pendingTwoFa.get(otpId);
    if (!pending) throw new UnauthorizedException('Sesi tidak ditemukan.');
    const user = await this.usersService.findById(pending.userId);
    if (!user || !user.phone)
      throw new NotFoundException('User tidak ditemukan.');
    const otp = await this.otpClient.requestOtp(this.validatePhone(user.phone));
    this.pendingTwoFa.delete(otpId);
    this.pendingTwoFa.set(otp.otpId, {
      userId: user.id,
      expiresAt: new Date(otp.expiresAt).getTime(),
    });
    return { otpId: otp.otpId, expiresAt: otp.expiresAt };
  }

  // ── Phone enrollment (turn on 2FA) ────────────────────────────────────────
  async enrollPhoneStart(userId: number, phoneRaw: string) {
    const phone = this.validatePhone(phoneRaw);
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    const otp = await this.otpClient.requestOtp(phone);
    this.pendingTwoFa.set(otp.otpId, {
      userId,
      expiresAt: new Date(otp.expiresAt).getTime(),
    });
    return { otpId: otp.otpId, expiresAt: otp.expiresAt };
  }

  async enrollPhoneVerify(
    userId: number,
    otpId: string,
    code: string,
    phoneRaw: string,
  ) {
    const pending = this.pendingTwoFa.get(otpId);
    if (!pending || pending.userId !== userId) {
      throw new BadRequestException('Sesi verifikasi tidak valid.');
    }
    const result = await this.otpClient.verifyOtp(otpId, code);
    if (!result.verified) {
      if (result.status === 'failed' || result.status === 'expired') {
        this.pendingTwoFa.delete(otpId);
      }
      throw new BadRequestException(result.message || 'Kode OTP salah.');
    }
    this.pendingTwoFa.delete(otpId);
    await this.usersService.update(userId, {
      phone: this.validatePhone(phoneRaw),
      phoneVerified: true,
      twoFaEnabled: true,
    });
    return { ok: true };
  }

  // ── Native social-login token verification ─────────────────────────────
  // The mobile app obtains tokens directly from Google/Facebook via
  // expo-auth-session (no server-side OAuth dance), then POSTs them here
  // for verification. Both methods return the same shape socialLogin expects.

  /**
   * Verify a Google ID token (JWT) signed by Google. Accepts any clientId
   * registered for this Google project (web/iOS/Android), so the same code
   * works for Expo Go (web client) and native dev builds (platform clients).
   */
  async verifyGoogleIdToken(idToken: string): Promise<{
    provider: 'google';
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }> {
    if (!idToken) throw new UnauthorizedException('idToken required');

    const audiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID_IOS,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_WEB,
    ].filter(Boolean) as string[];
    if (audiences.length === 0) {
      throw new UnauthorizedException('Server missing GOOGLE_CLIENT_ID');
    }

    const client = new OAuth2Client();
    let payload: any;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google token missing sub/email');
    }
    return {
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture,
    };
  }

  /**
   * Verify a Facebook user-access-token by hitting Graph API. Confirms the
   * token is valid AND issued for THIS app, then fetches basic profile.
   */
  async verifyFacebookAccessToken(accessToken: string): Promise<{
    provider: 'facebook';
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }> {
    if (!accessToken) throw new UnauthorizedException('accessToken required');

    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    if (!appId || !appSecret) {
      throw new UnauthorizedException('Server missing FB_APP_ID/FB_APP_SECRET');
    }

    // 1) debug_token confirms validity + audience
    const debugUrl =
      `https://graph.facebook.com/debug_token` +
      `?input_token=${encodeURIComponent(accessToken)}` +
      `&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`;
    const debugRes = await fetch(debugUrl);
    const debug = await debugRes.json();
    if (!debug?.data?.is_valid || debug.data.app_id !== appId) {
      throw new UnauthorizedException('Invalid Facebook token');
    }

    // 2) Fetch profile
    const meUrl =
      `https://graph.facebook.com/me` +
      `?fields=id,name,email,picture.type(large)` +
      `&access_token=${encodeURIComponent(accessToken)}`;
    const meRes = await fetch(meUrl);
    const me = await meRes.json();
    if (!me?.id)
      throw new UnauthorizedException('Facebook profile fetch failed');

    return {
      provider: 'facebook',
      providerId: me.id,
      email: me.email || `${me.id}@facebook.local`,
      name: me.name || `FB-${me.id}`,
      avatarUrl: me.picture?.data?.url,
    };
  }

  // ── Social login ──────────────────────────────────────────────────────────
  async socialLogin(args: {
    provider: 'google' | 'facebook';
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const user = await this.usersService.findOrCreateSocial(args);

    // User already has a verified phone → send OTP to existing number.
    if (user.phone && user.phoneVerified) {
      const otp = await this.otpClient.requestOtp(
        this.validatePhone(user.phone),
      );
      this.pendingTwoFa.set(otp.otpId, {
        userId: user.id,
        expiresAt: new Date(otp.expiresAt).getTime(),
      });
      return {
        twoFaRequired: true,
        otpId: otp.otpId,
        expiresAt: otp.expiresAt,
        phoneHint: user.phone.slice(0, 4) + '***' + user.phone.slice(-2),
      };
    }

    // No phone yet → require enrollment. Issue a short-lived enrollmentId
    // (15 min) that lets the client call /auth/social/phone/enroll without
    // a JWT.
    const enrollmentId = randomUUID();
    const expiresAt = Date.now() + 15 * 60_000;
    this.pendingSocialEnroll.set(enrollmentId, { userId: user.id, expiresAt });
    return {
      phoneEnrollRequired: true,
      enrollmentId,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async socialEnrollPhone(enrollmentId: string, phoneRaw: string) {
    const pending = this.pendingSocialEnroll.get(enrollmentId);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingSocialEnroll.delete(enrollmentId);
      throw new BadRequestException(
        'Sesi enrollment habis. Silakan login ulang.',
      );
    }
    const phone = this.validatePhone(phoneRaw);
    const otp = await this.otpClient.requestOtp(phone);
    this.pendingTwoFa.set(otp.otpId, {
      userId: pending.userId,
      expiresAt: new Date(otp.expiresAt).getTime(),
    });
    return { otpId: otp.otpId, expiresAt: otp.expiresAt };
  }

  async socialVerifyPhone(
    enrollmentId: string,
    otpId: string,
    code: string,
    phoneRaw: string,
  ) {
    const enroll = this.pendingSocialEnroll.get(enrollmentId);
    if (!enroll || enroll.expiresAt < Date.now()) {
      this.pendingSocialEnroll.delete(enrollmentId);
      throw new BadRequestException(
        'Sesi enrollment habis. Silakan login ulang.',
      );
    }
    const pending = this.pendingTwoFa.get(otpId);
    if (!pending || pending.userId !== enroll.userId) {
      throw new BadRequestException('Sesi verifikasi tidak valid.');
    }
    const result = await this.otpClient.verifyOtp(otpId, code);
    if (!result.verified) {
      if (result.status === 'failed' || result.status === 'expired') {
        this.pendingTwoFa.delete(otpId);
      }
      throw new BadRequestException(result.message || 'Kode OTP salah.');
    }
    this.pendingTwoFa.delete(otpId);
    this.pendingSocialEnroll.delete(enrollmentId);
    await this.usersService.update(enroll.userId, {
      phone: this.validatePhone(phoneRaw),
      phoneVerified: true,
      twoFaEnabled: true,
    });
    const user = await this.usersService.findById(enroll.userId);
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    return this.signJwt(user);
  }
}
