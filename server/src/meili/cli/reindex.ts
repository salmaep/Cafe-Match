/**
 * CLI: rebuild the Meilisearch cafes index from MySQL.
 * Usage: npm run meili:reindex
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { MeiliCafesService } from '../meili-cafes.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const meiliCafes = app.get(MeiliCafesService);

  console.log('Starting full reindex of cafes index...');
  const { total } = await meiliCafes.reindexAll();
  console.log(`Reindex complete: ${total} cafes indexed.`);

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Reindex failed:', err);
  process.exit(1);
});
