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
  private readonly pendingTwoFa = new Map<string, { userId: number; expiresAt: number }>();
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
      throw new BadRequestException('Format nomor WA tidak valid (8–15 digit).');
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
    const slug = dto.cafeName
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
          wifi_available, has_mushola, has_parking,
          has_active_promotion, bookmarks_count, favorites_count
        ) VALUES (?, ?, ?, ?, ?, ?,
          ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326),
          ?, ?, '$$', TRUE,
          FALSE, FALSE, FALSE,
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
      console.warn('[auth] Failed to create owner cafe on registration:', err.message);
      // Don't fail registration — user can still log in, just without a cafe
    }

    const { passwordHash: _, ...result } = user;
    return { ...result, cafeName: dto.cafeName, cafeAddress: dto.cafeAddress, phone: dto.phone };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFaEnabled && user.phone && user.phoneVerified) {
      const otp = await this.otpClient.requestOtp(this.validatePhone(user.phone));
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
      throw new UnauthorizedException('Sesi verifikasi sudah habis. Silakan login ulang.');
    }

    const result = await this.otpClient.verifyOtp(otpId, code);
    if (!result.verified) {
      if (result.status === 'failed' || result.status === 'expired') {
        this.pendingTwoFa.delete(otpId);
      }
      throw new UnauthorizedException('Kode tidak valid.');
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
    if (!user || !user.phone) throw new NotFoundException('User tidak ditemukan.');
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

  async enrollPhoneVerify(userId: number, otpId: string, code: string, phoneRaw: string) {
    const pending = this.pendingTwoFa.get(otpId);
    if (!pending || pending.userId !== userId) {
      throw new UnauthorizedException('Sesi verifikasi tidak valid.');
    }
    const result = await this.otpClient.verifyOtp(otpId, code);
    if (!result.verified) throw new UnauthorizedException('Kode tidak valid.');
    this.pendingTwoFa.delete(otpId);
    await this.usersService.update(userId, {
      phone: this.validatePhone(phoneRaw),
      phoneVerified: true,
      twoFaEnabled: true,
    });
    return { ok: true };
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
      const otp = await this.otpClient.requestOtp(this.validatePhone(user.phone));
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
      throw new UnauthorizedException('Sesi enrollment habis. Silakan login ulang.');
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
      throw new UnauthorizedException('Sesi enrollment habis. Silakan login ulang.');
    }
    const pending = this.pendingTwoFa.get(otpId);
    if (!pending || pending.userId !== enroll.userId) {
      throw new UnauthorizedException('Sesi verifikasi tidak valid.');
    }
    const result = await this.otpClient.verifyOtp(otpId, code);
    if (!result.verified) {
      if (result.status === 'failed' || result.status === 'expired') {
        this.pendingTwoFa.delete(otpId);
      }
      throw new UnauthorizedException('Kode tidak valid.');
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
