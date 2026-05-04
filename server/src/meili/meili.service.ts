import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Embedder, Index, Meilisearch } from 'meilisearch';

@Injectable()
export class MeiliService implements OnModuleInit {
  private readonly logger = new Logger(MeiliService.name);
  private client!: Meilisearch;
  private cafesIndex!: Index;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get<string>('MEILI_HOST', 'http://localhost:7700');
    const apiKey = this.config.get<string>('MEILI_MASTER_KEY', '');

    this.client = new Meilisearch({ host, apiKey });

    const indexName = this.config.get<string>('MEILI_CAFES_INDEX', 'cafes');
    await this.ensureIndex(indexName);
  }

  private async ensureIndex(indexName: string): Promise<void> {
    try {
      await this.client.createIndex(indexName, { primaryKey: 'id' });
      this.logger.log(`Created Meilisearch index: ${indexName}`);
    } catch {
      // Index already exists — OK
    }

    this.cafesIndex = this.client.index(indexName);
    await this.applySettings();
    this.logger.log(`Meilisearch index "${indexName}" ready`);
  }

  private async applySettings(): Promise<void> {
    const jinaApiKey = this.config.get<string>('JINA_API_KEY', '');
    const jinaModel = this.config.get<string>('JINA_MODEL', 'jina-embeddings-v3');
    const jinaDimensions = this.config.get<number>('JINA_DIMENSIONS', 1024);

    const embedders: Record<string, Embedder> = {};

    if (jinaApiKey) {
      embedders['jina'] = {
        source: 'rest',
        url: 'https://api.jina.ai/v1/embeddings',
        apiKey: jinaApiKey,
        dimensions: jinaDimensions,
        documentTemplate:
          'Cafe {{doc.name}} di {{doc.city}}. {{doc.description}}. Fasilitas: {{doc.facilities}}. Cocok untuk: {{doc.purposes}}.',
        request: {
          model: jinaModel,
          task: 'retrieval.passage',
          normalized: true,
          embedding_type: 'float',
          input: [{ text: '{{text}}' }],
        },
        response: {
          data: [{ embedding: '{{embedding}}' }],
        },
      };
    }

    await this.cafesIndex.updateSettings({
      searchableAttributes: [
        'name',
        'description',
        'address',
        'city',
        'district',
        'facilities',
        'menuItems',
        'purposes',
      ],
      filterableAttributes: [
        'city',
        'district',
        'priceRange',
        'wifiAvailable',
        'hasMushola',
        'hasParking',
        'hasActivePromotion',
        'activePromotionType',
        'facilities',
        'purposes',
        'isActive',
        '_geo',
      ],
      sortableAttributes: [
        'googleRating',
        'bookmarksCount',
        'favoritesCount',
        'createdAt',
        '_geo',
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
      typoTolerance: { enabled: true },
      stopWords: ['yang', 'di', 'dan', 'untuk', 'dengan', 'ke', 'dari', 'ini', 'itu'],
      ...(jinaApiKey ? { embedders } : {}),
    });
  }

  getIndex(): Index {
    return this.cafesIndex;
  }

  getClient(): Meilisearch {
    return this.client;
  }
}
