import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class TokenBudgetService {
  private readonly logger = new Logger(TokenBudgetService.name);
  private readonly dailyLimit: number;
  private readonly maxPerRequest: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    // ConfigService returns string for values from .env — cast explicitly,
    // otherwise `used + maxPerRequest` becomes string concatenation.
    this.dailyLimit = Number(config.get('AI_DAILY_TOKEN_LIMIT', 200000));
    this.maxPerRequest = Number(config.get('AI_MAX_TOKENS_PER_REQUEST', 800));
  }

  async canSpend(): Promise<boolean> {
    const used = await this.getTodayUsage();
    const projected = used + this.maxPerRequest;
    if (projected > this.dailyLimit) {
      this.logger.warn(
        `Token budget exhausted: ${used}/${this.dailyLimit} — falling back to raw Meili`,
      );
      return false;
    }
    return true;
  }

  async record(inputTokens: number, outputTokens: number): Promise<void> {
    const today = this.todayDate();
    try {
      await this.dataSource.query(
        `INSERT INTO ai_token_usage_daily (date, input_tokens, output_tokens, request_count)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           input_tokens = input_tokens + VALUES(input_tokens),
           output_tokens = output_tokens + VALUES(output_tokens),
           request_count = request_count + 1`,
        [today, inputTokens, outputTokens],
      );
      this.logger.debug(
        `Token usage recorded: in=${inputTokens} out=${outputTokens} date=${today}`,
      );
    } catch (err) {
      this.logger.warn(`Failed to record token usage: ${String(err)}`);
    }
  }

  async getTodayUsage(): Promise<number> {
    const today = this.todayDate();
    try {
      const rows = await this.dataSource.query<
        { input_tokens: number; output_tokens: number }[]
      >(
        `SELECT input_tokens, output_tokens FROM ai_token_usage_daily WHERE date = ?`,
        [today],
      );
      if (!rows.length) return 0;
      return Number(rows[0].input_tokens) + Number(rows[0].output_tokens);
    } catch {
      return 0;
    }
  }

  private todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
