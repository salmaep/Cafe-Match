import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomUUID, createHash, timingSafeEqual } from 'crypto';
import { MailerService } from '../mailer/mailer.service';

export interface OtpRequestResult {
  otpId: string;
  expiresAt: string;
}

export interface OtpVerifyResult {
  verified: boolean;
  status: 'verified' | 'pending' | 'expired' | 'failed';
  code?: 'OK' | 'WRONG_CODE' | 'ATTEMPTS_EXCEEDED' | 'EXPIRED' | string;
  message?: string;
  remainingAttempts?: number;
}

interface OtpEntry {
  codeHash: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return '***';
  if (name.length <= 2) return `${name[0] ?? '*'}*@${domain}`;
  return `${name.slice(0, 2)}${'*'.repeat(name.length - 2)}@${domain}`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Local email OTP service. Generates a numeric code, stores it in-memory
 * (keyed by a random otpId) with a TTL + attempt cap, and delivers it via
 * {@link MailerService}. Replaces the former external WhatsApp "OTP Engine".
 *
 * State is in-memory (like the auth service's pending maps): it is lost on
 * restart and not shared across instances — acceptable for a single-instance
 * deployment. The public shape (`requestOtp`/`verifyOtp`) is unchanged so the
 * auth service barely differs from the WhatsApp version.
 */
@Injectable()
export class OtpService implements OnModuleDestroy {
  private readonly logger = new Logger(OtpService.name);
  private readonly store = new Map<string, OtpEntry>();
  private readonly sweeper: NodeJS.Timeout;

  private readonly codeLength: number;
  private readonly ttlSeconds: number;
  private readonly cooldownSeconds: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
  ) {
    this.codeLength = this.int('OTP_CODE_LENGTH', 6, 4, 8);
    this.ttlSeconds = this.int('OTP_TTL_SECONDS', 300, 60, 3600);
    this.cooldownSeconds = this.int('OTP_RESEND_COOLDOWN_SECONDS', 60, 0, 3600);
    this.maxAttempts = this.int('OTP_MAX_ATTEMPTS', 5, 1, 10);

    // Periodic sweep of expired entries (also swept lazily on access).
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweeper);
  }

  private int(key: string, def: number, min: number, max: number): number {
    const raw = this.config.get<string>(key);
    const n = raw ? parseInt(raw, 10) : NaN;
    if (Number.isNaN(n)) return def;
    return Math.min(Math.max(n, min), max);
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < this.codeLength; i++) code += randomInt(0, 10).toString();
    return code;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(id);
    }
  }

  /**
   * Generate + email a fresh OTP. Enforces a per-email resend cooldown so a
   * caller can't spam a mailbox. Returns the otpId to bind to a pending user.
   */
  async requestOtp(email: string): Promise<OtpRequestResult> {
    this.sweep();

    if (this.cooldownSeconds > 0) {
      const now = Date.now();
      const cutoff = now + (this.ttlSeconds - this.cooldownSeconds) * 1000;
      for (const entry of this.store.values()) {
        // A still-fresh code for this email that was issued within the cooldown
        // window means we should ask the user to wait.
        if (entry.email === email && entry.expiresAt > cutoff) {
          // Actual remaining seconds so the client can show a live countdown.
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil(
              (entry.expiresAt -
                (this.ttlSeconds - this.cooldownSeconds) * 1000 -
                now) /
                1000,
            ),
          );
          throw new BadRequestException({
            message: 'Tunggu sebentar sebelum meminta kode lagi.',
            retryAfterSeconds,
          });
        }
      }
    }

    const otpId = randomUUID();
    const code = this.generateCode();
    const expiresAt = Date.now() + this.ttlSeconds * 1000;
    this.store.set(otpId, {
      codeHash: sha256(code),
      email,
      expiresAt,
      attempts: 0,
    });

    await this.mailer.sendOtpEmail(
      email,
      code,
      Math.round(this.ttlSeconds / 60),
    );
    this.logger.log(`OTP emailed to ${maskEmail(email)} (id ${otpId})`);

    return { otpId, expiresAt: new Date(expiresAt).toISOString() };
  }

  /** Verify a submitted code against the stored one. */
  verifyOtp(otpId: string, code: string): OtpVerifyResult {
    const entry = this.store.get(otpId);
    if (!entry) {
      return {
        verified: false,
        status: 'expired',
        code: 'EXPIRED',
        message: 'Sesi verifikasi tidak ditemukan atau sudah kedaluwarsa.',
      };
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(otpId);
      return {
        verified: false,
        status: 'expired',
        code: 'EXPIRED',
        message: 'Kode sudah kedaluwarsa. Minta kode baru.',
      };
    }

    entry.attempts += 1;
    if (entry.attempts > this.maxAttempts) {
      this.store.delete(otpId);
      return {
        verified: false,
        status: 'failed',
        code: 'ATTEMPTS_EXCEEDED',
        message: 'Terlalu banyak percobaan. Minta kode baru.',
      };
    }

    const submitted = sha256(code);
    const a = Buffer.from(submitted);
    const b = Buffer.from(entry.codeHash);
    const ok = a.length === b.length && timingSafeEqual(a, b);
    if (!ok) {
      const remainingAttempts = this.maxAttempts - entry.attempts;
      return {
        verified: false,
        status: 'pending',
        code: 'WRONG_CODE',
        message: 'Kode salah. Coba lagi.',
        remainingAttempts,
      };
    }

    this.store.delete(otpId);
    return { verified: true, status: 'verified', code: 'OK' };
  }
}
