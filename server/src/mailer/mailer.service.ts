import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { otpEmailHtml, otpEmailText } from './templates/otp-email';

/**
 * Thin wrapper around a nodemailer transport configured for Gmail OAuth2.
 * nodemailer refreshes the short-lived access token itself from the refresh
 * token, so we only store the OAuth client + refresh token in env.
 *
 * Required env: GMAIL_OAUTH_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
 * GMAIL_REFRESH_TOKEN. Optional: MAIL_FROM (display name + address).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('GMAIL_OAUTH_USER');
    const clientId = this.config.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = this.config.get<string>('GMAIL_CLIENT_SECRET');
    const refreshToken = this.config.get<string>('GMAIL_REFRESH_TOKEN');
    this.from = this.config.get<string>('MAIL_FROM') || (user ?? 'no-reply');

    if (!user || !clientId || !clientSecret || !refreshToken) {
      this.transporter = null;
      this.logger.warn(
        'Gmail OAuth2 env not fully set (GMAIL_OAUTH_USER/CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN) — email sending is disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user,
        clientId,
        clientSecret,
        refreshToken,
      },
    });
  }

  /** True when the transport is configured and can send. */
  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendMail(opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        'Layanan email belum dikonfigurasi. Coba lagi nanti.',
      );
    }
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      // Log the SMTP outcome (no recipient address) — a `250 ...` response
      // confirms the provider accepted it. If mail still doesn't arrive after
      // an accepted send, it's a delivery/spam issue, not a code issue.
      this.logger.log(
        `Mail accepted: id=${info.messageId} accepted=${
          info.accepted?.length ?? 0
        } rejected=${info.rejected?.length ?? 0} response=${info.response ?? ''}`,
      );
    } catch (err) {
      // Never log the message body/code — only the failure + recipient domain.
      const domain = opts.to.split('@')[1] ?? '?';
      this.logger.error(
        `Failed to send "${opts.subject}" to @${domain}: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
      throw new ServiceUnavailableException(
        'Gagal mengirim email. Coba lagi nanti.',
      );
    }
  }

  /** Send the branded OTP code email. */
  async sendOtpEmail(
    to: string,
    code: string,
    ttlMinutes: number,
  ): Promise<void> {
    await this.sendMail({
      to,
      subject: `Kode verifikasi Geser: ${code}`,
      html: otpEmailHtml({ code, ttlMinutes }),
      text: otpEmailText({ code, ttlMinutes }),
    });
  }
}
