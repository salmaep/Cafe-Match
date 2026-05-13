import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MeridianMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MeridianResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Client for Meridian — an Anthropic-compatible proxy.
 * https://github.com/rynfar/meridian
 *
 * Notes:
 * - Endpoint: POST /v1/messages (Anthropic Messages-compatible format)
 * - Auth: `x-api-key` header (or Authorization: Bearer)
 * - `anthropic-version` header is NOT required by Meridian
 * - Meridian uses Claude Code SDK underneath, so first-request cold start
 *   can take 10–30 seconds. Default timeout is 30s.
 */
@Injectable()
export class MeridianClient {
  private readonly logger = new Logger(MeridianClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  // In-memory circuit breaker
  private consecutiveErrors = 0;
  private circuitOpenUntil = 0;
  private readonly CIRCUIT_THRESHOLD = 5;
  private readonly CIRCUIT_OPEN_MS = 30 * 1000;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      config.get<string>('MERIDIAN_BASE_URL', 'http://182.23.12.142:3106') ?? ''
    ).replace(/\/+$/, '');
    this.apiKey = config.get<string>('MERIDIAN_API_KEY', '') ?? '';
    this.model = config.get<string>('AI_MODEL', 'claude-haiku-4-5-20251001');
    this.maxTokens = config.get<number>('AI_MAX_TOKENS_PER_REQUEST', 800);
    // Meridian's Claude Code SDK cold-start can take 10–30s — keep timeout generous.
    this.timeoutMs = config.get<number>('AI_REQUEST_TIMEOUT_MS', 30000);

    if (!this.apiKey) {
      this.logger.warn(
        'MERIDIAN_API_KEY is empty — AI rewriter/reranker will fail and fall back to raw Meili.',
      );
    } else {
      this.logger.log(
        `MeridianClient initialised: url=${this.baseUrl}, model=${this.model}, timeout=${this.timeoutMs}ms`,
      );
    }
  }

  private classifyError(status: number, body: string): string {
    const lower = body.toLowerCase();
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 408) return 'REQUEST_TIMEOUT';
    if (status === 429) return 'RATE_LIMITED';
    if (status === 529 || lower.includes('overloaded')) return 'OVERLOADED';
    if (lower.includes('weekly limit') || lower.includes('quota'))
      return 'QUOTA_EXCEEDED';
    if (status >= 500) return 'SERVER_ERROR';
    return `HTTP_${status}`;
  }

  private classifyNetworkError(err: unknown): string {
    if (err instanceof Error) {
      if (err.name === 'AbortError') return 'TIMEOUT';
      const msg = err.message.toLowerCase();
      if (msg.includes('econnrefused')) return 'CONNECTION_REFUSED';
      if (msg.includes('enotfound') || msg.includes('eai_again'))
        return 'DNS_ERROR';
      if (msg.includes('etimedout')) return 'NETWORK_TIMEOUT';
      if (msg.includes('ehostunreach')) return 'HOST_UNREACHABLE';
      if (msg.includes('fetch failed')) return 'FETCH_FAILED';
    }
    return 'UNKNOWN_NETWORK_ERROR';
  }

  isCircuitOpen(): boolean {
    if (this.circuitOpenUntil === 0) return false;

    const now = Date.now();
    if (now < this.circuitOpenUntil) {
      const remainingMs = this.circuitOpenUntil - now;
      this.logger.debug(
        `Meridian circuit OPEN — reset in ${Math.ceil(remainingMs / 1000)}s`,
      );
      return true;
    }

    this.circuitOpenUntil = 0;
    this.consecutiveErrors = 0;
    this.logger.log('Meridian circuit breaker reset — resuming AI calls');
    return false;
  }

  async chat(
    systemPrompt: string,
    messages: MeridianMessage[],
  ): Promise<MeridianResponse> {
    if (this.isCircuitOpen()) {
      throw new Error('CIRCUIT_OPEN');
    }

    if (!this.apiKey) {
      throw new Error('MERIDIAN_API_KEY_MISSING');
    }

    const url = `${this.baseUrl}/v1/messages`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const reason = this.classifyError(response.status, body);
        this.logger.warn(
          `Meridian HTTP ${response.status} [${reason}] url=${url} body=${body.slice(0, 300)}`,
        );
        this.bumpError();
        throw new Error(`MERIDIAN_${reason}`);
      }

      let data: {
        content?: Array<{ type: string; text: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
        error?: { type?: string; message?: string };
      };
      try {
        data = (await response.json()) as typeof data;
      } catch (err) {
        this.logger.warn(`Meridian returned non-JSON response: ${String(err)}`);
        this.bumpError();
        throw new Error('MERIDIAN_INVALID_JSON');
      }

      if (data.error) {
        this.logger.warn(
          `Meridian returned error body: type=${data.error.type} msg=${data.error.message}`,
        );
        this.bumpError();
        throw new Error(`MERIDIAN_API_ERROR_${data.error.type ?? 'UNKNOWN'}`);
      }

      const text = Array.isArray(data.content)
        ? (data.content.find((c) => c?.type === 'text')?.text ?? '')
        : '';

      if (!text) {
        this.logger.warn(
          `Meridian returned empty content: ${JSON.stringify(data).slice(0, 300)}`,
        );
        this.bumpError();
        throw new Error('MERIDIAN_EMPTY_CONTENT');
      }

      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;
      const elapsedMs = Date.now() - startedAt;

      this.consecutiveErrors = 0;
      this.logger.debug(
        `Meridian OK — in:${inputTokens} out:${outputTokens} ${elapsedMs}ms model:${this.model}`,
      );

      return { content: text, inputTokens, outputTokens };
    } catch (err) {
      // Already-classified errors thrown above already logged & bumped.
      // Only handle raw network/abort errors here.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('MERIDIAN_')) throw err;

      const reason = this.classifyNetworkError(err);
      const elapsedMs = Date.now() - startedAt;

      if (reason === 'TIMEOUT') {
        this.logger.warn(
          `Meridian timeout after ${elapsedMs}ms (limit ${this.timeoutMs}ms) — consider raising AI_REQUEST_TIMEOUT_MS`,
        );
      } else {
        this.logger.warn(`Meridian network error [${reason}]: ${msg}`);
      }
      this.bumpError();
      throw new Error(`MERIDIAN_${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private bumpError(): void {
    this.consecutiveErrors++;
    if (this.consecutiveErrors >= this.CIRCUIT_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + this.CIRCUIT_OPEN_MS;
      this.logger.warn(
        `Meridian circuit breaker OPEN — ${this.consecutiveErrors} consecutive errors, pausing ${this.CIRCUIT_OPEN_MS / 1000}s`,
      );
    } else {
      this.logger.debug(
        `Meridian error count: ${this.consecutiveErrors}/${this.CIRCUIT_THRESHOLD}`,
      );
    }
  }
}
