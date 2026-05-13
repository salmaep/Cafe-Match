import { Injectable, Logger } from '@nestjs/common';
import { MeridianClient } from './meridian.client';
import { TokenBudgetService } from './token-budget.service';
import { CafeHit } from '../meili/meili-cafes.service';

@Injectable()
export class RerankerService {
  private readonly logger = new Logger(RerankerService.name);

  private static readonly SYSTEM_PROMPT = `You are a cafe search ranker. Given a user query and a list of cafes, rank them by semantic relevance to the query.

Return ONLY a JSON object like: { "rankedIds": [123, 456, 789] }
Include only the top-N most relevant cafe IDs in descending relevance order.
Do not include cafes that are clearly irrelevant.
No markdown, no commentary, no explanation — JSON only.`;

  constructor(
    private readonly meridian: MeridianClient,
    private readonly budget: TokenBudgetService,
  ) {}

  async rerank(query: string, hits: CafeHit[], topN: number): Promise<CafeHit[]> {
    if (hits.length <= 1) return hits;
    if (!(await this.budget.canSpend())) return hits.slice(0, topN);

    const compact = this.buildCompactList(hits);

    try {
      const resp = await this.meridian.chat(RerankerService.SYSTEM_PROMPT, [
        {
          role: 'user',
          content: `User query: "${query}"\n\nCafes:\n${compact}\n\nReturn top ${topN} most relevant cafe IDs as JSON.`,
        },
      ]);

      await this.budget.record(resp.inputTokens, resp.outputTokens);

      const rankedIds = this.parseRankedIds(resp.content);
      if (!rankedIds?.length) {
        this.logger.warn(`Reranker returned no valid IDs for query: "${query}"`);
        return hits.slice(0, topN);
      }

      this.logger.debug(`Reranker ranked ${rankedIds.length} IDs for query: "${query}"`);
      return this.reorderHits(hits, rankedIds, topN);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Reranker skipped → keeping Meili order. Reason: ${reason}`);
      return hits.slice(0, topN);
    }
  }

  private buildCompactList(hits: CafeHit[]): string {
    return hits
      .map((h) => {
        const facilities = Array.isArray(h.facilities)
          ? (h.facilities as string[]).slice(0, 6).join(', ')
          : '';
        const review = h.topReviewText
          ? `"${String(h.topReviewText).slice(0, 100)}" (${h.googleRating ?? '?'}★)`
          : `(${h.googleRating ?? '?'}★)`;
        return `[${h.id}] ${h.name} | ${facilities || 'no facilities'} | ${review}`;
      })
      .join('\n');
  }

  private parseRankedIds(raw: string): number[] | null {
    const cleaned = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
        rankedIds?: unknown[];
      };
      if (!Array.isArray(obj.rankedIds)) return null;
      return obj.rankedIds
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0);
    } catch {
      return null;
    }
  }

  private reorderHits(hits: CafeHit[], rankedIds: number[], topN: number): CafeHit[] {
    const hitMap = new Map(hits.map((h) => [h.id, h]));
    const reranked: CafeHit[] = [];

    for (const id of rankedIds) {
      const hit = hitMap.get(id);
      if (hit) reranked.push(hit);
      if (reranked.length >= topN) break;
    }

    // Append any hits not mentioned by reranker to fill up to topN
    if (reranked.length < topN) {
      const seen = new Set(reranked.map((h) => h.id));
      for (const hit of hits) {
        if (!seen.has(hit.id)) reranked.push(hit);
        if (reranked.length >= topN) break;
      }
    }

    return reranked;
  }
}
