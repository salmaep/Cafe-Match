import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MeiliModule } from '../meili/meili.module';
import { MeridianClient } from './meridian.client';
import { TokenBudgetService } from './token-budget.service';
import { QueryRewriterService } from './query-rewriter.service';
import { RerankerService } from './reranker.service';
import { SemanticCacheService } from './semantic-cache.service';
import { SemanticSearchService } from './semantic-search.service';
import { MeridianKeepaliveService } from './meridian-keepalive.service';

@Module({
  imports: [
    MeiliModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: Number(config.get('SEMANTIC_CACHE_TTL_SECONDS', 3600)) * 1000,
        max: 1000,
      }),
    }),
  ],
  providers: [
    MeridianClient,
    TokenBudgetService,
    QueryRewriterService,
    RerankerService,
    SemanticCacheService,
    SemanticSearchService,
    MeridianKeepaliveService,
  ],
  exports: [SemanticSearchService],
})
export class SemanticSearchModule {}
