import { Module } from '@nestjs/common';
import { MeiliModule } from '../meili/meili.module';
import { MeridianClient } from './meridian.client';
import { TokenBudgetService } from './token-budget.service';
import { QueryRewriterService } from './query-rewriter.service';
import { RerankerService } from './reranker.service';
import { SemanticCacheService } from './semantic-cache.service';
import { SemanticSearchService } from './semantic-search.service';

@Module({
  imports: [MeiliModule],
  providers: [
    MeridianClient,
    TokenBudgetService,
    QueryRewriterService,
    RerankerService,
    SemanticCacheService,
    SemanticSearchService,
  ],
  exports: [SemanticSearchService],
})
export class SemanticSearchModule {}
