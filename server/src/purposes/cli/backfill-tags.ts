/**
 * CLI: backfill cafe_purpose_tags from facility-based scoring rules.
 *
 * Run after adding new purposes (or after a bulk facility import) so cafes
 * get tagged for the new purposes and become discoverable via search.
 *
 * Usage:
 *   npm run purposes:backfill
 *
 * Then reindex Meili so the new tags become searchable:
 *   npm run meili:reindex
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PurposesService } from '../purposes.service';
import { MeiliCafesService } from '../../meili/meili-cafes.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const purposes = app.get(PurposesService);

  console.log('Backfilling cafe_purpose_tags from facility rules...');
  const { cafesProcessed, tagsWritten } = await purposes.backfillPurposeTags();
  console.log(
    `Done — ${cafesProcessed} cafes processed, ${tagsWritten} (cafe, purpose) tags upserted.`,
  );

  // Auto-reindex so the new tags are immediately searchable.
  if (process.argv.includes('--reindex')) {
    console.log('\nTriggering Meili reindex...');
    const meiliCafes = app.get(MeiliCafesService);
    const { total } = await meiliCafes.reindexAll();
    console.log(`Reindex complete — ${total} cafes indexed.`);
  } else {
    console.log('\nRun `npm run meili:reindex` to make new tags searchable.');
  }

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
