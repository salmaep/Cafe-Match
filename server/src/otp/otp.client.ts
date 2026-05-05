import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OtpRequestResult {
  otpId: string;
  expiresAt: string;
}

export interface OtpVerifyResult {
  verified: boolean;
  status: 'verified' | 'pending' | 'expired' | 'failed';
}

export interface OtpStatusResult {
  status: string;
  attempts: number;
  expiresAt: string;
  verifiedAt: string | null;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}

@Injectable()
export class OtpClient {
  private readonly logger = new Logger(OtpClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('OTP_ENGINE_URL') || '';
    this.apiKey = config.get<string>('OTP_ENGINE_API_KEY') || '';
    if (!this.baseUrl || !this.apiKey) {
      this.logger.warn(
        'OTP_ENGINE_URL or OTP_ENGINE_API_KEY not set — OTP requests will fail.',
      );
    }
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  private mapError(status: number, fallback: string): never {
    if (status === 400) {
      throw new BadRequestException(
        'Tunggu sebentar sebelum meminta kode lagi (60 detik).',
      );
    }
    if (status === 429) {
      throw new HttpException(
        'Terlalu banyak permintaan. Coba lagi setelah 1 jam.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (status === 503) {
      throw new ServiceUnavailableException(
        'Layanan WhatsApp sedang tidak tersedia. Coba lagi nanti.',
      );
    }
    throw new InternalServerErrorException(fallback);
  }

  async requestOtp(phone: string): Promise<OtpRequestResult> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ServiceUnavailableException('OTP service not configured.');
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/request`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ phone }),
      });
    } catch (err) {
      this.logger.error(
        `OTP request failed for ${maskPhone(phone)}: network error`,
      );
      throw new ServiceUnavailableException('Tidak dapat menghubungi layanan OTP.');
    }

    if (!res.ok) {
      this.logger.warn(
        `OTP request rejected (${res.status}) for ${maskPhone(phone)}`,
      );
      this.mapError(res.status, 'Gagal mengirim kode OTP.');
    }

    const data = (await res.json()) as { otp_id: string; expires_at: string };
    this.logger.log(`OTP issued for ${maskPhone(phone)} (id ${data.otp_id})`);
    return { otpId: data.otp_id, expiresAt: data.expires_at };
  }

  async verifyOtp(otpId: string, code: string): Promise<OtpVerifyResult> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ServiceUnavailableException('OTP service not configured.');
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ otp_id: otpId, code }),
      });
    } catch (err) {
      this.logger.error(`OTP verify failed (id ${otpId}): network error`);
      throw new ServiceUnavailableException('Tidak dapat menghubungi layanan OTP.');
    }

    if (!res.ok) {
      this.logger.warn(`OTP verify rejected (${res.status}) for id ${otpId}`);
      this.mapError(res.status, 'Gagal memverifikasi kode.');
    }

    return (await res.json()) as OtpVerifyResult;
  }

  async getStatus(otpId: string): Promise<OtpStatusResult> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ServiceUnavailableException('OTP service not configured.');
    }
    const res = await fetch(`${this.baseUrl}/status/${otpId}`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) {
      this.mapError(res.status, 'Gagal mendapatkan status OTP.');
    }
    const data = (await res.json()) as {
      status: string;
      attempts: number;
      expires_at: string;
      verified_at: string | null;
    };
    return {
      status: data.status,
      attempts: data.attempts,
      expiresAt: data.expires_at,
      verifiedAt: data.verified_at,
    };
  }
}

