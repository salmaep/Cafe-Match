import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeridianClient } from './meridian.client';
import { TokenBudgetService } from './token-budget.service';

@Injectable()
export class MeridianKeepaliveService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(MeridianKeepaliveService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly enabled: boolean;

  constructor(
    private readonly meridian: MeridianClient,
    private readonly budget: TokenBudgetService,
    private readonly config: ConfigService,
  ) {
    this.intervalMs = Number(
      this.config.get('AI_KEEPALIVE_INTERVAL_MS', 4 * 60 * 1000),
    );
    this.enabled =
      String(this.config.get('AI_KEEPALIVE_ENABLED', 'true')) !== 'false';
  }

  async onApplicationBootstrap() {
    if (!this.enabled) {
      this.logger.log('Meridian keep-alive disabled via AI_KEEPALIVE_ENABLED');
      return;
    }
    // Fire-and-forget — never block boot on a 20-30s cold start
    void this.ping('boot');
    this.timer = setInterval(
      () => void this.ping('interval'),
      this.intervalMs,
    );
    this.logger.log(
      `Meridian keep-alive active (every ${this.intervalMs / 1000}s)`,
    );
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async ping(reason: 'boot' | 'interval'): Promise<void> {
    if (!(await this.budget.canSpend())) return;
    if (this.meridian.isCircuitOpen()) return;
    try {
      const t0 = Date.now();
      const resp = await this.meridian.chat(
        'Reply with the single character: ok',
        [{ role: 'user', content: 'ping' }],
      );
      await this.budget.record(resp.inputTokens, resp.outputTokens);
      this.logger.debug(
        `keepalive[${reason}] OK in ${Date.now() - t0}ms (in:${resp.inputTokens} out:${resp.outputTokens})`,
      );
    } catch (err) {
      this.logger.debug(`keepalive[${reason}] skipped: ${String(err)}`);
    }
  }
}
