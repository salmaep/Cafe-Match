import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Index, Meilisearch } from 'meilisearch';

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
    await this.applySettingsToIndex(this.cafesIndex);
    this.logger.log(`Meilisearch index "${indexName}" ready`);
  }

  async applySettingsToIndex(index: Index): Promise<void> {
    await index.updateSettings({
      searchableAttributes: [
        'name',
        'description',
        'address',
        'city',
        'district',
        'facilities',
        'featureCategories',
        'menuItems',
        'purposes',
      ],
      filterableAttributes: [
        'city',
        'district',
        'priceRange',
        'hasActivePromotion',
        'activePromotionType',
        'facilities',
        'featureCategories',
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
      // Synonym groups for Indonesian + English cafe vocabulary. Meili applies
      // these bidirectionally per group. Keep tight to avoid noisy expansion.
      synonyms: {
        kopi: ['coffee'],
        coffee: ['kopi'],
        cafe: ['kafe', 'café'],
        kafe: ['cafe', 'café'],
        wfh: ['wfc', 'remote', 'kerja'],
        wfc: ['wfh', 'remote'],
        resto: ['restoran', 'restaurant'],
        restoran: ['resto', 'restaurant'],
        restaurant: ['resto', 'restoran'],
        tenang: ['quiet', 'sepi'],
        quiet: ['tenang'],
        murah: ['affordable', 'budget'],
        affordable: ['murah'],
        dekat: ['terdekat', 'nearby'],
        terdekat: ['dekat', 'nearby'],
        nearby: ['terdekat', 'dekat'],
        nyaman: ['cozy', 'comfy'],
        cozy: ['nyaman'],
        outdoor: ['rooftop', 'taman'],
        rooftop: ['outdoor'],
        wifi: ['wi-fi', 'internet'],
        parkir: ['parking'],
        parking: ['parkir'],
        mushola: ['musholla', 'musala'],
      },
      stopWords: [
        'yang',
        'di',
        'dan',
        'untuk',
        'dengan',
        'ke',
        'dari',
        'ini',
        'itu',
      ],
      // Meili defaults to 100 unique values per facet — with ~150 distinct
      // feature names indexed across all cafes, the default silently drops
      // the long tail of the `facilities` facet. Bump to keep counts exact.
      faceting: { maxValuesPerFacet: 1000 },
    });
  }

  getIndex(): Index {
    return this.cafesIndex;
  }

  getClient(): Meilisearch {
    return this.client;
  }
}
