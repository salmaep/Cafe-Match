import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
import { Cafe } from '../cafes/entities/cafe.entity';
import { OtpService } from '../otp/otp.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  // In-memory map: otpId -> userId. The OtpService verifies the code itself;
  // we just bind the otpId to a pending user so we can issue a JWT on success.
  private readonly pendingTwoFa = new Map<
    string,
    { userId: number; expiresAt: number }
  >();

  // Same pattern for password-reset OTPs; kept separate so a stale 2FA otpId
  // can never be replayed to reset a password (or vice versa).
  private readonly pendingPasswordReset = new Map<
    string,
    { userId: number; expiresAt: number }
  >();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(Cafe)
    private readonly cafesRepo: Repository<Cafe>,
    private readonly otpService: OtpService,
  ) {}

  private signJwt(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        friendCode: user.friendCode,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        bio: user.bio,
        phone: user.phone,
        points: user.points,
        twoFaEnabled: user.twoFaEnabled,
        phoneVerified: user.phoneVerified,
      },
    };
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return '***';
    // Mask the local part but keep its length visible so the hint matches the
    // user's real email (e.g. dios.dev.one@gmail.com → di**********@gmail.com).
    if (name.length <= 2) return `${name[0] ?? '*'}*@${domain}`;
    return `${name.slice(0, 2)}${'*'.repeat(name.length - 2)}@${domain}`;
  }

  /** Whether password logins must pass an email OTP. Emergency off-switch. */
  private get loginOtpEnabled(): boolean {
    return this.config.get<string>('LOGIN_OTP_ENABLED') !== 'false';
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

    // Every password login requires an email OTP (unless disabled for ops).
    if (this.loginOtpEnabled) {
      const otp = await this.otpService.requestOtp(user.email);
      this.pendingTwoFa.set(otp.otpId, {
        userId: user.id,
        expiresAt: new Date(otp.expiresAt).getTime(),
      });
      return {
        twoFaRequired: true,
        otpId: otp.otpId,
        expiresAt: otp.expiresAt,
        emailHint: this.maskEmail(user.email),
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

    const result = this.otpService.verifyOtp(otpId, code);
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
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    const otp = await this.otpService.requestOtp(user.email);
    this.pendingTwoFa.delete(otpId);
    this.pendingTwoFa.set(otp.otpId, {
      userId: user.id,
      expiresAt: new Date(otp.expiresAt).getTime(),
    });
    return { otpId: otp.otpId, expiresAt: otp.expiresAt };
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ otpId: string; expiresAt: string; emailHint: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      const dummyExpiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
      return {
        otpId: randomUUID(),
        expiresAt: dummyExpiresAt,
        emailHint: this.maskEmail(email),
      };
    }
    const otp = await this.otpService.requestOtp(user.email);
    this.pendingPasswordReset.set(otp.otpId, {
      userId: user.id,
      expiresAt: new Date(otp.expiresAt).getTime(),
    });
    return {
      otpId: otp.otpId,
      expiresAt: otp.expiresAt,
      emailHint: this.maskEmail(user.email),
    };
  }

  async resetPassword(otpId: string, code: string, newPassword: string) {
    const pending = this.pendingPasswordReset.get(otpId);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingPasswordReset.delete(otpId);
      throw new BadRequestException(
        'Sesi reset password sudah habis. Silakan minta kode baru.',
      );
    }

    const result = this.otpService.verifyOtp(otpId, code);
    if (!result.verified) {
      if (result.status === 'failed' || result.status === 'expired') {
        this.pendingPasswordReset.delete(otpId);
      }
      throw new BadRequestException(result.message || 'Kode OTP salah.');
    }

    this.pendingPasswordReset.delete(otpId);
    await this.usersService.resetPassword(pending.userId, newPassword);
    return { success: true };
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
  // Google/Facebook already verified the user's email, so social logins skip
  // the email OTP and get a JWT straight away.
  async socialLogin(args: {
    provider: 'google' | 'facebook';
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const user = await this.usersService.findOrCreateSocial(args);
    return this.signJwt(user);
  }

  // ── Facebook Data Deletion Callback ───────────────────────────────────────
  // Called by Facebook when a user removes the app via Facebook settings.
  // https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
  async handleFacebookDataDeletion(
    signedRequest: string,
  ): Promise<{ url: string; confirmation_code: string }> {
    const appSecret = this.config.get<string>('FB_APP_SECRET');
    if (!appSecret) {
      throw new UnauthorizedException('Server missing FB_APP_SECRET');
    }

    const parts = signedRequest.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Invalid signed_request format');
    }
    const [encodedSig, payload] = parts;

    // Verify HMAC-SHA256 signature
    const expectedSigBuf = createHmac('sha256', appSecret)
      .update(payload)
      .digest();
    const receivedSigBuf = Buffer.from(encodedSig, 'base64url');
    if (
      receivedSigBuf.length !== expectedSigBuf.length ||
      !timingSafeEqual(receivedSigBuf, expectedSigBuf)
    ) {
      throw new UnauthorizedException('Invalid signed_request signature');
    }

    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { user_id?: string; algorithm?: string };

    const fbUserId = data.user_id;
    const confirmationCode = randomUUID().replace(/-/g, '').slice(0, 16);

    if (fbUserId) {
      const user = await this.usersService.findByProvider('facebook', fbUserId);
      if (user) {
        await this.usersService.createDeletionRequest(
          {
            email: user.email,
            reason: 'Facebook data deletion callback',
            acknowledge: true,
          },
          { ip: null, userAgent: 'Facebook-DataDeletion-Callback' },
        );
      }
    }

    const webUrl =
      this.config.get<string>('PUBLIC_WEB_URL') || 'https://geser.id';
    return {
      url: `${webUrl}/account-deletion?confirmation=${confirmationCode}`,
      confirmation_code: confirmationCode,
    };
  }
}
